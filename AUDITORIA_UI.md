# Auditoría UI: adaptación de `key-street-ui` a `frontend/`

Fecha: 2026-11-20 · Rama: `feat/adaptacion-key-street`

## 0. Ubicación de las fuentes

- El repositorio real está en `C:\Users\Full Service\dev\kevinCastillo\KeyStreet` (no en `C:\dev\KeyStreet`).
- El diseño de referencia **no está** en `./key-street-ui/` dentro del repo: vive en la carpeta hermana `../fronted_KeyStreet/` (Vite + CSS Modules + mocks). Se usa solo como referencia de diseño; **no se copia** al repo ni se importa nada de sus `adapters/`, `ports/` o `data/`.

## 1. Línea base (antes de tocar nada)

| Verificación | Resultado |
|---|---|
| `npm run typecheck` | OK |
| `npm run lint` | OK |
| `npm run test -- --run` | 5 archivos · 12/12 |
| `npm run build` | OK |
| `npx size-limit` | Entrada `/` 107,53 kB gzip (≤ 120) · Catálogo 2,86 kB (≤ 40) |
| Docker | **No instalado en esta máquina** (`docker` no existe en PATH). El paso `docker compose up` se omite. |

## 2. Mapa de componentes

| `key-street-ui` (referencia) | `frontend/` (real) | Acción |
|---|---|---|
| `styles/tokens.css` | `src/styles/index.css` (`@theme` Tailwind v4) | Portar paleta, radios, tracking y movimiento como tokens `@theme`, **conservando los nombres** existentes (`canvas`, `surface`, `line`, `muted`, `navy`, `forest`, `mint`) para que todo el sitio (incluido admin) herede la paleta sin reescribir clases. |
| `brand/KastLogo.tsx` (silueta lineal) | `components/brand/KastLogo.tsx` (`isotype` / `wordmark`) | Mantener la API `variant` (usada en 7 archivos y en tests). El `isotype` pasa a la silueta lineal con orejas enmascaradas. |
| `brand/Wordmark.tsx` | `KastLogo variant="wordmark"` | Se mantiene el wordmark existente ("KEY STREET", tracking 0,32 em), sin el cuadro de la K. |
| `components/Header/AlternatingLogo.tsx` (framer) | nuevo `components/layout/AlternatingLogo.tsx` | Crossfade con **CSS** (no `motion`): el header está en el bundle de entrada y `motion` no. |
| `components/Header` + `AnnouncementBar` | `layout/Header.tsx` + `layout/PromoBar.tsx` + `layout/MobileNav.tsx` | Rediseño: nav en mayúsculas, logo alternante, iconos, subnav de categorías, compacto al hacer scroll. Texto de la barra sigue saliendo de `tenant.branding.promoBar`. |
| `components/Footer` | `layout/Footer.tsx` | Rediseño sin cajas; se conserva el toast "Drop List — Próximamente" y el enlace de WhatsApp del tenant. |
| `features/catalog/ProductCard` | `features/catalog/ProductCard.tsx` + `ProductImage.tsx` | Tarjeta sin borde ni botón; hover a 2.ª imagen; swipe + puntos en táctil; `ProductImage` conserva el placeholder si `images.ready === false`. |
| `features/catalog/DensityToggle` | nuevo `features/catalog/DensityToggle.tsx` + `stores/catalogView.ts` | Store nuevo y pequeño (preferencia de UI persistida). No reemplaza ningún store existente. |
| `features/catalog/Filters` (drawer) | `features/catalog/FilterBar.tsx` | Se mantiene la barra inline sincronizada con la URL (contrato E2E: botón "Solo descuentos", select "Ordenar productos"); solo cambia el estilo. |
| `components/Price` | `components/ui/PriceTag.tsx` | Precio final en verde acento cuando hay descuento; se conservan `data-testid` `original-price` / `final-price` y `formatCop`. |
| `features/product/*` | `features/product/ProductDetailPage.tsx`, `PurchasePanel.tsx`, `RelatedCarousel.tsx`, `ui/SizeSelector.tsx`, `ui/Accordion.tsx` | Solo estilo. Talla obligatoria, `whatsapp-intent`, fallback `wa.me`, bolsa y lazy de visor/probador intactos. |
| `features/product/Product3DSlot` | `features/viewer3d/Viewer3D.tsx` (real, lazy) | **No se porta**: el visor real ya existe y es lazy. |
| `brand/Kast.tsx` + `useEyeTracking.ts` | `components/brand/KastMascot.tsx` + nuevo `useEyeTracking.ts` + `KastStaticIcon.tsx` | Nuevo dibujo "orbe" con los 6 estados reales del store (ver §4). |
| `features/chat/ChatWidget` + `ChatPanel` + `useChat` | `layout/StoreLayout.tsx` (FAB) + `features/assistant/*` + `stores/assistant.ts` | Se adapta solo la presentación. `useAssistant` (mutación a `/assistant/query`), citas y estados `NO_EVIDENCE/ERROR` intactos. El `useChat`/`MockChatGateway` de la referencia **no** se usa. |
| `adapters/*`, `ports/*`, `data/*` | `lib/*`, `stores/*` | **No se tocan.** La UI se adapta a la capa real. |

## 3. Conflictos de estilo y cómo se resuelven

| # | Conflicto | Resolución |
|---|---|---|
| C1 | Tipografía: la referencia usa Manrope; PLAN §9.1 fija **Space Grotesk + Plus Jakarta Sans** autohospedadas (§9.4, script `postinstall`, preload). | Se conserva la de PLAN (se considera obligatoria por estar en el sistema de diseño normativo y en la cadena de build). Anotado en PROGRESS. |
| C2 | PLAN §9.1 pide tarjeta con botón `+ AÑADIR` y contenedores `rounded-xl/2xl`. | Se sigue la instrucción explícita de esta adaptación: tarjeta **sin** botón y radio 2 px. Los tokens `--radius-*` pasan a 2 px; los círculos (`rounded-full`) se mantienen donde son círculos reales. |
| C3 | Badge de descuento: la referencia usa `-30%`; el E2E del catálogo cuenta exactamente 4 textos `^-\d+% OFF$`. | Se mantiene el texto `-X% OFF`, ahora como etiqueta tipográfica sin fondo. |
| C4 | Subnav de la referencia (RUNNING, ACCESORIOS) no tiene datos reales. | Subnav construido con filtros que sí existen en `/public/products`: `silhouette=LOW/HIGH` y `tags=retro/skate/basquet/clasico/gamuza`. |
| C5 | Mapeo de estados de Kast: en el store `idle` = sin petición en curso; la referencia lo dibuja dormido. Tras cada respuesta `useAssistant` vuelve a `idle`, lo que dormiría a Kast con el chat abierto. | `idle` se dibuja dormido (como pide la adaptación). En el drawer abierto, la **presentación** muestra `listening` mientras haya actividad y pasa a `idle` (dormido) tras 60 s sin actividad. El store y `useAssistant` no cambian. |
| C6 | Chat oscuro de la referencia vs drawer claro existente. | Drawer claro con la estética nueva (sin cajas, radio 2 px). El tema oscuro no es requisito de esta adaptación y cambiaría contraste de citas y estados. |
| C7 | Contraste: `#8A8A8A` y `#7FA03A` no cumplen AA en texto pequeño sobre `#F4F4F2`. | `muted` = `#6B6B69` y texto de oferta = `#5A7526`; el gris y el verde originales quedan para líneas e iconos. |
| C8 | Paleta `forest`/`navy` usada en ~40 componentes (incluido admin). | Se redefinen los valores de los tokens (`navy` → tinta `#111111`, `forest` → verde profundo `#1F3A2E`, `surface` → `#ECECEA`, `canvas` → `#F4F4F2`), así el admin hereda la paleta sin tocar su lógica. Hex sueltos de hover (`#1e423b`, `#1e293b`) se sustituyen por tokens en los componentes tocados. |

## 4. Kast: mapeo de estados

| Estado del store | Dibujo | Etiqueta |
|---|---|---|
| `idle` | Dormido: ojos cerrados (︶ ︶), respiración, Zzz | Descansando |
| `listening` | Despierto: ojos que siguen el cursor (spring), parpadeo cada 3–6 s; en táctil sigue el último toque | Te escucho |
| `thinking` | Ojos arriba a un lado, tres puntos | Pensando… |
| `speaking` | Ojos felices, leve rebote, boca animada | Respondiendo |
| `success` | Ojos felices + pulso de escala | ¡Listo! |
| `error` | Ojos en "x", sacudida corta | Algo salió mal |

- `prefers-reduced-motion`: sin respiración, rebote, sacudida ni seguimiento de ojos (`useReducedMotion` + `MotionConfig`/estilos estáticos).
- Se conserva `data-kast-state`, `role="img"` + `<title>` (contrato del test `KastBrand.test.tsx`).
- `KastStaticIcon` (sin `motion`, carga inicial) dibuja el mismo koala para que no haya salto visual al cargar el animado.

## 5. Riesgos

| Riesgo | Mitigación |
|---|---|
| Presupuesto de entrada (120 kB gzip; hoy 107,53 kB) | Header y logo alternante sin `motion`; hover de tarjetas y crossfade en CSS; `useEyeTracking` solo en el chunk de `KastMascot`. Medir con `size-limit` en cada área. |
| Arrastrar three/R3F/MediaPipe a rutas globales | No se añaden imports a `Header`, `Footer`, `StoreLayout`, `HomePage` ni `CatalogPage`; `ViewerToolbar` (sin three) sigue siendo el único import estático de `features/fitting` en el detalle. Revisar el grafo del build. |
| Romper selectores E2E | Se conservan `data-testid` (`product-card-*`, `final-price`, `original-price`, `kast-fab`, `citation-list`, `viewer3d-canvas-container`), labels y nombres accesibles ("Solo descuentos", "Ordenar productos", "Pedir por WhatsApp", "Talla 41", "Activar Visor 3D 360°", "Escribe tu pregunta para Kast", "Enviar pregunta a Kast"). |
| Placeholders que pidan archivos | El hover del placeholder alterna entre dos composiciones SVG inline; con `ready === false` no se construye ninguna URL. |
| CLS | Caja fija para el logo alternante; `aspect-[4/5]` reservado en tarjetas; header compacto con `height` en transición sin mover el contenido del `main`. |
| E2E no ejecutables aquí | Playwright necesita el stack Docker (backend + rag). Sin Docker, se verifica con Vitest, build, size-limit y revisión visual en `vite dev` con API simulada desde el navegador si hace falta. Queda anotado como pendiente. |
