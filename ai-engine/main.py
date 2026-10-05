from fastapi import FastAPI
from fastapi import HTTPException
from pydantic import BaseModel
import os
import json
import logging
from threading import Lock
from uuid import uuid4
import chromadb
from chromadb.config import Settings
from dotenv import load_dotenv
from groq import Groq
from fastapi.middleware.cors import CORSMiddleware

load_dotenv()
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = FastAPI(title="ATS AI Engine")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

groq_client = Groq(api_key=os.getenv("GROQ_API_KEY"))
groq_model = os.getenv("GROQ_MODEL", "openai/gpt-oss-120b")

chroma_client = chromadb.Client(Settings(anonymized_telemetry=False))

collection = chroma_client.get_or_create_collection(
    name="ats_semantic_v2",
    metadata={"hnsw:space": "cosine"},
)
collection_lock = Lock()


class MatchRequest(BaseModel):
    resume_text: str
    job_description: str


@app.post("/api/ai/analyze")
def analyze_resume(request: MatchRequest):
    request_id = str(uuid4())
    try:
        with collection_lock:
            collection.add(
                documents=[request.job_description],
                ids=[request_id],
                metadatas=[{"request_id": request_id}],
            )

            results = collection.query(
                query_texts=[request.resume_text],
                n_results=1,
                where={"request_id": request_id},
            )

            distance = results["distances"][0][0]
            semantic_score = max(0, min(100, int((1 - distance) * 100)))
            collection.delete(ids=[request_id])

        logger.info("Semantic similarity calculated: %s%%", semantic_score)
        prompt = f"""
        You are an expert ATS system. The semantic match score is {semantic_score}%.
        Resume: {request.resume_text}
        Job Description: {request.job_description}
        
        Provide strict JSON:
        1. "feedback": A 2-sentence summary of fit.
        2. "missing_keywords": Top 3-5 missing technical keywords.
        3. "improvement": One highly specific rewrite suggestion.
        """

        chat_completion = groq_client.chat.completions.create(
            messages=[
                {"role": "system", "content": "Output valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            model=groq_model,
            response_format={"type": "json_object"},
        )

        response_content = chat_completion.choices[0].message.content
        if not response_content:
            raise ValueError("Groq returned an empty response")
        ai_data = json.loads(response_content)
        if not isinstance(ai_data, dict):
            raise ValueError("Groq returned an invalid JSON object")

        return {
            "semantic_score": semantic_score,
            "ai_insights": ai_data
        }

    except Exception as e:
        try:
            with collection_lock:
                collection.delete(ids=[request_id])
        except Exception:
            logger.exception("Failed to clean up ChromaDB request data")
        logger.exception("AI analysis failed")
        raise HTTPException(
            status_code=502,
            detail="AI analysis failed. Check AI Engine logs.",
        ) from e