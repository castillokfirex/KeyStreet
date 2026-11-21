FROM python:3.11-slim
ENV PYTHONDONTWRITEBYTECODE=1 PYTHONUNBUFFERED=1 UV_LINK_MODE=copy

RUN apt-get update \
 && apt-get install -y --no-install-recommends tesseract-ocr tesseract-ocr-spa tesseract-ocr-eng \
 && rm -rf /var/lib/apt/lists/* \
 && groupadd -g 10001 app && useradd -u 10001 -g 10001 -M -s /usr/sbin/nologin app

COPY --from=ghcr.io/astral-sh/uv:latest /uv /usr/local/bin/uv

WORKDIR /srv
COPY pyproject.toml uv.lock ./
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --no-install-project --extra dev
COPY app ./app
COPY tests ./tests
RUN --mount=type=cache,target=/root/.cache/uv uv sync --frozen --extra dev && chown -R 10001:10001 /srv

ENV PATH="/srv/.venv/bin:$PATH"
USER 10001
EXPOSE 8000
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
