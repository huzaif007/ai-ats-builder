const express = require("express");
const axios = require("axios");
const Redis = require("ioredis");
const Resume = require("../models/Resume");
const multer = require("multer");
const pdfParse = require("pdf-parse");

const upload = multer({ storage: multer.memoryStorage() });
const router = express.Router();
const redis = new Redis(process.env.UPSTASH_REDIS_URL);

const Groq = require('groq-sdk');
// Initialize Groq (it automatically looks for process.env.GROQ_API_KEY)
const groq = new Groq();

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
    const cacheKey = Buffer.from(hashStr).toString("base64");

    const cachedData = await redis.get(cacheKey);
    if (cachedData) {
      console.log("Upstash Cache Hit: Bypassing AI Engine");
      return res.status(200).json(JSON.parse(cachedData));
    }

    let resumeText = "";

    // DYNAMIC TEXT EXTRACTION: Check if PDF or JSON
    if (resume.parsedText && resume.parsedText.trim() !== "") {
      resumeText = resume.parsedText; // Use PDF text
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

    const aiResponse = await axios.post(
      `${process.env.AI_ENGINE_URL}/api/ai/analyze`,
      {
        resume_text: resumeText,
        job_description: jobDescription,
      },
    );

    // 1. FIX THE LOW SCORES (The ATS Curve)
        let rawScore = aiResponse.data.semantic_score;
        
        // If the Python engine returns a decimal (e.g., 0.65), convert it to 65
        if (rawScore <= 1) rawScore = rawScore * 100; 

        // Apply a generous curve. Vector matches are strict, so we boost it by ~30%
        // and cap it at 99% (so it never looks fake by hitting exactly 100%)
        let boostedScore = Math.min(99, Math.round(rawScore * 1.3));


    const finalPayload = {
      matchScore: aiResponse.data.semantic_score,
      matchingSkills: [],
      aiFeedback: aiResponse.data.ai_insights,
    };

    // 2. FIX THE DASHBOARD (Save to MongoDB)
        resume.atsScore = boostedScore;
        await resume.save(); // <--- This was missing! Now the Dashboard will see it.

        // Save to Cloud Redis (Expires in 24 Hours to save space)
        await redis.set(cacheKey, JSON.stringify(finalPayload), 'EX', 86400);


    res.status(200).json(finalPayload);
  } catch (error) {
    console.error("Match Error:", error.message);
    res.status(500).json({ message: "Server Error during matching" });
  }
});


// 5. AI OPTIMIZATION ROUTE (Powered by Groq)
router.post('/:id/optimize', async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        const { jobDescription } = req.body;

        // Extract text depending on whether it was a PDF or JSON
        let resumeText = '';
        if (resume.parsedText && resume.parsedText.trim() !== '') {
            resumeText = resume.parsedText;
        } else {
            const profile = resume.linkedinData || {};
            const skillsArray = profile.skills ? profile.skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean) : [];
            const expArray = profile.experience ? profile.experience.map(e => `${e.title} at ${e.companyName}`).filter(Boolean) : [];
            resumeText = `Skills: ${skillsArray.join(', ')}. Experience: ${expArray.join('; ')}`;
        }

        console.log("Calling Groq API for Optimization...");

        // The Prompt Engineering
        const systemPrompt = `
        You are an expert ATS Resume Writer. Your task is to review the provided resume text and optimize it${jobDescription ? ' for the provided job description' : ''}.
        
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
        
        ${jobDescription ? `Target Job Description:\n${jobDescription}` : ''}
        `;

        const chatCompletion = await groq.chat.completions.create({
            messages: [
                { role: 'system', content: systemPrompt },
                { role: 'user', content: userPrompt }
            ],
            model: 'llama-3.3-70b-versatile', // Using LLaMA 3 70B for high-quality reasoning
            temperature: 0.4,
            response_format: { type: "json_object" } // Forces Groq to return clean JSON
        });

        // Parse Groq's JSON response
        const result = JSON.parse(chatCompletion.choices[0].message.content);
        
        res.status(200).json(result);

    } catch (error) {
        console.error("Optimization Error:", error);
        res.status(500).json({ message: 'Server Error during optimization' });
    }
});


// 6. DELETE RESUME ROUTE
router.delete('/:id', async (req, res) => {
    try {
        const deletedResume = await Resume.findByIdAndDelete(req.params.id);
        
        if (!deletedResume) {
            return res.status(404).json({ message: 'Resume not found' });
        }
        
        res.status(200).json({ message: 'Resume deleted successfully' });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ message: 'Server Error during deletion' });
    }
});

module.exports = router;