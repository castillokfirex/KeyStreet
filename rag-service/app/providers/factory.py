from functools import lru_cache

from app.config import get_settings
from app.providers.base import ChatProvider, EmbeddingProvider
from app.providers.fake import FakeChatProvider, FakeEmbeddingProvider
from app.providers.gemini import GeminiChatProvider, GeminiEmbeddingProvider


@lru_cache(maxsize=1)
def get_embedding_provider() -> EmbeddingProvider:
    settings = get_settings()
    if settings.ai_provider == "fake":
        return FakeEmbeddingProvider(
            model_name=settings.gemini_embedding_model,
            dim=settings.embedding_dim,
        )
    return GeminiEmbeddingProvider(
        api_key=settings.gemini_api_key,
        model_name=settings.gemini_embedding_model,
        dim=settings.embedding_dim,
    )


@lru_cache(maxsize=1)
def get_chat_provider() -> ChatProvider:
    settings = get_settings()
    if settings.ai_provider == "fake":
        return FakeChatProvider(model_name="fake-chat")
    return GeminiChatProvider(
        api_key=settings.gemini_api_key,
        model_name=settings.gemini_chat_model,
    )
