import numpy as np
from langchain_core.messages import HumanMessage, SystemMessage
from langchain_google_genai import ChatGoogleGenerativeAI, GoogleGenerativeAIEmbeddings
from pydantic import SecretStr
from tenacity import retry, stop_after_attempt, wait_exponential

from app.generation.prompts import SYSTEM_PROMPT, format_context_blocks
from app.providers.base import ContextBlock, GroundedAnswer


def _l2_normalize(vec: list[float], expected_dim: int) -> list[float]:
    arr = np.asarray(vec, dtype=np.float32)
    if arr.shape != (expected_dim,):
        raise ValueError(f"Dimension de embedding inesperada: {arr.shape}, esperada ({expected_dim},)")
    norm = float(np.linalg.norm(arr))
    if norm > 0.0:
        arr = arr / norm
    return [float(x) for x in arr]


class GeminiEmbeddingProvider:
    def __init__(self, api_key: str, model_name: str, dim: int = 768) -> None:
        self.model_name = model_name
        self.dim = dim
        self._client = GoogleGenerativeAIEmbeddings(
            model=model_name,
            api_key=SecretStr(api_key),
            output_dimensionality=dim,
        )

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, max=16), reraise=True)
    def _embed_batch(self, texts: list[str]) -> list[list[float]]:
        return self._client.embed_documents(
            texts,
            batch_size=100,
            task_type="RETRIEVAL_DOCUMENT",
            output_dimensionality=self.dim,
        )

    def embed_documents(self, texts: list[str]) -> list[list[float]]:
        if not texts:
            return []
        raw_vecs = self._embed_batch(texts)
        return [_l2_normalize(v, self.dim) for v in raw_vecs]

    @retry(stop=stop_after_attempt(4), wait=wait_exponential(multiplier=1, max=16), reraise=True)
    def embed_query(self, text: str) -> list[float]:
        raw = self._client.embed_query(
            text,
            task_type="RETRIEVAL_QUERY",
            output_dimensionality=self.dim,
        )
        return _l2_normalize(raw, self.dim)


class GeminiChatProvider:
    def __init__(self, api_key: str, model_name: str) -> None:
        self.model_name = model_name
        llm = ChatGoogleGenerativeAI(
            model=model_name,
            api_key=SecretStr(api_key),
            temperature=0.1,
            max_retries=3,
        )
        self._structured = llm.with_structured_output(GroundedAnswer)

    def grounded_answer(
        self,
        question: str,
        context_blocks: list[ContextBlock],
        product_note: str | None = None,
    ) -> GroundedAnswer:
        context_text = format_context_blocks(context_blocks, product_note=product_note)
        messages = [
            SystemMessage(content=SYSTEM_PROMPT),
            HumanMessage(
                content=(
                    f"CONTEXTO:\n{context_text}\n\n"
                    f"PREGUNTA DEL CLIENTE:\n{question}\n\n"
                    "Responde exclusivamente usando el CONTEXTO."
                )
            ),
        ]
        result = self._structured.invoke(messages)
        if isinstance(result, GroundedAnswer):
            return result
        return GroundedAnswer.model_validate(result)
