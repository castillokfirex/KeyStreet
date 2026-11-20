import asyncio
import os
import sys

# Establecer entorno por defecto antes de importar modulos que carguen Settings
os.environ.setdefault("INTERNAL_API_TOKEN", "test-internal-token-1234567890")
os.environ.setdefault("AI_PROVIDER", "fake")
os.environ.setdefault("DATABASE_URL", "postgresql://keystreet_rag:rag@localhost:5432/keystreet")

if sys.platform == "win32":
    asyncio.set_event_loop_policy(asyncio.WindowsSelectorEventLoopPolicy())
