const express = require("express");
const axios = require("axios");
const Redis = require("ioredis");
const Resume = require("../models/Resume");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
const redis = new Redis(process.env.UPSTASH_REDIS_URL);

const Groq = require("groq-sdk");
// Initialize Groq lazily when the /optimize endpoint is called
let groq = null;
const GROQ_MODEL = process.env.GROQ_MODEL || "openai/gpt-oss-120b";

async function extractPdfText(buffer) {
  if (typeof pdfParse === "function") {
    const data = await pdfParse(buffer);
    return data.text;
  }

  if (pdfParse && typeof pdfParse.PDFParse === "function") {
    const parser = new pdfParse.PDFParse({ data: buffer });
    const data = await parser.getText();
    return data.text;
  }

  throw new Error("Unsupported pdf-parse export");
}

// 1. DASHBOARD ROUTE
router.get("/", async (req, res) => {
  try {
    const resumes = await Resume.find().sort({ createdAt: -1 });
    res.status(200).json(resumes);
  } catch (error) {
    console.error("Resume list error:", error);
    res.status(500).json({ message: "Server Error" });
  }
});

// 2. SINGLE RESUME ROUTE
router.get("/:id", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });
    res.status(200).json(resume);
  } catch (error) {
    res.status(500).json({ message: "Server Error" });
  }
});

// 3. UNIFIED UPLOAD ROUTE (Handles both JSON and PDF)
router.post("/", upload.single("file"), async (req, res) => {
  try {
    const { title } = req.body;
    const file = req.file;

    if (!title || !file)
      return res.status(400).json({ message: "Missing title or file" });

    let parsedText = "";
    let linkedinData = null;

    // Check file type and process accordingly
    if (file.mimetype === "application/pdf") {
      parsedText = await extractPdfText(file.buffer);
    } else if (file.mimetype === "application/json") {
      const jsonString = file.buffer.toString("utf8");
      linkedinData = JSON.parse(jsonString);
    } else {
      return res.status(400).json({
        message: "Unsupported file type. Please upload a PDF or JSON file.",
      });
    }

    const newResume = new Resume({ title, linkedinData, parsedText });
    const savedResume = await newResume.save();

    res.status(201).json({ message: "Success", data: savedResume });
  } catch (error) {
    console.error("Upload Error:", error);
    res.status(500).json({ message: "Server Error processing upload" });
  }
});

// 4. AI MATCH ROUTE
router.post("/:id/match", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const { jobDescription } = req.body;
    if (!jobDescription) return res.status(400).json({ message: "Missing JD" });

    const hashStr = resume._id.toString() + jobDescription;
    const cacheKey = `match-v2:${Buffer.from(hashStr).toString("base64")}`;

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log("Upstash Cache Hit: Bypassing AI Engine");
      return res.status(200).json(JSON.parse(cachedData));
    }

    let resumeText = "";

    // DYNAMIC TEXT EXTRACTION: Check if PDF or JSON
    if (resume.parsedText && resume.parsedText.trim() !== "") {
      resumeText = resume.parsedText.trim();
      if (resumeText.length > 5000) {
        resumeText = resumeText.slice(0, 5000) + "\n...";
      }
    } else {
      // Fallback to JSON logic
      const profile = resume.linkedinData || {};
      const skillsArray = profile.skills
        ? profile.skills
            .map((s) => (typeof s === "string" ? s : s.name))
            .filter(Boolean)
        : [];
      const expArray = profile.experience
        ? profile.experience
            .map((e) => `${e.title} at ${e.companyName}`)
            .filter(Boolean)
        : [];
      resumeText = `Skills: ${skillsArray.join(", ")}. Experience: ${expArray.join("; ")}`;
    }

    console.log("Cache Miss: Calling Python Semantic Engine...");

    let aiResponse;
    try {
      aiResponse = await axios.post(
        `${process.env.AI_ENGINE_URL}/api/ai/analyze`,
        {
          resume_text: resumeText,
          job_description: jobDescription,
        },
        { timeout: 600000 },
      );
    } catch (error) {
      console.error("AI analysis request failed:", error.message);
      const statusCode =
        error.code === "ECONNABORTED" || error.code === "ETIMEDOUT" ? 504 : 502;
      return res.status(statusCode).json({
        message:
          statusCode === 504
            ? "AI analysis timed out. Please try again."
            : "AI analysis service failed. Check the AI Engine logs.",
      });
    }

    let rawScore = aiResponse.data.semantic_score;

    if (!Number.isFinite(rawScore) || rawScore < 0 || rawScore > 100) {
      console.error("AI Engine returned an invalid semantic score.");
      return res.status(502).json({
        message: "AI analysis service returned an invalid score.",
      });
    }

    if (rawScore <= 1) rawScore = rawScore * 100;

    let boostedScore = Math.min(99, Math.round(rawScore * 1.75));

    if (
      !aiResponse.data.ai_insights ||
      typeof aiResponse.data.ai_insights !== "object" ||
      Array.isArray(aiResponse.data.ai_insights)
    ) {
      console.error("AI Engine returned invalid analysis insights.");
      return res.status(502).json({
        message: "AI analysis service returned an invalid response.",
      });
    }

    const finalPayload = {
      matchScore: aiResponse.data.semantic_score,
      atsScore: boostedScore,
      matchingSkills: [],
      aiFeedback: aiResponse.data.ai_insights,
    };

    // Persist the boosted ATS score so the dashboard reflects the latest result
    resume.atsScore = boostedScore;
    await resume.save();

    // Save to Cloud Redis (Expires in 24 Hours to save space)
    await redis.set(cacheKey, JSON.stringify(finalPayload), "EX", 86400);

    res.status(200).json(finalPayload);
  } catch (error) {
    console.error("Match Error:", error.message);
    res.status(500).json({ message: "Server Error during matching" });
  }
});

// 5. AI OPTIMIZATION ROUTE (Powered by Groq)
router.post("/:id/optimize", async (req, res) => {
  try {
    const resume = await Resume.findById(req.params.id);
    if (!resume) return res.status(404).json({ message: "Resume not found" });

    const { jobDescription } = req.body;

    // Extract text depending on whether it was a PDF or JSON
    let resumeText = "";
    if (resume.parsedText && resume.parsedText.trim() !== "") {
      resumeText = resume.parsedText;
    } else {
      const profile = resume.linkedinData || {};
      const skillsArray = profile.skills
        ? profile.skills
            .map((s) => (typeof s === "string" ? s : s.name))
            .filter(Boolean)
        : [];
      const expArray = profile.experience
        ? profile.experience
            .map((e) => `${e.title} at ${e.companyName}`)
            .filter(Boolean)
        : [];
      resumeText = `Skills: ${skillsArray.join(", ")}. Experience: ${expArray.join("; ")}`;
    }

    console.log("Calling Groq API for Optimization...");

    // Initialize Groq on first use (lazy initialization)
    if (!groq) {
      if (!process.env.GROQ_API_KEY) {
        return res.status(500).json({
          message:
            "Groq API key not configured. Please set GROQ_API_KEY environment variable on Render.",
        });
      }
      groq = new Groq({ apiKey: process.env.GROQ_API_KEY });
    }

    // The Prompt Engineering
    const systemPrompt = `
        You are an expert ATS Resume Writer. Your task is to review the provided resume text and optimize it${jobDescription ? " for the provided job description" : ""}.
        
        Respond ONLY with a valid JSON object matching this exact structure:
        {
          "suggestions": ["suggestion 1", "suggestion 2", "suggestion 3"],
          "optimizedContent": "The fully rewritten and optimized resume text here, formatted with clear headings and bullet points using markdown."
        }
        Do not include any intro or outro text, just the JSON.
        `;

    const userPrompt = `
        Resume Text:
        ${resumeText}
        
        ${jobDescription ? `Target Job Description:\n${jobDescription}` : ""}
        `;

    const chatCompletion = await groq.chat.completions.create({
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
      model: GROQ_MODEL,
      temperature: 0.4,
      response_format: { type: "json_object" }, // Forces Groq to return clean JSON
    });

    // Parse Groq's JSON response
    const result = JSON.parse(chatCompletion.choices[0].message.content);

    res.status(200).json(result);
  } catch (error) {
    console.error("Optimization Error:", error.message);
    let message = "Groq optimization failed. Check the backend logs.";
    if (error.status === 401) {
      message = "Groq rejected the API key. Check GROQ_API_KEY in backend/.env.";
    } else if (error.status === 404) {
      message = "The configured Groq model is unavailable. Check GROQ_MODEL.";
    } else if (error.status === 429) {
      message = "Groq rate limit reached. Please try again later.";
    }
    res.status(502).json({ message });
  }
});

// 6. DELETE RESUME ROUTE
router.delete("/:id", async (req, res) => {
  try {
    const deletedResume = await Resume.findByIdAndDelete(req.params.id);

    if (!deletedResume) {
      return res.status(404).json({ message: "Resume not found" });
    }

    res.status(200).json({ message: "Resume deleted successfully" });
  } catch (error) {
    console.error("Delete Error:", error);
    res.status(500).json({ message: "Server Error during deletion" });
  }
});

module.exports = router;
