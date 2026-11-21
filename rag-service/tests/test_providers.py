import math
import os

import pytest

from app.providers.fake import FakeChatProvider, FakeEmbeddingProvider
from app.providers.gemini import GeminiEmbeddingProvider


def test_fake_embedding_is_768_dim_normalized_and_deterministic() -> None:
    emb = FakeEmbeddingProvider(dim=768)
    v1 = emb.embed_query("Adidas Samba OG horma estrecha")
    v2 = emb.embed_query("Adidas Samba OG horma estrecha")
    assert len(v1) == 768
    assert v1 == v2
    norm = math.sqrt(sum(x * x for x in v1))
    assert abs(norm - 1.0) < 1e-4

    docs = emb.embed_documents(["Samba OG cuero gamuza", "Converse lona vulcanizada"])
    assert len(docs) == 2
    assert all(len(v) == 768 for v in docs)


def test_fake_chat_returns_insufficient_context_when_empty() -> None:
    chat = FakeChatProvider()
    res = chat.grounded_answer("¿Cual es la garantia?", [])
    assert res.insufficient_context is True
    assert res.cited_sources == []


@pytest.mark.live
def test_gemini_live_embedding_768_normalized() -> None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        pytest.skip("GEMINI_API_KEY vacia")
    emb = GeminiEmbeddingProvider(
        api_key=api_key,
        model_name=os.getenv("GEMINI_EMBEDDING_MODEL", "models/gemini-embedding-001"),
        dim=768,
    )
    v = emb.embed_query("Nike Air Force 1 talla 41")
    assert len(v) == 768
    norm = math.sqrt(sum(x * x for x in v))
    assert abs(norm - 1.0) < 1e-3
