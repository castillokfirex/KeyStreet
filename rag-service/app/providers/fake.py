import hashlib
import re
import unicodedata

import numpy as np

from app.providers.base import ContextBlock, GroundedAnswer

_STOPWORDS = {
    "como", "para", "cual", "cuales", "sobre", "tiene", "tienen", "esta", "este",
    "unos", "unas", "donde", "cuando", "quien", "hola", "kast", "street", "key",
}


def _normalize_text(text: str) -> str:
    nfkd = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def _tokens(text: str) -> list[str]:
    norm = _normalize_text(text)
    words = [w for w in re.findall(r"[a-z0-9]{3,}", norm) if w not in _STOPWORDS]
    grams: list[str] = []
    for w in words:
        grams.append(w)
        grams.append(w)  # mayor peso a palabra completa
        for i in range(max(0, len(w) - 3)):
            grams.append(w[i : i + 4])
    return grams or ["empty"]


def _hash_vec(text: str, dim: int = 768) -> list[float]:
    vec = np.zeros(dim, dtype=np.float32)
    for tok in _tokens(text):
        digest = hashlib.sha256(tok.encode("utf-8")).digest()
        idx = int.from_bytes(digest[:4], "big") % dim
        sign = 1.0 if (digest[4] & 1) == 0 else -1.0
        vec[idx] += sign
    norm = float(np.linalg.norm(vec))
    if norm > 0:
        vec = vec / norm
    else:
        vec[0] = 1.0
    return [float(x) for x in vec]


class FakeEmbeddingProvider:
    def __init__(self, model_name: str = "fake-embedding-768", dim: int = 768) -> None:
        self.model_name = model_name
        self.dim = dim

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        return [_hash_vec(t, self.dim) for t in texts]

    def embed_query(self, text: str) -> list[float]:
        return _hash_vec(text, self.dim)


class FakeChatProvider:
    def __init__(self, model_name: str = "fake-gemini-chat") -> None:
        self.model_name = model_name

    def grounded_answer(
        self,
        question: str,
        context_blocks: list[ContextBlock],
        product_note: str | None = None,
    ) -> GroundedAnswer:
        if not context_blocks:
            return GroundedAnswer(
                answer="No encontré información suficiente en los documentos de la tienda.",
                cited_sources=[],
                insufficient_context=True,
            )

        q_words = set(re.findall(r"[a-z0-9]{3,}", _normalize_text(question))) - _STOPWORDS
        best = context_blocks[0]
        best_overlap = 0
        for blk in context_blocks:
            b_words = set(re.findall(r"[a-z0-9]{3,}", _normalize_text(blk.content)))
            ov = len(q_words & b_words)
            if ov > best_overlap:
                best_overlap = ov
                best = blk

        if q_words and best_overlap == 0 and (best.cos_sim or 0.0) < 0.25 and (best.ts_score or 0.0) == 0:
            return GroundedAnswer(
                answer="No encontré evidencia en los documentos indexados sobre esa consulta.",
                cited_sources=[],
                insufficient_context=True,
            )

        snippet = " ".join(best.content.strip().split())
        if len(snippet) > 220:
            snippet = snippet[:217].rstrip() + "..."
        return GroundedAnswer(
            answer=f"Según {best.document_title}, {snippet} [{best.n}].",
            cited_sources=[best.n],
            insufficient_context=False,
        )
