import math


class TokenCounter:
    """Contador heurístico local (~4 chars/token) calibrado para modelos Gemini."""

    def __init__(self, chars_per_token: float = 4.0) -> None:
        self.chars_per_token = chars_per_token

    def count(self, text: str) -> int:
        if not text:
            return 0
        return max(1, math.ceil(len(text) / self.chars_per_token))
