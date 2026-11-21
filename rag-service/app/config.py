from functools import lru_cache
from typing import Literal

from pydantic import model_validator
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    database_url: str = "postgresql://keystreet_rag:dev@postgres:5432/keystreet"
    ai_provider: Literal["gemini", "fake"] = "gemini"
    gemini_api_key: str = ""
    gemini_chat_model: str = "gemini-2.5-flash"
    gemini_embedding_model: str = "models/gemini-embedding-001"
    embedding_dim: int = 768
    internal_api_token: str = ""
    backend_callback_base_url: str = "http://backend-java:8080"
    pdf_tmp_dir: str = "/var/keystreet/pdf-tmp"
    ingest_concurrency: int = 2
    min_cos_sim: float = 0.55

    @model_validator(mode="after")
    def validate_rag_settings(self) -> "Settings":
        if self.embedding_dim != 768:
            raise ValueError("EMBEDDING_DIM debe ser exactamente 768 para coincidir con vector(768)")
        if not self.internal_api_token.strip():
            raise ValueError("INTERNAL_API_TOKEN es obligatorio")
        if self.ai_provider == "gemini" and not self.gemini_api_key.strip():
            raise ValueError("GEMINI_API_KEY es obligatoria cuando AI_PROVIDER=gemini")
        return self


@lru_cache(maxsize=1)
def get_settings() -> Settings:
    return Settings()
