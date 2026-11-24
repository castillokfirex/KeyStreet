#!/usr/bin/env node
/**
 * Consulta precios vigentes en COP en tiendas oficiales que usan la API
 * pública de catálogo VTEX (solo lectura de precios; no descarga imágenes).
 *
 * Uso: node catalog/fetch-prices-vtex.mjs
 * Salida: tabla por consola + scripts/.cache/prices-vtex.json
 */
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36";

/** Búsquedas por producto: tienda VTEX, término y referencia preferida. */
const NIKE = "https://www.nike.com.co";
/** Excluye tallas infantiles para comparar el mismo producto de adulto. */
const KIDS = /niñ|kids|bebé|beb[eé]s|pequeñ|infantil|\(gs\)|\(ps\)|\(td\)/i;

const QUERIES = [
  { slug: "nike-air-force-1-low-07-blanco", store: NIKE, refs: ["CW2288-111"], ft: "air force 1 07", match: /air force 1 '07$/i },
  { slug: "nike-dunk-low-retro-panda", store: NIKE, refs: ["DD1391-100"], ft: "dunk low retro", match: /dunk low retro$/i },
  { slug: "air-jordan-1-low", store: NIKE, refs: ["553558-141", "553558-140"], ft: "air jordan 1 low", match: /^air jordan 1 low$/i },
  { slug: "air-jordan-4", store: NIKE, refs: ["FV5029-100", "DH6927-112"], ft: "air jordan 4 retro", match: /air jordan 4 retro/i },
  { slug: "nike-court-vision-low", store: NIKE, refs: ["DH2987-101", "CD5463-101"], ft: "court vision low", match: /court vision low/i },
];

async function search(store, ft, byRef = false) {
  // VTEX espera %20 (no "+"); la referencia se busca con fq=alternateIds_RefId
  const filter = byRef
    ? `fq=${encodeURIComponent(`alternateIds_RefId:${ft}`)}`
    : `ft=${encodeURIComponent(ft)}`;
  const url = `${store}/api/catalog_system/pub/products/search?${filter}&_from=0&_to=49`;
  const res = await fetch(url, { headers: { "User-Agent": UA, Accept: "application/json" } });
  if (!res.ok && res.status !== 206) throw new Error(`${res.status} ${url}`);
  return res.json();
}

const offerOf = (product) => {
  for (const item of product.items ?? []) {
    for (const seller of item.sellers ?? []) {
      const offer = seller.commertialOffer;
      if (offer?.ListPrice > 0) return offer;
    }
  }
  return null;
};

async function main() {
  const checkedAt = new Date().toISOString().slice(0, 10);
  const results = [];
  for (const q of QUERIES) {
    const isAdult = (p) => !KIDS.test(`${p.productName} ${p.productTitle ?? ""} ${p.linkText}`);
    let preferred = null;
    let matchedBy = "nombre";
    // 1) referencia exacta del colorway clásico
    for (const ref of q.refs ?? []) {
      const byRef = (await search(q.store, ref, true)).filter(
        (p) => p.productReference === ref && isAdult(p),
      );
      if (byRef.length) {
        preferred = byRef[0];
        matchedBy = `referencia ${ref}`;
        break;
      }
    }
    // 2) mismo modelo de adulto (otra referencia del colorway)
    if (!preferred) {
      const products = (await search(q.store, q.ft)).filter(
        (p) => q.match.test(p.productName.trim()) && isAdult(p),
      );
      // misma silueta de hombre si existe (catálogo unisex con precio de referencia de hombre)
      preferred = products.find((p) => /hombre/i.test(p.productTitle ?? "")) ?? products[0] ?? null;
    }
    if (!preferred) {
      results.push({ slug: q.slug, found: false, store: q.store, query: q.ft, checkedAt });
      console.log(`${q.slug}: sin coincidencia en ${q.store}`);
      continue;
    }
    const offer = offerOf(preferred);
    const entry = {
      slug: q.slug,
      found: true,
      name: preferred.productName,
      title: preferred.productTitle,
      reference: preferred.productReference,
      matchedBy,
      listPriceCop: Math.round(offer?.ListPrice ?? 0),
      currentPriceCop: Math.round(offer?.Price ?? 0),
      available: (offer?.AvailableQuantity ?? 0) > 0,
      url: `${q.store}/${preferred.linkText}/p`,
      checkedAt,
    };
    results.push(entry);
    console.log(
      `${q.slug}: ${entry.name} [${entry.reference}, por ${matchedBy}] lista $${entry.listPriceCop.toLocaleString("es-CO")} · actual $${entry.currentPriceCop.toLocaleString("es-CO")} · ${entry.title ?? ""} · ${entry.url}`,
    );
  }
  await mkdir(path.join(ROOT, ".cache"), { recursive: true });
  await writeFile(path.join(ROOT, ".cache", "prices-vtex.json"), JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
