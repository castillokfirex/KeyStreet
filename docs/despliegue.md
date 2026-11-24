# Despliegue, `.env` y seguridad

## 1. Qué es el `.env` y qué pasa si falta

El `.env` guarda los **secretos** del sistema (claves de JWT, contraseñas de la base de datos, token interno entre servicios y la clave de Gemini). **No se sube a git a propósito** (está en `.gitignore`): si estuviera en GitHub, cualquiera podría firmar sesiones falsas o leer la base de datos. Por eso cada computador o servidor genera el suyo.

| Si falta… | Qué ocurre |
|---|---|
| `.env` completo | `docker compose up` falla o avisa de variables vacías; el backend no arranca (valida que `JWT_SECRET` tenga ≥ 64 caracteres). |
| `JWT_SECRET`, `INTERNAL_API_TOKEN` | El backend no arranca. |
| `POSTGRES_PASSWORD`, `APP_DB_PASSWORD`, `RAG_DB_PASSWORD` | La base de datos y los roles no se crean bien; ningún servicio conecta. |
| `GEMINI_API_KEY` | Todo funciona (tienda, catálogo, 3D, WhatsApp, admin), **menos el asistente Kast y la indexación de PDFs**, que necesitan la IA. Solución para demos: `AI_PROVIDER=fake`. |

**Cómo crearlo** (genera secretos aleatorios, no inventes contraseñas a mano):

```powershell
.\scripts\gen-dev-secrets.ps1
```

Después abre `.env` y, si quieres IA real, pega tu `GEMINI_API_KEY`.

> No pegues el `.env` en chats, capturas ni commits. Si se filtra, regénéralo con `.\scripts\gen-dev-secrets.ps1 -Force` (y cambia la clave de Gemini en Google AI Studio).

## 2. Abrir el proyecto en otro computador

Requisitos: **Git**, **Docker Desktop** (con WSL2) y **PowerShell**. Opcional: `mkcert` para HTTPS local sin avisos.

```powershell
git clone https://github.com/castillokfirex/KeyStreet.git
cd KeyStreet
git checkout feat/catalogo-15-modelos      # o main, cuando fusiones el Pull Request
.\scripts\gen-dev-secrets.ps1              # crea .env con secretos nuevos
```

Certificado HTTPS de desarrollo (el frontend lo exige para arrancar):

```powershell
mkcert -install
mkcert -cert-file infra/certs/dev.crt -key-file infra/certs/dev.key localhost 127.0.0.1
```

Levantar todo (la primera vez tarda varios minutos en construir):

```powershell
docker compose up -d --build
docker compose ps                          # los 4 servicios deben estar "healthy"
```

Abre **https://localhost**. Admin: `https://localhost/admin/login` (usuarios de desarrollo en el README).

**Sin clave de Gemini** (demo o evaluación offline), en vez de lo anterior:

```powershell
docker compose -f docker-compose.yml -f docker-compose.e2e.yml up -d --build
```

**Si ya tenías una base de datos de una versión anterior** (volumen existente), el catálogo de 15 modelos no se aplica solo. O reinicias desde cero (borra los datos):

```powershell
docker compose down -v; docker compose up -d --build
```

o aplicas solo la migración, que es idempotente (se puede repetir sin duplicar):

```powershell
docker compose exec -T postgres psql -U postgres -d keystreet -v ON_ERROR_STOP=1 -f /db-migrations/V002__catalogo_15_modelos.sql
```

## 3. Por qué no sirve Vercel ni GitHub Pages por sí solos

Key Street son **4 servicios** (PostgreSQL con pgvector, Spring Boot, FastAPI con OCR y el frontend). Vercel y GitHub Pages solo publican **sitios estáticos** o funciones cortas:

| Opción | ¿Sirve? | Motivo |
|---|---|---|
| GitHub Pages | No | Solo HTML/JS estático: la tienda abriría sin catálogo, sin login, sin pedidos ni asistente. |
| Vercel (solo frontend) | Parcial | Publica la interfaz, pero sigue haciendo falta un servidor para la API y la base de datos; no ganas nada frente a servirla desde el mismo servidor. |
| Vercel para el backend | No | No ejecuta Spring Boot, Postgres ni Tesseract de forma continua, y el diseño de PDFs efímeros en RAM (`tmpfs`) exige un contenedor propio. |
| **Un VPS con Docker Compose** | **Sí (recomendado)** | Es la arquitectura para la que se diseñó el proyecto: los mismos 4 contenedores, con tu dominio y HTTPS real. |

### Servidor recomendado

- **VPS de 2 vCPU y 4 GB de RAM** como mínimo (Spring Boot + OCR + Postgres). Ejemplos: Hetzner, DigitalOcean, Contabo.
- **Dominio propio** (por ejemplo `keystreet.co`) apuntando al servidor.
- **HTTPS real** con Let's Encrypt. El `nginx` actual usa el certificado de desarrollo; en producción hay que poner delante un proxy con certificado automático (Caddy o Traefik) o configurar `certbot`. *(Pendiente de implementar: ver sección 6.)*

## 4. Checklist de seguridad antes de vender de verdad

Copia las variables de [`.env.production.example`](../.env.production.example) a tu `.env` del servidor y revisa:

- [ ] `COOKIE_SECURE=true` y `REQUIRE_HTTPS=true` (por defecto están en `false` para poder trabajar en local).
- [ ] `CORS_ALLOWED_ORIGINS` solo con tu dominio.
- [ ] `OPENAPI_ENABLED=false` (oculta Swagger).
- [ ] Antivirus de PDFs activo: `CLAMAV_ENABLED=true` y `docker compose --profile security up -d`.
- [ ] **Cambiar los usuarios de prueba.** `db/seed.sql` crea `admin@keystreet.co` y `cliente@keystreet.co` con la contraseña pública `KeyStreet2026!` (está en el README). En producción hay que borrarlos o cambiar la contraseña y el correo del administrador **antes de abrir al público**.
- [ ] Puertos: solo `80` y `443` abiertos al exterior. PostgreSQL (`5432`) y el backend (`8080`) ya escuchan solo en `127.0.0.1`; mantenlo así y activa el firewall (`ufw`).
- [ ] Copias de seguridad diarias del volumen `pgdata` (`pg_dump`) guardadas fuera del servidor.
- [ ] `GEMINI_API_KEY` con límite de gasto/cuota en Google AI Studio.
- [ ] Reemplazar el número `WHATSAPP_PHONE` de prueba por el real.
- [ ] Actualizar imágenes de Docker y dependencias con regularidad.

## 5. Para que el cliente confíe (y venda de verdad)

Orden sugerido, de mayor a menor impacto:

1. **Fotos propias de cada par** (o del distribuidor, con su permiso). Las fotos actuales vienen de Wikimedia Commons con licencias libres; sirven para el proyecto, pero no transmiten confianza en una tienda real. Cuatro modelos aún no tienen fotos.
2. **Precios reales** de los dos productos marcados *PRUEBA* (Converse y Puma) y revisión periódica del resto (ver `docs/catalogo-fuentes.md`).
3. **Páginas legales y de contacto**: política de privacidad y tratamiento de datos (Ley 1581 de 2012, Habeas Data), términos y condiciones, cambios y devoluciones, derecho de retracto en ventas a distancia (Ley 1480 de 2011), datos de la empresa (razón social, NIT, dirección). El pie de página tiene los textos como marcadores; hay que redactarlos con asesoría legal.
4. **Pagos**: hoy el pedido se cierra por WhatsApp. Para pagar en línea se integra una pasarela con soporte para Colombia (Wompi, PayU, Mercado Pago), siempre usando su página de pago para no tocar datos de tarjetas.
5. **Autenticidad visible**: certificados o fotos del par real, políticas de verificación y reseñas de clientes.
6. **Confianza técnica**: dominio propio, HTTPS, correo corporativo, Google Search Console y analítica respetuosa con la privacidad.
7. **Operación**: stock real sincronizado, confirmación de pedido, seguimiento de envío y respuesta rápida por WhatsApp.

## 6. Pendientes técnicos de despliegue

- Perfil de producción de Compose con **proxy HTTPS automático** (Caddy/Traefik) en lugar del certificado de desarrollo.
- Script de **copias de seguridad** y restauración de PostgreSQL.
- **Monitoreo** básico (`/actuator/health`, alertas de caída) y rotación de logs.
- Pipeline de **CI** (GitHub Actions) que corra typecheck, lint, pruebas y build en cada Pull Request.
