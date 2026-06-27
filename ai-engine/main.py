from fastapi import FastAPI
from pydantic import BaseModel
import os
import json
import chromadb
from dotenv import load_dotenv
from groq import Groq
from fastapi.middleware.cors import CORSMiddleware

# Load environment variables
load_dotenv()

# Initialize FastAPI
app = FastAPI(title="ATS AI Engine")

# The Bouncer (CORS) - Allowing all for local dev integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], 
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Initialize Groq Client
groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))

# Initialize ChromaDB (In-Memory for blazing fast local development)
chroma_client = chromadb.Client()

# Create a fresh collection using Cosine Distance for accurate 0-100% math
collection = chroma_client.get_or_create_collection(
    name="ats_semantic_v2", 
    metadata={"hnsw:space": "cosine"} 
)

# Define the strict Data Payload Structure
class MatchRequest(BaseModel):
    resume_text: str
    job_description: str

@app.post("/api/ai/analyze")
async def analyze_resume(request: MatchRequest):
    try:
        # 1. THE VECTOR EMBEDDING (ChromaDB)
        # We clear the collection for each new request to keep it stateless
        if collection.count() > 0:
            collection.delete(ids=["jd_1"])
            
        # Add the Job Description to the Vector Space
        collection.add(
            documents=[request.job_description],
            ids=["jd_1"]
        )

        # Query the Vector Space using the Resume
        results = collection.query(
            query_texts=[request.resume_text],
            n_results=1
        )
        
        # Chroma returns a "distance" score based on Cosine similarity
        # We mathematically convert this into a 0-100% score.
        distance = results['distances'][0][0]
        semantic_score = max(0, min(100, int((1 - distance) * 100)))

        # DEBUGGING: Print the math to the Python terminal
        print(f"📊 AI MATH -> Raw Distance: {distance} | Final Score: {semantic_score}%")

        # 2. THE GENERATIVE FEEDBACK (Groq LLM)
        prompt = f"""
        You are an expert ATS system. The semantic match score is {semantic_score}%.
        Resume: {request.resume_text}
        Job Description: {request.job_description}
        
        Provide strict JSON:
        1. "feedback": A 2-sentence summary of fit.
        2. "missing_keywords": Top 3-5 missing technical keywords.
        3. "improvement": One highly specific rewrite suggestion.
        """

        # Call the Groq API
        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            model="llama-3.3-70b-versatile", 
            response_format={"type": "json_object"},
        )

        # Parse the AI's response
        ai_data = json.loads(chat_completion.choices[0].message.content)

        # 3. Return the unified Enterprise Payload
        return {
            "semantic_score": semantic_score,
            "ai_insights": ai_data
        }

    except Exception as e:
        return {"error": str(e)}    