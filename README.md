# Key Street

SaaS multi-tenant de e-commerce de calzado con RAG efímero (Gemini), visor 3D y probador anatómico.
Plan técnico: [PLAN.md](./PLAN.md) · Progreso: [PROGRESS.md](./PROGRESS.md).

## Arranque rápido (Windows / PowerShell)

```powershell
.\scripts\gen-dev-secrets.ps1          # crea .env con secretos aleatorios
# Opcional: editar .env -> GEMINI_API_KEY=...   (sin clave: AI_PROVIDER=fake)
docker compose up -d --build
docker compose ps                       # 4 servicios healthy
```

Certificado TLS de desarrollo (`infra/certs/dev.crt|dev.key`, autofirmado, no versionado):

```powershell
docker run --rm -v "${PWD}\infra\certs:/certs" alpine/openssl req -x509 -newkey rsa:2048 -nodes -days 825 `
  -keyout /certs/dev.key -out /certs/dev.crt -subj "/CN=localhost" -addext "subjectAltName=DNS:localhost,IP:127.0.0.1"
```

## Credenciales de desarrollo (solo seed)

| Usuario | Rol | Contraseña |
|---|---|---|
| `admin@keystreet.co` | ADMIN_TENANT | `KeyStreet2026!` |
| `cliente@keystreet.co` | CUSTOMER | `KeyStreet2026!` |

## Base de datos

`db/schema.sql` y `db/seed.sql` se aplican solo al crear el volumen. Reinicializar (borra datos):
`docker compose down -v; docker compose up -d --build`.
Verificación: `docker compose exec postgres psql -U postgres -d keystreet -v ON_ERROR_STOP=1 -f /db-tests/verify_seed.sql`.
