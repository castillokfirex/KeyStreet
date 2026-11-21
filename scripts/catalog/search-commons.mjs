#!/usr/bin/env node
/**
 * Descubre fotos candidatas en Wikimedia Commons para cada producto.
 *
 * - Solo acepta licencias CC0, CC BY y CC BY-SA (cualquier versión).
 * - No descarga originales: solo miniaturas para revisión visual.
 * - Salida (no versionada): scripts/.cache/commons/{slug}/candidates.json
 *   y una hoja de contactos {slug}.jpg numerada por posición (fila-col).
 *
 * La selección final se registra a mano en assets/products/manifest.json
 * tras verificar que cada imagen muestra ESE modelo.
 *
 * Uso: node catalog/search-commons.mjs [slug ...]
 */
import { mkdir, readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const CACHE = path.join(ROOT, ".cache", "commons");
const API = "https://commons.wikimedia.org/w/api.php";
const UA = "CatalogImageScript/1.0 (license-checked catalog assets)";

export const ALLOWED_LICENSE = /^(cc0( 1\.0)?|cc[ -]by( [0-9.]+)?|cc[ -]by-sa( [0-9.]+)?)$/i;

const stripHtml = (value = "") =>
  value.replace(/<[^>]*>/g, "").replace(/\s+/g, " ").trim();

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(params) {
  const url = `${API}?${new URLSearchParams({ format: "json", formatversion: "2", maxlag: "5", ...params })}`;
  for (let attempt = 0; attempt < 6; attempt++) {
    await sleep(800); // cortesía con la API (evita 429)
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok) return res.json();
    await sleep(4000 * (attempt + 1));
  }
  throw new Error(`Commons API falló: ${url}`);
}

async function safe(fn, label) {
  try {
    return await fn();
  } catch (err) {
    console.warn(`  aviso: ${label} omitido (${err.message.slice(0, 80)})`);
    return [];
  }
}

const IMAGEINFO = {
  prop: "imageinfo",
  iiprop: "url|size|mime|extmetadata",
  iiurlwidth: "320",
};

async function fromCategory(category) {
  const data = await api({
    action: "query",
    generator: "categorymembers",
    gcmtitle: `Category:${category}`,
    gcmtype: "file",
    gcmlimit: "60",
    ...IMAGEINFO,
  });
  return data.query?.pages ?? [];
}

async function fromSearch(query) {
  const data = await api({
    action: "query",
    generator: "search",
    gsrsearch: `${query} filetype:bitmap`,
    gsrnamespace: "6",
    gsrlimit: "40",
    ...IMAGEINFO,
  });
  return data.query?.pages ?? [];
}

function toCandidate(page) {
  const info = page.imageinfo?.[0];
  if (!info) return null;
  const meta = info.extmetadata ?? {};
  const license = stripHtml(meta.LicenseShortName?.value);
  if (!ALLOWED_LICENSE.test(license)) return null;
  if (!/^image\/(jpeg|png|webp)$/.test(info.mime)) return null;
  if (Math.max(info.width, info.height) < 700) return null;
  return {
    title: page.title,
    pageUrl: info.descriptionurl,
    originalUrl: info.url,
    thumbUrl: info.thumburl,
    width: info.width,
    height: info.height,
    license,
    licenseUrl: meta.LicenseUrl?.value ?? null,
    author: stripHtml(meta.Artist?.value) || "Desconocido",
    credit: stripHtml(meta.Credit?.value),
    description: stripHtml(meta.ImageDescription?.value).slice(0, 240),
    restrictions: stripHtml(meta.Restrictions?.value),
  };
}

async function contactSheet(candidates, outFile) {
  const cell = 300;
  const cols = 5;
  const rows = Math.max(1, Math.ceil(candidates.length / cols));
  const tiles = [];
  for (const [i, c] of candidates.entries()) {
    try {
      const res = await fetch(c.thumbUrl, { headers: { "User-Agent": UA } });
      const buf = Buffer.from(await res.arrayBuffer());
      const img = await sharp(buf)
        .resize(cell - 8, cell - 28, { fit: "contain", background: "#ffffff" })
        .toBuffer();
      const label = Buffer.from(
        `<svg width="${cell - 8}" height="24"><rect width="100%" height="100%" fill="#111"/><text x="6" y="17" font-family="Arial, sans-serif" font-size="15" fill="#fff">#${i} ${c.license}</text></svg>`,
      );
      tiles.push({ input: label, left: (i % cols) * cell + 4, top: Math.floor(i / cols) * cell + 4 });
      tiles.push({ input: img, left: (i % cols) * cell + 4, top: Math.floor(i / cols) * cell + 28 });
    } catch {
      /* miniatura no disponible: se omite */
    }
  }
  await sharp({
    create: { width: cols * cell, height: rows * cell, channels: 3, background: "#dddddd" },
  })
    .composite(tiles)
    .jpeg({ quality: 82 })
    .toFile(outFile);
}

async function main() {
  const config = JSON.parse(await readFile(path.join(ROOT, "catalog", "image-search.json"), "utf8"));
  const only = new Set(process.argv.slice(2));
  for (const model of config.models) {
    if (only.size && !only.has(model.slug)) continue;
    const pages = [];
    for (const category of model.categories) {
      pages.push(...(await safe(() => fromCategory(category), `categoría ${category}`)));
    }
    for (const query of model.queries) {
      pages.push(...(await safe(() => fromSearch(query), `búsqueda ${query}`)));
    }

    const seen = new Set();
    const candidates = [];
    for (const page of pages) {
      if (seen.has(page.title)) continue;
      seen.add(page.title);
      const candidate = toCandidate(page);
      if (candidate) candidates.push(candidate);
    }
    const limited = candidates.slice(0, 40);
    const dir = path.join(CACHE, model.slug);
    await mkdir(dir, { recursive: true });
    await writeFile(path.join(dir, "candidates.json"), JSON.stringify(limited, null, 2));
    if (limited.length) await contactSheet(limited, path.join(CACHE, `${model.slug}.jpg`));
    console.log(`${model.slug}: ${pages.length} resultados → ${limited.length} con licencia válida`);
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
