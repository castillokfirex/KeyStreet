# Key Street

Plataforma SaaS multi-tenant de e-commerce de calzado con arquitectura RAG efímera (100% Google Gemini API), visor 3D interactivo 360°, probador anatómico con pose local e identidad dual **Key Street × Kast**.

Plan técnico completo: [PLAN.md](./PLAN.md) · Checklist de progreso: [PROGRESS.md](./PROGRESS.md).

## Arquitectura (4 servicios Docker)

| Servicio | Stack | Puerto | Rol |
|---|---|---|---|
| `postgres` | PostgreSQL 16 + `pgvector` | `127.0.0.1:5432` | Multi-tenancy con RLS forzado (`app.tenant_id`), catálogo COP, chunks `vector(768)` (HNSW) + FTS `es_unaccent` (GIN) |
| `backend-java` | Spring Boot 3 · Java 21 | `127.0.0.1:8080` | Auth JWT + refresh tokens rotados, Hibernate `@TenantId` + RLS, catálogo/WhatsApp, validación PDFbox y ciclo efímero en `tmpfs` (`/var/keystreet/pdf-tmp`) |
| `rag-service` | Python 3.11 · FastAPI · LangChain | Interno (`8000`) | PyMuPDF + Tesseract OCR (`spa+eng`), chunker 500–1.000 tokens, Gemini (`models/gemini-embedding-001` 768 dims + `gemini-2.5-flash`) / `fake`, búsqueda híbrida RRF con citas |
| `frontend` | React 19 · Vite · Tailwind v4 · Nginx | `80`, `443` | UI editorial minimalista, identidad Kast, WhatsApp VIP, chat RAG, panel admin y módulos 3D/MediaPipe **lazy-loaded** |

## Arranque rápido (Windows / PowerShell)

```powershell
.\scripts\gen-dev-secrets.ps1          # genera .env con secretos aleatorios
# Opcional: editar .env -> GEMINI_API_KEY=... (para pruebas offline usar docker-compose.e2e.yml con AI_PROVIDER=fake)
docker compose up -d --build
docker compose ps                       # 4 servicios healthy
```

Para modo E2E sin API key externa (`AI_PROVIDER=fake`, TTL de janitor 2 min):

```powershell
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build
```

Certificado TLS de desarrollo (`infra/certs/dev.crt|dev.key`, no versionado; recomendado `mkcert`):

```powershell
mkcert -install
mkcert -cert-file infra/certs/dev.crt -key-file infra/certs/dev.key localhost 127.0.0.1
```

## Credenciales de desarrollo (seed `key-street`)

| Usuario | Rol | Contraseña | Acceso |
|---|---|---|---|
| `admin@keystreet.co` | `ADMIN_TENANT` | `KeyStreet2026!` | `https://localhost/admin/login` |
| `cliente@keystreet.co` | `CUSTOMER` | `KeyStreet2026!` | Tienda / asistente |

Tenant header para llamadas directas a API: `X-Tenant-Slug: key-street`.

## Base de datos y verificación

`db/schema.sql` y `db/seed.sql` se ejecutan al inicializar el volumen de PostgreSQL (10 referencias en COP, descuentos 10%–15% únicamente en los 4 pares entre `$170.000` y `$185.000`, 90 variantes tallas 36–44).

```powershell
docker compose down -v; docker compose up -d --build
docker compose exec postgres psql -U postgres -d keystreet -v ON_ERROR_STOP=1 -f /db-tests/verify_seed.sql
docker compose exec postgres psql -U postgres -d keystreet -v ON_ERROR_STOP=1 -f /db-tests/verify_rls.sql
```

## Cómo agregar fotos reales y modelos 3D (`.glb`)

1. **Fotos de producto** (contenedores `aspect-[4/5]` preparados sin 404):
   - Copia tus imágenes optimizadas (`.webp`) dentro de `frontend/public/assets/products/{slug}/` (`01-lateral.webp`, `02-medial.webp`, `03-suela.webp`, `04-detalle.webp`, `05-on-feet.webp`).
   - Actualiza en PostgreSQL la propiedad JSONB `image_placeholder_paths` del producto poniendo `"ready": true`:
     ```sql
     UPDATE products
     SET image_placeholder_paths = jsonb_set(image_placeholder_paths, '{ready}', 'true')
     WHERE slug = 'nike-air-force-1-low-07-blanco';
     ```
2. **Modelos 3D (`.glb`)**:
   - Exporta el modelo comprimido (Draco/Meshopt recomendado) como `frontend/public/assets/models/{slug}.glb`.
   - Habilita `model_3d_ready = true` en `products`:
     ```sql
     UPDATE products SET model_3d_ready = true WHERE slug = 'nike-air-force-1-low-07-blanco';
     ```
   - Reconstruye o reinicia `frontend` (`docker compose up -d --build frontend`).

## Comandos de pruebas y auditoría

```powershell
# Backend Java (IT con Testcontainers + WireMock)
cd backend-java; .\mvnw.cmd -B -ntp verify; cd ..

# Microservicio RAG (unit + Testcontainers + OCR)
cd rag-service
uv run ruff check .; uv run mypy app
uv run pytest -m "not live and not ocr" -q
cd ..
docker compose -f docker-compose.yml -f docker-compose.e2e.yml run --rm --no-deps -e INTERNAL_API_TOKEN=test -e AI_PROVIDER=fake rag-service pytest -m ocr -q
.\scripts\smoke.ps1

# Frontend (unit + bundle budget + E2E Playwright + Lighthouse CI)
cd frontend
npm run typecheck; npm run lint; npm run test -- --run; npm run build
npx size-limit
npx playwright test
npx lhci autorun
cd ..
```
