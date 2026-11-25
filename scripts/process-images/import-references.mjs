#!/usr/bin/env node
/**
 * Procesa las imágenes de referencia limpias en assets/models/references/{slug}/
 * y reemplaza las fotos del catálogo en frontend/public/assets/products/{slug}/
 * en 480/960/1440 px AVIF + WebP sobre #ECECEA (4:5).
 */
import { existsSync } from "node:fs";
import { mkdir, readdir, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import sharp from "sharp";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SCRIPTS, "..");
const REF_ROOT = path.join(REPO, "assets", "models", "references");
const OUT_ROOT = path.join(REPO, "frontend", "public", "assets", "products");

const CANVAS = { width: 1440, height: 1800 };
const CONTENT_BOX = { width: 0.8, height: 0.6 };
const WIDTHS = [480, 960, 1440];
const SURFACE_RGB = { r: 236, g: 236, b: 234 }; // #ECECEA

const SLUG_PICKS = {
  "nike-air-force-1-low-07-blanco": ["01-", "02-", "08-", "07-"],
  "adidas-samba-og-blanco-negro": ["01-", "02-", "09-", "08-"],
  "adidas-campus-00s": ["01-", "02-", "10-", "09-"],
  "adidas-superstar": ["01-", "02-", "08-", "07-"],
  "adidas-stan-smith": ["01-", "02-", "08-", "07-"],
  "air-jordan-4": ["01-", "02-", "08-", "09-"],
  "new-balance-550": ["01-", "03-", "07-", "06-"],
  "new-balance-530": ["01-", "02-", "09-", "08-"],
  "nike-dunk-low-retro-panda": ["01-", "02-", "09-", "08-"],
  "puma-suede-xl": ["01-", "02-", "09-", "08-"],
  "vans-old-skool": ["01-", "02-", "08-", "07-"],
  "converse-chuck-taylor-all-star-clasico": ["01-", "02-", "08-", "07-"],
};

/** Quita el fondo blanco exterior mediante flood-fill desde los bordes. */
async function cutoutWhiteStudio(inputPath) {
  const rawImg = sharp(inputPath).rotate();
  const meta = await rawImg.metadata();
  const cropH = Math.max(100, Math.round((meta.height ?? 600) * 0.86));
  const { data, info } = await rawImg
    .extract({ left: 0, top: 0, width: meta.width ?? 600, height: cropH })
    .ensureAlpha()
    .raw()
    .toBuffer({ resolveWithObject: true });

  const w = info.width;
  const h = info.height;
  const visited = new Uint8Array(w * h);
  const queue = new Int32Array(w * h);
  let head = 0;
  let tail = 0;

  const isBg = (idx) => {
    const o = idx * 4;
    const r = data[o];
    const g = data[o + 1];
    const b = data[o + 2];
    const maxC = Math.max(r, g, b);
    const minC = Math.min(r, g, b);
    return minC >= 235 && maxC - minC <= 18;
  };

  const push = (idx) => {
    if (!visited[idx] && isBg(idx)) {
      visited[idx] = 1;
      queue[tail++] = idx;
    }
  };

  for (let x = 0; x < w; x++) {
    push(x);
    push((h - 1) * w + x);
  }
  for (let y = 0; y < h; y++) {
    push(y * w);
    push(y * w + (w - 1));
  }

  while (head < tail) {
    const idx = queue[head++];
    data[idx * 4 + 3] = 0;
    const x = idx % w;
    const y = (idx - x) / w;
    if (x > 0) push(idx - 1);
    if (x < w - 1) push(idx + 1);
    if (y > 0) push(idx - w);
    if (y < h - 1) push(idx + w);
  }

  return sharp(data, { raw: { width: w, height: h, channels: 4 } })
    .trim({ threshold: 10 })
    .png()
    .toBuffer();
}

async function composeProductFrame(cutoutBuf, outBase) {
  const maxW = Math.round(CANVAS.width * CONTENT_BOX.width);
  const maxH = Math.round(CANVAS.height * CONTENT_BOX.height);
  const fitted = await sharp(cutoutBuf)
    .resize(maxW, maxH, { fit: "inside", withoutEnlargement: false })
    .toBuffer({ resolveWithObject: true });

  const left = Math.round((CANVAS.width - fitted.info.width) / 2);
  const top = Math.round((CANVAS.height - fitted.info.height) / 2);

  // Sombra de contacto suave debajo del calzado
  const shadowW = Math.round(fitted.info.width * 0.78);
  const shadowH = Math.max(24, Math.round(fitted.info.height * 0.08));
  const shadowSvg = Buffer.from(
    `<svg width="${shadowW}" height="${shadowH}"><defs><radialGradient id="s"><stop offset="0%" stop-color="#000" stop-opacity="0.16"/><stop offset="100%" stop-color="#000" stop-opacity="0"/></radialGradient></defs><ellipse cx="${shadowW / 2}" cy="${shadowH / 2}" rx="${shadowW / 2}" ry="${shadowH / 2}" fill="url(#s)"/></svg>`,
  );

  const composed = await sharp({
    create: {
      width: CANVAS.width,
      height: CANVAS.height,
      channels: 4,
      background: { ...SURFACE_RGB, alpha: 1 },
    },
  })
    .composite([
      {
        input: shadowSvg,
        left: Math.round((CANVAS.width - shadowW) / 2),
        top: Math.min(CANVAS.height - shadowH, top + fitted.info.height - Math.round(shadowH * 0.45)),
      },
      { input: fitted.data, left, top },
    ])
    .flatten({ background: SURFACE_RGB })
    .png()
    .toBuffer();

  for (const w of WIDTHS) {
    const resized = sharp(composed).resize(w);
    await resized.clone().webp({ quality: 86 }).toFile(`${outBase}.${w}.webp`);
    await resized.clone().avif({ quality: 62 }).toFile(`${outBase}.${w}.avif`);
  }
}

async function main() {
  const results = {};
  for (const [slug, prefixes] of Object.entries(SLUG_PICKS)) {
    const refDir = path.join(REF_ROOT, slug);
    if (!existsSync(refDir)) continue;
    const files = (await readdir(refDir)).sort();
    const chosen = prefixes
      .map((p) => files.find((f) => f.startsWith(p)))
      .filter(Boolean);
    if (!chosen.length) continue;

    const outDir = path.join(OUT_ROOT, slug);
    await mkdir(outDir, { recursive: true });
    for (const existing of await readdir(outDir)) {
      if (/\.(webp|avif)$/i.test(existing)) {
        await rm(path.join(outDir, existing), { force: true });
      }
    }

    const dbFiles = [];
    for (let i = 0; i < chosen.length; i++) {
      const n = i + 1;
      const srcPath = path.join(refDir, chosen[i]);
      const cutout = await cutoutWhiteStudio(srcPath);
      await composeProductFrame(cutout, path.join(outDir, `${slug}-${n}`));
      dbFiles.push(`${slug}-${n}.960.webp`);
    }
    results[slug] = dbFiles;
    console.log(`OK ${slug}: ${dbFiles.length} ángulos`);
  }
  console.log("JSON_SUMMARY:" + JSON.stringify(results));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
