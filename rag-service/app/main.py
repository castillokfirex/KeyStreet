import os

from fastapi import FastAPI

app = FastAPI(title="Key Street RAG", version="0.1.0")


@app.get("/health")
def health() -> dict:
    return {
        "status": "ok",
        "provider": os.getenv("AI_PROVIDER", "gemini"),
        "embeddingModel": os.getenv("GEMINI_EMBEDDING_MODEL", ""),
        "chatModel": os.getenv("GEMINI_CHAT_MODEL", ""),
    }
