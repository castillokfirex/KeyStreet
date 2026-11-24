#!/usr/bin/env node
/**
 * Pipeline reproducible de imágenes de producto (Key Street).
 *
 * Lee assets/products/manifest.json y, para cada imagen con licencia válida:
 *   1. Descarga el original (o usa assets/products/originales/ si es propio).
 *   2. Aplica recorte/giro declarados en el manifest (process.crop / process.flip).
 *   3. Quita el fondo con rembg (local) → recorta el contorno transparente.
 *   4. Compone sobre el gris del token --color-surface (#ECECEA), 4:5,
 *      zapato centrado con el mismo margen y sombra de contacto suave.
 *   5. Exporta 480/960/1440 px en AVIF + WebP: {slug}-{n}.{w}.{ext}.
 *   6. Escribe assets/products/processed.json (lo consume build-catalog).
 *
 * Uso:
 *   node process-images/process-images.mjs            # todo
 *   node process-images/process-images.mjs --preview  # solo originales + hoja con cuadrícula
 *   node process-images/process-images.mjs slug ...   # solo esos productos
 *
 * Requisitos: npm i (scripts/), y rembg en scripts/.cache/venv-rembg
 *   uv venv --python 3.13 scripts/.cache/venv-rembg
 *   uv pip install --python scripts/.cache/venv-rembg/Scripts/python.exe "rembg[cpu]"
 */
import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SCRIPTS, "..");
const CACHE = path.join(SCRIPTS, ".cache");
const MANIFEST = path.join(REPO, "assets", "products", "manifest.json");
const ORIGINALES = path.join(REPO, "assets", "products", "originales");
const PROCESSED = path.join(REPO, "assets", "products", "processed.json");
const OUT_ROOT = path.join(REPO, "frontend", "public", "assets", "products");
const PYTHON = path.join(CACHE, "venv-rembg", process.platform === "win32" ? "Scripts/python.exe" : "bin/python");
const UA = "CatalogImageScript/1.0 (license-checked catalog assets)";

/** Geometría común: mismo encuadre para todo el catálogo. */
const CANVAS = { width: 1440, height: 1800 };
const CONTENT_BOX = { width: 0.8, height: 0.6 }; // fracción máx. del lienzo
const CENTER_Y = 0.5; // centro vertical del zapato
const WIDTHS = [480, 960, 1440];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/** Descarga con ritmo respetuoso (1 petición cada 8 s) y como máximo 3 intentos. */
async function download(url, dest) {
  if (existsSync(dest)) return true;
  for (let attempt = 0; attempt < 3; attempt++) {
    await sleep(8000);
    const res = await fetch(url, { headers: { "User-Agent": UA } });
    if (res.ok && /^image\//.test(res.headers.get("content-type") ?? "")) {
      await writeFile(dest, Buffer.from(await res.arrayBuffer()));
      return true;
    }
    console.warn(`  ${res.status} al descargar ${path.basename(dest)} (intento ${attempt + 1}/3)`);
    await sleep(res.status === 429 ? 60000 : 5000);
  }
  return false; // se marca como pendiente; nunca se deja una ruta rota
}

/**
 * URL de descarga en Wikimedia Commons: thumb.php (punto de entrada estándar
 * de MediaWiki para miniaturas) con ancho ≤ 1920 px, suficiente para la salida 1440.
 */
function commonsDownloadUrl(image) {
  const [width] = (image.originalSize ?? "0x0").split("x").map(Number);
  const name = image.title.replace(/^File:/, "").replace(/ /g, "_");
  const target = Math.min(1920, width || 1920);
  return `https://commons.wikimedia.org/w/thumb.php?f=${encodeURIComponent(name)}&width=${target}`;
}

/** Original local: propio (originales/) o descargado de la fuente licenciada. */
async function originalFor(slug, image) {
  const own = path.join(ORIGINALES, slug, `${image.n}.jpg`);
  if (image.source === "propio" && existsSync(own)) return own;
  const dir = path.join(CACHE, "originals", slug);
  await mkdir(dir, { recursive: true });
  const url = commonsDownloadUrl(image);
  const ext = path.extname(new URL(image.originalUrl).pathname).toLowerCase() || ".jpg";
  const dest = path.join(dir, `${image.n}${ext}`);
  return (await download(url, dest)) ? dest : null;
}

/** Recorte (fracciones 0..1) y reducción para acelerar rembg. */
async function prepare(src, dest, process) {
  let img = sharp(src).rotate(); // respeta EXIF
  const meta = await img.metadata();
  const w = meta.autoOrient?.width ?? meta.width;
  const h = meta.autoOrient?.height ?? meta.height;
  if (process.crop) {
    const { left = 0, top = 0, right = 1, bottom = 1 } = process.crop;
    img = sharp(await img.toBuffer()).extract({
      left: Math.round(left * w),
      top: Math.round(top * h),
      width: Math.round((right - left) * w),
      height: Math.round((bottom - top) * h),
    });
  }
  await img.resize({ width: 2400, height: 2400, fit: "inside", withoutEnlargement: true }).png().toFile(dest);
}

async function previewSheet(entries, outFile) {
  const cell = 420;
  const cols = 4;
  const rows = Math.ceil(entries.length / cols);
  const tiles = [];
  for (const [i, e] of entries.entries()) {
    const img = await sharp(e.file).rotate().resize(cell - 10, cell - 40, { fit: "contain", background: "#ffffff" }).toBuffer();
    const meta = await sharp(img).metadata();
    const grid = Array.from({ length: 9 }, (_, k) => {
      const x = Math.round(((k + 1) / 10) * meta.width);
      const y = Math.round(((k + 1) / 10) * meta.height);
      return `<line x1="${x}" y1="0" x2="${x}" y2="${meta.height}" stroke="#ff0066" stroke-width="1" opacity="0.55"/><line x1="0" y1="${y}" x2="${meta.width}" y2="${y}" stroke="#ff0066" stroke-width="1" opacity="0.55"/>`;
    }).join("");
    const overlay = Buffer.from(`<svg width="${meta.width}" height="${meta.height}">${grid}</svg>`);
    const gridded = await sharp(img).composite([{ input: overlay }]).toBuffer();
    const label = Buffer.from(
      `<svg width="${cell - 10}" height="28"><rect width="100%" height="100%" fill="#111"/><text x="6" y="19" font-family="Arial" font-size="15" fill="#fff">${e.label}</text></svg>`,
    );
    const x = (i % cols) * cell + 5;
    const y = Math.floor(i / cols) * cell + 5;
    tiles.push({ input: label, left: x, top: y }, { input: gridded, left: x, top: y + 32 });
  }
  await sharp({ create: { width: cols * cell, height: rows * cell, channels: 3, background: "#cccccc" } })
    .composite(tiles)
    .jpeg({ quality: 80 })
    .toFile(outFile);
}

/** Compone el recorte transparente en el lienzo 4:5 normalizado. */
async function compose(cutoutPng, flip) {
  let cut = sharp(cutoutPng).ensureAlpha();
  if (flip) cut = cut.flop();
  // recorta el borde transparente (umbral bajo para conservar sombras suaves del objeto)
  const trimmed = await sharp(await cut.png().toBuffer()).trim({ threshold: 8 }).png().toBuffer();
  const meta = await sharp(trimmed).metadata();
  const maxW = CANVAS.width * CONTENT_BOX.width;
  const maxH = CANVAS.height * CONTENT_BOX.height;
  const scale = Math.min(maxW / meta.width, maxH / meta.height);
  const w = Math.round(meta.width * scale);
  const h = Math.round(meta.height * scale);
  const shoe = await sharp(trimmed).resize(w, h, { kernel: "lanczos3" }).png().toBuffer();
  const left = Math.round((CANVAS.width - w) / 2);
  const top = Math.round(CANVAS.height * CENTER_Y - h / 2);

  // sombra de contacto: elipse difusa bajo la base del objeto
  const shadowW = Math.round(w * 0.86);
  const shadowH = Math.max(18, Math.round(CANVAS.height * 0.018));
  const shadow = await sharp(
    Buffer.from(
      `<svg width="${shadowW + 120}" height="${shadowH + 120}"><ellipse cx="${(shadowW + 120) / 2}" cy="${(shadowH + 120) / 2}" rx="${shadowW / 2}" ry="${shadowH / 2}" fill="#111111" fill-opacity="0.16"/></svg>`,
    ),
  )
    .blur(14)
    .png()
    .toBuffer();

  return sharp({ create: { ...CANVAS, channels: 3, background: "#ECECEA" } })
    .composite([
      {
        input: shadow,
        left: Math.round(CANVAS.width / 2 - (shadowW + 120) / 2),
        top: Math.round(top + h - (shadowH + 120) / 2 - shadowH * 0.15),
      },
      { input: shoe, left, top },
    ])
    .png()
    .toBuffer();
}

async function main() {
  const args = process.argv.slice(2);
  const previewOnly = args.includes("--preview");
  const only = new Set(args.filter((a) => !a.startsWith("--")));
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  const processed = existsSync(PROCESSED) ? JSON.parse(await readFile(PROCESSED, "utf8")) : {};

  const work = [];
  for (const [slug, product] of Object.entries(manifest.products)) {
    if (only.size && !only.has(slug)) continue;
    if (product.status !== "ready" || !product.images.length) {
      processed[slug] = { ready: false, files: [], reason: product.pendingReason ?? "sin imágenes válidas" };
      continue;
    }
    for (const image of product.images) {
      const original = await originalFor(slug, image);
      if (!original) {
        console.warn(`  ${slug} #${image.n}: original no disponible; se omite`);
        continue;
      }
      work.push({ slug, image, original });
    }
  }

  // Un producto solo queda listo si tiene al menos su imagen principal
  const withPrimary = new Set(work.filter((w) => w.image.n === 1).map((w) => w.slug));
  for (const slug of new Set(work.map((w) => w.slug))) {
    if (!withPrimary.has(slug)) processed[slug] = { ready: false, files: [], reason: "imagen principal no disponible" };
  }
  work.splice(0, work.length, ...work.filter((w) => withPrimary.has(w.slug)));

  if (previewOnly) {
    await mkdir(path.join(CACHE, "qa"), { recursive: true });
    const out = path.join(CACHE, "qa", "originales-grid.jpg");
    await previewSheet(work.map((w) => ({ file: w.original, label: `${w.slug} #${w.image.n} (${w.image.role})` })), out);
    console.log(`Hoja de originales con cuadrícula al 10%: ${out}`);
    return;
  }

  // 1) preparar (recorte) y quitar fondo en un solo lote
  const prepDir = path.join(CACHE, "prepped");
  const cutDir = path.join(CACHE, "cutouts");
  await mkdir(prepDir, { recursive: true });
  await mkdir(cutDir, { recursive: true });
  const pairs = [];
  for (const w of work) {
    w.prepped = path.join(prepDir, `${w.slug}-${w.image.n}.png`);
    w.cutout = path.join(cutDir, `${w.slug}-${w.image.n}.png`);
    await prepare(w.original, w.prepped, w.image.process ?? {});
    if (w.image.process?.removeBackground === false) {
      await sharp(w.prepped).png().toFile(w.cutout);
    } else {
      pairs.push([w.prepped, w.cutout, w.image.process?.model ?? null]);
    }
  }
  if (pairs.length) {
    const pairsFile = path.join(CACHE, "rembg-pairs.json");
    await writeFile(pairsFile, JSON.stringify(pairs));
    execFileSync(PYTHON, [path.join(SCRIPTS, "process-images", "remove_bg.py"), pairsFile], { stdio: "inherit" });
  }

  // 2) componer y exportar
  const bySlug = new Map();
  for (const w of work) {
    const outDir = path.join(OUT_ROOT, w.slug);
    if (!bySlug.has(w.slug)) {
      await rm(outDir, { recursive: true, force: true });
      await mkdir(outDir, { recursive: true });
      bySlug.set(w.slug, []);
    }
    const master = await compose(w.cutout, Boolean(w.image.process?.flip));
    for (const width of WIDTHS) {
      const height = Math.round((width * CANVAS.height) / CANVAS.width);
      const base = path.join(outDir, `${w.image.file}.${width}`);
      const resized = sharp(master).resize(width, height, { kernel: "lanczos3" });
      await resized.clone().avif({ quality: 55, effort: 5 }).toFile(`${base}.avif`);
      await resized.clone().webp({ quality: 80, effort: 5 }).toFile(`${base}.webp`);
    }
    bySlug.get(w.slug).push(`${w.image.file}.960.webp`);
    console.log(`listo ${w.slug} #${w.image.n}`);
  }
  for (const [slug, files] of bySlug) processed[slug] = { ready: true, files };

  await writeFile(PROCESSED, `${JSON.stringify(processed, null, 2)}\n`);

  // 3) hoja de QA de todas las salidas (revisión visual de encuadre y fondo)
  await mkdir(path.join(CACHE, "qa"), { recursive: true });
  const qa = [...bySlug].flatMap(([slug, files]) =>
    files.map((f) => ({ file: path.join(OUT_ROOT, slug, f), label: f.replace(".960.webp", "") })),
  );
  if (qa.length) await previewSheet(qa, path.join(CACHE, "qa", "salidas-grid.jpg"));
  console.log(`processed.json actualizado (${bySlug.size} productos con imágenes)`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
