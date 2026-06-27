const express = require('express');
const axios = require('axios');
const Redis = require('ioredis');
const Resume = require('../models/Resume');

const router = express.Router();

// Initialize Upstash Redis Client
const redis = new Redis(process.env.UPSTASH_REDIS_URL);

// 1. DASHBOARD ROUTE
router.get('/', async (req, res) => {
    try {
        const resumes = await Resume.find().sort({ createdAt: -1 });
        res.status(200).json(resumes);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// 2. SINGLE RESUME ROUTE
router.get('/:id', async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) return res.status(404).json({ message: 'Resume not found' });
        res.status(200).json(resume);
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// 3. UPLOAD ROUTE
router.post('/', async (req, res) => {
    try {
        const { title, linkedinData } = req.body;
        if (!title || !linkedinData) return res.status(400).json({ message: 'Missing data' });
        
        const newResume = new Resume({ title, linkedinData });
        const savedResume = await newResume.save();
        
        res.status(201).json({ message: 'Success', data: savedResume });
    } catch (error) {
        res.status(500).json({ message: 'Server Error' });
    }
});

// 4. AI MATCH ROUTE (Now powered by Cloud Redis)
router.post('/:id/match', async (req, res) => {
    try {
        const resume = await Resume.findById(req.params.id);
        if (!resume) return res.status(404).json({ message: 'Resume not found' });

        const { jobDescription } = req.body;
        if (!jobDescription) return res.status(400).json({ message: 'Missing JD' });

        // Generate Cache Key using Base64 (Bypassing the crypto bug)
        const hashStr = resume._id.toString() + jobDescription;
        const cacheKey = Buffer.from(hashStr).toString('base64');

        // Check Cloud Redis for the Cache
        const cachedData = await redis.get(cacheKey);
        if (cachedData) {
            console.log("Upstash Cache Hit: Bypassing AI Engine");
            return res.status(200).json(JSON.parse(cachedData));
        }

        const profile = resume.linkedinData || {};
        const skillsArray = profile.skills ? profile.skills.map(s => typeof s === 'string' ? s : s.name).filter(Boolean) : [];
        const expArray = profile.experience ? profile.experience.map(e => `${e.title} at ${e.companyName}`).filter(Boolean) : [];
        const resumeText = `Skills: ${skillsArray.join(', ')}. Experience: ${expArray.join('; ')}`;

        console.log("Cache Miss: Calling Python Semantic Engine...");
        
        // Using the Docker network service name 'ai-engine'
        const aiResponse = await axios.post(`${process.env.AI_ENGINE_URL}/api/ai/analyze`, {
            resume_text: resumeText,
            job_description: jobDescription
        });

        const finalPayload = {
            matchScore: aiResponse.data.semantic_score,
            matchingSkills: [], 
            aiFeedback: aiResponse.data.ai_insights
        };

        // Save to Cloud Redis (Expires in 24 Hours to save space)
        await redis.set(cacheKey, JSON.stringify(finalPayload), 'EX', 86400);
        
        res.status(200).json(finalPayload);

    } catch (error) {
        console.error("Match Error:", error.message);
        res.status(500).json({ message: 'Server Error during matching' });
    }
});

module.exports = router;