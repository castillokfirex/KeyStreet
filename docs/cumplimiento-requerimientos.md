# Cumplimiento de `Requerimientos.md`

Estado al 2026-11-23. Cada punto indica dónde está implementado (ítems de [`PROGRESS.md`](../PROGRESS.md)) y qué evidencia lo respalda.

**Leyenda:** ✅ cumple · ⚠️ cumple con una decisión distinta a lo escrito o con un ajuste pendiente · ⏳ falta verificarlo en un equipo con Docker

## Objetivo

| Requerimiento | Estado | Cómo se cumple |
|---|---|---|
| El PDF original queda en el equipo del cliente; el servidor guarda solo fragmentos, embeddings y metadatos | ✅ | La base no tiene columnas binarias de PDF; solo `document_chunks` (texto, `vector(768)`, página, sección) y `documents` (metadatos y `sha256_hash`). El PDF vive en un volumen `tmpfs` (RAM) y se borra tras indexar. |
| Consultar con el PC del cliente apagado | ✅ | Las consultas usan solo lo indexado en PostgreSQL. |

## Componentes

| Requerimiento | Estado | Detalle |
|---|---|---|
| Cliente web con carga temporal por HTTPS | ⚠️ | Panel admin con *dropzone* (validación cliente y progreso). El backend rechaza la subida sin HTTPS con `426`, pero por defecto `REQUIRE_HTTPS=false` en desarrollo: **activarlo en producción** (`.env.production.example`). |
| Spring Boot: autenticación, autorización, expedientes | ✅ | JWT (15 min) + refresh rotado en cookie `HttpOnly`, roles `ADMIN_TENANT`/`CUSTOMER`, gestión de documentos (`/admin/documents`). |
| Procesador asíncrono: extracción, OCR, segmentación, indexación | ✅ | Servicio `rag-service` (FastAPI): PyMuPDF por página, Tesseract `spa+eng` para páginas escaneadas, cola asíncrona con callback al backend. |
| **OpenAI Embeddings** para el MVP | ⚠️ **Decisión distinta** | Se usa **Google Gemini** (`gemini-embedding-001`, 768 dimensiones) por indicación del proyecto (decisión D2 de `PLAN.md`). El acceso está desacoplado por interfaces (`providers/base.py`), de modo que cambiar de proveedor es configuración. **Conviene confirmar con el docente** que esta sustitución es aceptable. |
| PostgreSQL + pgvector | ✅ | PostgreSQL 16 + pgvector, índice HNSW coseno y GIN de texto. |
| "Spring Boot + `Pgvector.EntityFrameworkCore`" | ⚠️ Corregido | `Pgvector.EntityFrameworkCore` es una librería de .NET y no existe para Spring. Se usa **Spring Data JPA + Hibernate 6 + `JdbcTemplate`** para las consultas vectoriales (decisión D1). |
| Motor RAG: búsqueda híbrida, recuperación contextual, respuestas fundamentadas | ✅ | Vectorial (top 30) + texto completo `es_unaccent` (top 30), fusión RRF, umbral de similitud, respuesta con citas validadas. |

## Flujo de indexación

| Paso | Estado | Evidencia |
|---|---|---|
| El cliente envía el PDF cifrado por HTTPS | ⚠️ | Ver "Cliente web": el TLS está en `nginx`; certificado de desarrollo hoy, real en producción. |
| Guardado temporal con límites, validación y escaneo | ✅ / ⚠️ | Límite de tamaño (`MAX_PDF_MB`, 413) y de páginas; validación de tipo triple (Content-Type, Tika y firma `%PDF-`, 415); PDFBox rechaza cifrado, JavaScript, `/Launch`, archivos incrustados (422). El **antivirus ClamAV es opcional** (`--profile security`): activarlo en producción. |
| Trabajo asíncrono: texto + OCR | ✅ | Items 3.12–3.13 y 3.18. |
| Fragmentos de 500–1.000 tokens con solapamiento, conservando página, sección y orden | ✅ | `chunker.py` (objetivo 800, mín. 500, máx. 1.000, solape 120). Pruebas de rangos y metadatos (3.20). |
| Embedding por fragmento | ✅ | Gemini, con normalización L2 a 768 dimensiones. |
| Guardar texto, vector, identificadores, permisos, modelo y metadatos | ✅ | `document_chunks` con `tenant_id`, `embedding_model`, página, sección, orden. RLS activo. |
| Verificar la indexación y borrar la copia temporal | ✅ | El backend contrasta el conteo de fragmentos y el modelo, y **siempre** borra el temporal con verificación (`temp_file_deletion_verified`), más un *janitor* cada 5 min (2.25–2.29). Prueba `DocumentUploadIT`. |

## Flujo de consulta

| Paso | Estado | Evidencia |
|---|---|---|
| Embedding de la pregunta con el mismo modelo del índice | ✅ | La consulta filtra por `embedding_model` del índice (3.21). |
| Recuperación con pgvector **siempre con filtro de tenant y autorización** | ✅ | `tenant_id` obligatorio en el SQL híbrido + RLS forzado a nivel de base de datos; el `tenantId` lo fija el servidor, no el cliente (test `AssistantIT`, 2.35, y aislamiento en 3.29). |
| Combinar vectorial + texto, reordenar y elegir evidencias | ✅ | RRF con k = 60 y deduplicación por documento y página (3.22). |
| Respuesta con citas a documento, página y fuente | ✅ | El modelo cita `[n]`; el servidor valida cada cita contra la base y descarta las inventadas. Sin evidencia, responde `NO_EVIDENCE` sin llamar al modelo (3.25–3.26). |

## Limitaciones de no conservar el PDF

✅ Documentadas en `PLAN.md §1.4` y mostradas como aviso en el panel de administración (item 4.28).

## Otros requisitos del proyecto (más allá de `Requerimientos.md`)

| Requisito | Estado |
|---|---|
| Catálogo de 15 modelos, precios en COP, 4 descuentos automáticos de 10 %–15 % | ✅ Migración `V002` verificada. |
| Multi-tenant con aislamiento por RLS | ✅ Verificado con `verify_rls.sql` y prueba de otro tenant. |
| Pedido por WhatsApp con talla obligatoria y precio calculado en el servidor | ✅ |
| Visor 3D 360° y probador anatómico, con foto efímera que no sale del navegador | ✅ Carga diferida; `three` y MediaPipe no entran en `/` ni `/catalogo`. |
| Presupuesto de rendimiento (JS inicial ≤ 120 kB gzip) | ✅ 109,84 kB. |

## Qué falta para dar todo por cerrado

1. ⏳ **Ejecutar la verificación completa en un equipo con Docker**: `docker compose up -d --build`, `mvn verify` (se actualizaron `CatalogIT` y `AbstractIT` para los 15 modelos, sin correrlos aún), `pytest`, `.\scripts\smoke.ps1` y los E2E de Playwright. Los resultados de las fases 1–5 en `PROGRESS.md` se obtuvieron antes de la migración de 15 modelos.
2. ⏳ **Probar con una `GEMINI_API_KEY` real.** Hasta ahora el RAG se validó con el proveedor `fake` (determinista, sin red) y con *mocks*; falta una prueba con la API real (`pytest -m live`).
3. ⚠️ **Confirmar con el docente** el cambio de OpenAI a Gemini.
4. ⚠️ Para la **demostración de seguridad**: arrancar con `REQUIRE_HTTPS=true` y el perfil `security` (ClamAV), y mostrar que un PDF cifrado, uno con JavaScript y uno falso son rechazados.
5. Aprobación visual del diseño (único ítem sin marcar de `PROGRESS.md`).
6. Cuatro productos sin fotos y dos precios de prueba (ver `docs/catalogo-fuentes.md`).
