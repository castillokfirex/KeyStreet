#!/usr/bin/env node
/**
 * Genera, desde scripts/catalog/catalog.json + assets/products/processed.json
 * + assets/models/manifest.json:
 *   - db/migrations/V002__catalogo_15_modelos.sql  (idempotente, sin meta-comandos psql)
 *   - docs/catalogo-fuentes.md                     (precios: fuente, URL y fecha)
 *   - docs/creditos-imagenes.md                    (atribuciones de imágenes)
 *
 * Uso: node catalog/build-catalog.mjs
 */
import { existsSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SCRIPTS, "..");
const read = async (p) => JSON.parse(await readFile(p, "utf8"));

const catalog = await read(path.join(SCRIPTS, "catalog", "catalog.json"));
const imagesManifest = await read(path.join(REPO, "assets", "products", "manifest.json"));
const processedPath = path.join(REPO, "assets", "products", "processed.json");
const processed = existsSync(processedPath) ? await read(processedPath) : {};
const models = (await read(path.join(REPO, "assets", "models", "manifest.json"))).models ?? {};

const T = catalog.tenantId;
const q = (v) => (v === null || v === undefined ? "NULL" : `'${String(v).replace(/'/g, "''")}'`);
const jsonb = (o) => `${q(JSON.stringify(o))}::jsonb`;
const textArray = (arr) => `ARRAY[${arr.map(q).join(", ")}]::text[]`;
const finalPrice = (price, pct) => (pct > 0 ? Math.floor((price * (100 - pct)) / 10000) * 100 : price);
const cop = (n) => `$${n.toLocaleString("es-CO")}`;

function careFor(upper) {
  if (/gamuza/i.test(upper)) return ["Cepillo para gamuza en seco", "Evitar el agua y el calor directo"];
  if (/lona/i.test(upper)) return ["Lavar a mano con jabón neutro", "Secar a la sombra"];
  if (/malla/i.test(upper)) return ["Limpiar con paño húmedo y jabón neutro", "No usar lavadora"];
  return ["Limpiar con paño húmedo", "No usar lavadora"];
}

function hotspots(specs) {
  return [
    { id: "upper", label: specs.upper, position: [0.02, 0.06, 0.05], normal: [0, 0, 1] },
    { id: "midsole", label: specs.midsole, position: [-0.09, 0.015, 0.04], normal: [0, 0, 1] },
    { id: "outsole", label: specs.outsole, position: [0, -0.01, 0], normal: [0, -1, 0] },
  ];
}

// ---------- validaciones previas ----------
const ACTIVE_COUNT = catalog.products.length;
const VARIANT_COUNT = ACTIVE_COUNT * 9;
const discounted = catalog.products.filter((p) => p.discountPercent > 0);
if (ACTIVE_COUNT < 1) throw new Error("El catálogo debe tener al menos un producto activo");
if (discounted.length !== 4 || discounted.some((p) => p.discountPercent < 10 || p.discountPercent > 15)) {
  throw new Error("Regla de descuentos: exactamente 4 productos entre 10% y 15%");
}
const missingImgs = catalog.products.filter((p) => !(processed[p.slug]?.ready && processed[p.slug]?.files?.length > 0));
if (missingImgs.length > 0) {
  throw new Error(`Productos sin imágenes activas: ${missingImgs.map((p) => p.slug).join(", ")}`);
}

const rows = catalog.products.map((p) => {
  const img = processed[p.slug] ?? { ready: false, files: [] };
  const model = models[p.slug];
  const ready3d = model?.status === "validado";
  const specs = {
    ...p.specs,
    care: careFor(p.specs.upper),
    palette: p.palette,
    hotspots: hotspots(p.specs),
  };
  const images = {
    basePath: `/assets/products/${p.slug}/`,
    files: img.ready ? img.files : [],
    aspect: "4/5",
    ready: Boolean(img.ready && img.files.length),
  };
  return `  (${[
    q(p.slug),
    q(p.brand),
    q(p.name),
    q(p.modelCode),
    q(p.silhouette),
    q(p.colorway),
    q(p.shortDescription),
    q(p.description),
    q(p.badge),
    p.originalPriceCop,
    p.discountPercent,
    q(ready3d ? model.url : `/assets/models/${p.slug}.glb`),
    ready3d ? "true" : "false",
    jsonb(images),
    jsonb(specs),
    textArray(p.styleTags),
  ].join(", ")})`;
});

const slugs = catalog.products.map((p) => q(p.slug)).join(", ");
const retired = catalog.retired.map((r) => q(r.slug)).join(", ");
const expectedFinal = discounted
  .map((p) => `(${q(p.slug)}, ${finalPrice(p.originalPriceCop, p.discountPercent)})`)
  .join(", ");

const sql = `-- =====================================================================
-- V002 — Catálogo de ${ACTIVE_COUNT} modelos activos (Key Street)
-- Generado por scripts/catalog/build-catalog.mjs — NO editar a mano.
--
-- Idempotente: se puede ejecutar varias veces sin duplicar filas.
--   * Marcas, productos y variantes con INSERT … ON CONFLICT DO UPDATE.
--   * Modelos fuera de la lista se desactivan (is_active = false), no se borran,
--     para conservar el historial de pedidos de WhatsApp.
-- Se ejecuta después de 02-seed.sql en bases nuevas (docker-entrypoint-initdb.d)
-- y a mano en bases existentes (ver PROGRESS.md › Bitácora).
-- Precios: ver docs/catalogo-fuentes.md (VERIFICADO vs PRUEBA).
-- =====================================================================
BEGIN;

-- ---------- Marcas ----------
INSERT INTO brands (tenant_id, name, slug, code) VALUES
${catalog.brands.map((b) => `  (${q(T)}, ${q(b.name)}, ${q(b.slug)}, ${q(b.code)})`).join(",\n")}
ON CONFLICT (tenant_id, code) DO UPDATE SET name = EXCLUDED.name, slug = EXCLUDED.slug;

-- ---------- ${ACTIVE_COUNT} productos ----------
INSERT INTO products (tenant_id, brand_id, name, slug, model_code, category, silhouette, colorway,
                      short_description, description, badge, original_price_cop, discount_percent,
                      model_3d_url, model_3d_ready, image_placeholder_paths, material_specs, style_tags,
                      is_active)
SELECT ${q(T)}, b.id, v.name, v.slug, v.model_code, 'SNEAKERS', v.silhouette, v.colorway,
       v.short_description, v.description, v.badge, v.price, v.discount,
       v.model_3d_url, v.model_3d_ready, v.images, v.specs, v.tags, true
FROM (VALUES
${rows.join(",\n")}
) AS v(slug, brand_code, name, model_code, silhouette, colorway, short_description, description, badge,
       price, discount, model_3d_url, model_3d_ready, images, specs, tags)
JOIN brands b ON b.tenant_id = ${q(T)} AND b.code = v.brand_code
ON CONFLICT (tenant_id, slug) DO UPDATE SET
  brand_id = EXCLUDED.brand_id,
  name = EXCLUDED.name,
  model_code = EXCLUDED.model_code,
  silhouette = EXCLUDED.silhouette,
  colorway = EXCLUDED.colorway,
  short_description = EXCLUDED.short_description,
  description = EXCLUDED.description,
  badge = EXCLUDED.badge,
  original_price_cop = EXCLUDED.original_price_cop,
  discount_percent = EXCLUDED.discount_percent,
  model_3d_url = EXCLUDED.model_3d_url,
  model_3d_ready = EXCLUDED.model_3d_ready,
  image_placeholder_paths = EXCLUDED.image_placeholder_paths,
  material_specs = EXCLUDED.material_specs,
  style_tags = EXCLUDED.style_tags,
  is_active = true,
  updated_at = now();

-- ---------- Modelos retirados de la lista ----------
UPDATE products SET is_active = false, updated_at = now()
WHERE tenant_id = ${q(T)} AND slug IN (${retired});

UPDATE product_variants v SET is_active = false, updated_at = now()
FROM products p
WHERE p.id = v.product_id AND p.tenant_id = v.tenant_id
  AND p.tenant_id = ${q(T)} AND p.slug IN (${retired});

-- ---------- Variantes: tallas 36–44 con la regla de stock del proyecto ----------
INSERT INTO product_variants (tenant_id, product_id, sku, size_eu, stock)
SELECT p.tenant_id, p.id, 'KS-' || b.code || '-' || p.model_code || '-' || s.size, s.size,
       3 + abs(hashtext(p.slug || s.size::text)) % 10
FROM products p
JOIN brands b ON b.tenant_id = p.tenant_id AND b.id = p.brand_id
CROSS JOIN generate_series(36, 44) AS s(size)
WHERE p.tenant_id = ${q(T)} AND p.slug IN (${slugs})
ON CONFLICT (product_id, size_eu) DO UPDATE SET
  sku = EXCLUDED.sku,
  is_active = true,
  updated_at = now();

-- ---------- Verificación (falla la transacción si algo no cuadra) ----------
DO $$
DECLARE n int;
BEGIN
  SELECT count(*) INTO n FROM products WHERE tenant_id = ${q(T)} AND is_active;
  IF n <> ${ACTIVE_COUNT} THEN RAISE EXCEPTION 'V002: se esperaban ${ACTIVE_COUNT} productos activos, hay %', n; END IF;

  SELECT count(*) INTO n FROM products WHERE tenant_id = ${q(T)} AND is_active AND has_discount;
  IF n <> 4 THEN RAISE EXCEPTION 'V002: se esperaban 4 descuentos activos, hay %', n; END IF;
  IF EXISTS (SELECT 1 FROM products WHERE tenant_id = ${q(T)} AND is_active AND has_discount
             AND discount_percent NOT BETWEEN 10 AND 15) THEN
    RAISE EXCEPTION 'V002: descuento fuera de 10%%-15%%'; END IF;
  IF (SELECT count(*) FROM products WHERE tenant_id = ${q(T)} AND (slug, final_price_cop) IN (${expectedFinal})) <> 4 THEN
    RAISE EXCEPTION 'V002: precios finales con descuento inesperados'; END IF;

  SELECT count(*) INTO n FROM product_variants v JOIN products p ON p.id = v.product_id
  WHERE p.tenant_id = ${q(T)} AND p.is_active AND v.is_active;
  IF n <> ${VARIANT_COUNT} THEN RAISE EXCEPTION 'V002: se esperaban ${VARIANT_COUNT} variantes activas (${ACTIVE_COUNT} x 9), hay %', n; END IF;

  IF EXISTS (SELECT 1 FROM products WHERE tenant_id = ${q(T)} AND is_active
             AND NOT COALESCE((image_placeholder_paths->>'ready')::boolean, false)) THEN
    RAISE EXCEPTION 'V002: hay producto activo sin imágenes'; END IF;

  IF EXISTS (SELECT 1 FROM products WHERE tenant_id = ${q(T)} AND is_active
             AND (image_placeholder_paths->>'ready')::boolean
             AND jsonb_array_length(image_placeholder_paths->'files') = 0) THEN
    RAISE EXCEPTION 'V002: producto con ready=true sin archivos'; END IF;

  IF EXISTS (SELECT 1 FROM products WHERE tenant_id = ${q(T)} AND is_active
             AND model_3d_ready AND model_3d_url IS NULL) THEN
    RAISE EXCEPTION 'V002: modelo 3D listo sin URL'; END IF;
END $$;

COMMIT;
`;
await writeFile(path.join(REPO, "db", "migrations", "V002__catalogo_15_modelos.sql"), sql);

// ---------- docs/catalogo-fuentes.md ----------
const priceRows = catalog.products.map((p) => {
  const pr = p.price;
  const fin = finalPrice(p.originalPriceCop, p.discountPercent);
  const source = pr.url ? `[${pr.store}](${pr.url})` : pr.store;
  return `| ${p.name} | \`${p.slug}\` | ${cop(p.originalPriceCop)} | ${p.discountPercent ? `-${p.discountPercent}% → ${cop(fin)}` : "—"} | **${pr.status}** | ${source} | ${pr.reference ?? "—"} | ${pr.checkedAt} |`;
});
const fuentes = `# Catálogo de ${ACTIVE_COUNT} modelos: fuentes de precio

Generado por \`scripts/catalog/build-catalog.mjs\` a partir de [\`scripts/catalog/catalog.json\`](../scripts/catalog/catalog.json). Fecha de consulta: ${catalog.checkedAt}.

- **VERIFICADO:** precio de lista vigente (precio regular, sin promociones temporales de la tienda) en la tienda oficial de la marca en Colombia, consultado en la URL indicada. Si la tienda tenía una oferta ese día, se anota abajo, pero no se usa como precio base.
- **PRUEBA:** no se encontró un precio verificable en una tienda oficial o distribuidor oficial en Colombia. **Es un precio de prueba, no un precio real**; debe reemplazarse antes de vender.
- **Descuentos:** la regla de negocio se mantiene en 4 modelos activos con descuento automático de 10% a 15%. El precio final lo calcula la base de datos (redondeo a la centena inferior).

| Modelo | Slug | Precio base COP | Descuento → final | Estado | Fuente | Referencia | Consulta |
|---|---|---|---|---|---|---|---|
${priceRows.join("\n")}

## Notas por modelo

${catalog.products
  .filter((p) => p.price.status === "PRUEBA" || (p.price.currentPriceCop && p.price.currentPriceCop !== p.price.listPriceCop) || /no está publicado|precio de lista del modelo|versión vigente/.test(p.price.reference ?? ""))
  .map((p) => {
    const pr = p.price;
    if (pr.status === "PRUEBA") return `- **${p.name}:** PRUEBA. ${pr.store}`;
    const notes = [];
    if (pr.currentPriceCop && pr.currentPriceCop !== pr.listPriceCop) notes.push(`la tienda tenía una oferta temporal a ${cop(pr.currentPriceCop)}`);
    if (/no está publicado|precio de lista del modelo|versión vigente/.test(pr.reference ?? "")) notes.push(`referencia usada: ${pr.reference}`);
    return `- **${p.name}:** ${notes.join("; ")}.`;
  })
  .join("\n")}

## Modelos retirados del catálogo activo

${catalog.retired.map((r) => `- \`${r.slug}\`: ${r.reason}`).join("\n")}
`;
await writeFile(path.join(REPO, "docs", "catalogo-fuentes.md"), fuentes);

// ---------- docs/creditos-imagenes.md ----------
const creditRows = [];
const pendingRows = [];
for (const p of catalog.products) {
  const entry = imagesManifest.products[p.slug];
  if (!entry || entry.status !== "ready" || !(processed[p.slug]?.ready)) {
    pendingRows.push(`- **${p.name}** (\`${p.slug}\`): ${entry?.pendingReason ?? "imágenes pendientes de procesar"}`);
    continue;
  }
  for (const im of entry.images) {
    const licenseLink = im.licenseUrl ? `[${im.license}](${im.licenseUrl})` : im.license;
    creditRows.push(
      `| ${p.name} | \`${im.file}\` (${im.role}) | [${im.title.replace(/^File:/, "")}](${im.url}) | ${im.author} | ${licenseLink} | ${im.retrievedAt} |`,
    );
  }
}
const creditos = `# Créditos de imágenes de producto

Generado por \`scripts/catalog/build-catalog.mjs\` desde [\`assets/products/manifest.json\`](../assets/products/manifest.json).

**Fuentes permitidas** (en este orden): fotos propias en \`assets/products/originales/\` (con autorización de distribuidor), Unsplash/Pexels vía API, y Wikimedia Commons solo con CC0, CC BY o CC BY-SA. Ninguna imagen proviene de tiendas, marcas ni buscadores.

**Modificaciones:** todas las imágenes fueron recortadas, con fondo eliminado (rembg, local), recompuestas sobre fondo gris #ECECEA en proporción 4:5, en algunos casos espejadas, y exportadas en AVIF/WebP (480/960/1440 px) con \`scripts/process-images\`.

**Licencias de las obras derivadas:**
- CC BY / CC BY-SA: se atribuye a la autoría original. Las derivadas de material CC BY-SA se distribuyen bajo la misma licencia CC BY-SA (misma versión).
- CC0: no requiere atribución; se acredita igualmente por transparencia.
- Las marcas y logotipos visibles en el calzado pertenecen a sus titulares. Su presencia en las fotos no implica patrocinio.

| Producto | Archivo | Fuente (Wikimedia Commons) | Autor | Licencia | Consulta |
|---|---|---|---|---|---|
${creditRows.join("\n")}

## Productos sin imágenes válidas (placeholder, \`images.ready = false\`)

${pendingRows.length ? pendingRows.join("\n") : "_Ninguno: el 100% de los modelos activos cuenta con imágenes de estudio listas._"}

Unsplash y Pexels no se consultaron: no hay \`UNSPLASH_ACCESS_KEY\` ni \`PEXELS_API_KEY\` en \`.env\`.
`;
await writeFile(path.join(REPO, "docs", "creditos-imagenes.md"), creditos);

console.log("Generados: db/migrations/V002__catalogo_15_modelos.sql, docs/catalogo-fuentes.md, docs/creditos-imagenes.md");
console.log(`Productos con imágenes: ${catalog.products.filter((p) => processed[p.slug]?.ready).length}/${ACTIVE_COUNT} · 3D validados: ${catalog.products.filter((p) => models[p.slug]?.status === "validado").length}/${ACTIVE_COUNT}`);
