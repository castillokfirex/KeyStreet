"""Calibra el contador local heuristico frente a count_tokens real de Google Gemini."""

import os

from google import genai

from app.ingestion.token_counter import TokenCounter


def main() -> None:
    api_key = os.getenv("GEMINI_API_KEY", "").strip()
    if not api_key:
        print("GEMINI_API_KEY vacia; omitiendo calibracion remota.")
        return

    client = genai.Client(api_key=api_key)
    sample = (
        "Nike Air Force 1 Low '07 cuenta con capellada en cuero plena flor, "
        "entresuela con unidad Air encapsulada y horma fiel a la talla."
    ) * 15
    model = os.getenv("GEMINI_CHAT_MODEL", "gemini-2.5-flash")
    resp = client.models.count_tokens(model=model, contents=sample)
    local = TokenCounter().count(sample)
    print(f"Modelo={model} | Gemini count_tokens={resp.total_tokens} | Local={local}")


if __name__ == "__main__":
    main()
