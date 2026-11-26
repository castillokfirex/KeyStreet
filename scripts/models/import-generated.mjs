#!/usr/bin/env node
/**
 * Importa un zapato 3D generado con IA multivista (p. ej. TRELLIS) y lo deja
 * con las convenciones del catálogo para que pase validate-models.mjs:
 *
 *   Y arriba · punta hacia +X · centrado en X/Z · base en y = 0 · largo 0,29 m
 *   normales calculadas · texturas WebP (máx. 1024 px) · compresión meshopt · ≤ 3 MB
 *
 * Además registra el origen en assets/models/manifest.json.
 *
 * Uso: node models/import-generated.mjs <entrada.glb> <slug> [--generator "TRELLIS"]
 * Salida: frontend/public/assets/models/<slug>.glb
 */
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBounds, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS, EXTTextureWebP } from "@gltf-transform/extensions";
import { dedup, meshopt, normals, prune, transformMesh, weld } from "@gltf-transform/functions";
import { MeshoptDecoder, MeshoptEncoder } from "meshoptimizer";
import { createRequire } from "node:module";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SCRIPTS, "..");
const MODELS_DIR = path.join(REPO, "frontend", "public", "assets", "models");
const MANIFEST = path.join(REPO, "assets", "models", "manifest.json");
const TARGET_LENGTH_M = 0.29;

/**
 * @gltf-transform/functions carga su propio sharp (vía ndarray-pixels); cargar
 * otra versión en el mismo proceso rompe libvips. Se usa esa misma instancia.
 */
function loadSharp() {
  for (const base of [path.join(SCRIPTS, "node_modules", "ndarray-pixels", "index.js"), import.meta.url]) {
    try {
      return createRequire(base)("sharp");
    } catch {
      /* siguiente opción */
    }
  }
  throw new Error("No se encontró sharp");
}
const sharp = loadSharp();
const TEXTURE_PX = 1024;

const [input, slug, ...rest] = process.argv.slice(2);
if (!input || !slug) {
  console.error("Uso: node models/import-generated.mjs <entrada.glb> <slug> [--generator nombre]");
  process.exit(1);
}
const genFlag = rest.indexOf("--generator");
const generator = genFlag >= 0 ? rest[genFlag + 1] : "TRELLIS";

/** Matriz 4x4 (column-major, como glTF) */
const translate = (x, y, z) => [1, 0, 0, 0, 0, 1, 0, 0, 0, 0, 1, 0, x, y, z, 1];
const scale = (s) => [s, 0, 0, 0, 0, s, 0, 0, 0, 0, s, 0, 0, 0, 0, 1];
const rotateY = (rad) => {
  const c = Math.cos(rad);
  const s = Math.sin(rad);
  return [c, 0, -s, 0, 0, 1, 0, 0, s, 0, c, 0, 0, 0, 0, 1];
};

function applyToAll(doc, matrix) {
  for (const mesh of doc.getRoot().listMeshes()) transformMesh(mesh, matrix);
}

/** Lleva la transformación de cada nodo a los vértices y deja los nodos en identidad. */
function bakeNodeTransforms(doc) {
  for (const node of doc.getRoot().listNodes()) {
    const mesh = node.getMesh();
    if (mesh) transformMesh(mesh, node.getWorldMatrix());
  }
  for (const node of doc.getRoot().listNodes()) {
    node.setTranslation([0, 0, 0]).setRotation([0, 0, 0, 1]).setScale([1, 1, 1]);
  }
}

/**
 * Texturas a WebP (máx. TEXTURE_PX). Se hace a mano con sharp porque
 * textureCompress falla con algunos mapas de un canal en esta versión.
 */
async function texturesToWebp(doc) {
  const textures = doc.getRoot().listTextures();
  if (textures.length === 0) return;
  doc.createExtension(EXTTextureWebP).setRequired(true);
  for (const tex of textures) {
    const image = tex.getImage();
    if (!image) continue;
    // Niveles: la IA hornea la textura opaca (un zapato blanco puede quedar gris).
    // Se lleva el tono claro típico (percentil 98, sin el fondo negro) a ~240.
    const { data } = await sharp(Buffer.from(image)).removeAlpha().raw().toBuffer({ resolveWithObject: true });
    const lum = [];
    for (let i = 0; i < data.length; i += 3) {
      const l = (data[i] + data[i + 1] + data[i + 2]) / 3;
      if (l > 20) lum.push(l);
    }
    lum.sort((a, b) => a - b);
    const light = lum.length ? lum[Math.floor(lum.length * 0.98)] : 240;
    const gain = Math.min(1.8, Math.max(1, 240 / Math.max(1, light)));
    const webp = await sharp(Buffer.from(image))
      .linear(gain, 0)
      .resize(TEXTURE_PX, TEXTURE_PX, { fit: "inside", withoutEnlargement: true })
      .webp({ quality: 88 })
      .toBuffer();
    tex.setImage(new Uint8Array(webp)).setMimeType("image/webp");
    const uri = tex.getURI();
    if (uri) tex.setURI(uri.replace(/\.(png|jpe?g)$/i, ".webp"));
  }
}

/**
 * Quita los fragmentos sueltos que a veces deja la IA (motas flotando junto al
 * zapato): conserva solo los grupos de triángulos conectados que tengan al
 * menos MIN_PIECE del total. Requiere vértices soldados (weld) antes.
 */
const MIN_PIECE = 0.02;
function removeFloaters(doc) {
  let removed = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const pos = prim.getAttribute("POSITION");
      if (!indices || !pos) continue;
      const idx = indices.getArray();
      const parent = new Int32Array(pos.getCount()).map((_, i) => i);
      const find = (a) => {
        while (parent[a] !== a) {
          parent[a] = parent[parent[a]];
          a = parent[a];
        }
        return a;
      };
      // Une vértices por posición (las costuras de UV duplican vértices) y por triángulo
      const byPos = new Map();
      const v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        const key = `${v[0].toFixed(5)},${v[1].toFixed(5)},${v[2].toFixed(5)}`;
        const prev = byPos.get(key);
        if (prev === undefined) byPos.set(key, i);
        else parent[find(i)] = find(prev);
      }
      for (let t = 0; t < idx.length; t += 3) {
        const a = find(idx[t]);
        parent[find(idx[t + 1])] = a;
        parent[find(idx[t + 2])] = a;
      }
      const triCount = new Map();
      for (let t = 0; t < idx.length; t += 3) {
        const r = find(idx[t]);
        triCount.set(r, (triCount.get(r) ?? 0) + 1);
      }
      const total = idx.length / 3;
      const keep = [];
      for (let t = 0; t < idx.length; t += 3) {
        if (triCount.get(find(idx[t])) >= total * MIN_PIECE) keep.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      removed += total - keep.length / 3;
      const Ctor = idx.constructor;
      indices.setArray(new Ctor(keep));
    }
  }
  return removed;
}

/**
 * Borra la "falda" que a veces queda pegada a la suela sobre el piso (sombras
 * de la foto convertidas en geometría): triángulos en el 4 % inferior de la
 * altura que salen del contorno de la suela, medido un poco más arriba.
 * Se aplica con el zapato ya orientado (X largo, Z ancho, base en y = 0).
 */
function trimFloorSkirt(doc) {
  const { min, max } = bounds(doc);
  const h = max[1] - min[1];
  const v = [0, 0, 0];
  // Contorno de la suela: extremos X/Z de los vértices entre el 6 % y el 20 % de la altura
  const band = { x0: Infinity, x1: -Infinity, z0: Infinity, z1: -Infinity };
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        const y = (v[1] - min[1]) / h;
        if (y >= 0.06 && y <= 0.2) {
          band.x0 = Math.min(band.x0, v[0]);
          band.x1 = Math.max(band.x1, v[0]);
          band.z0 = Math.min(band.z0, v[2]);
          band.z1 = Math.max(band.z1, v[2]);
        }
      }
    }
  }
  const margin = 0.012; // 1,2 cm
  let removed = 0;
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const indices = prim.getIndices();
      const pos = prim.getAttribute("POSITION");
      if (!indices) continue;
      const idx = indices.getArray();
      const keep = [];
      const c = [0, 0, 0];
      for (let t = 0; t < idx.length; t += 3) {
        c[0] = c[1] = c[2] = 0;
        for (let k = 0; k < 3; k++) {
          pos.getElement(idx[t + k], v);
          c[0] += v[0] / 3;
          c[1] += v[1] / 3;
          c[2] += v[2] / 3;
        }
        const low = (c[1] - min[1]) / h < 0.04;
        const outside =
          c[0] < band.x0 - margin || c[0] > band.x1 + margin || c[2] < band.z0 - margin || c[2] > band.z1 + margin;
        if (low && outside) removed++;
        else keep.push(idx[t], idx[t + 1], idx[t + 2]);
      }
      indices.setArray(new idx.constructor(keep));
    }
  }
  return removed;
}

function bounds(doc) {
  const root = doc.getRoot();
  return getBounds(root.getDefaultScene() ?? root.listScenes()[0]);
}

/** Altura máxima en cada extremo del eje X (la punta es más baja que el talón). */
function endHeights(doc) {
  const { min, max } = bounds(doc);
  const len = max[0] - min[0];
  let plus = 0;
  let minus = 0;
  const v = [0, 0, 0];
  for (const mesh of doc.getRoot().listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        if (v[0] > max[0] - len * 0.25) plus = Math.max(plus, v[1] - min[1]);
        if (v[0] < min[0] + len * 0.25) minus = Math.max(minus, v[1] - min[1]);
      }
    }
  }
  return { plus, minus };
}

async function main() {
  await MeshoptDecoder.ready;
  await MeshoptEncoder.ready;
  const io = new NodeIO()
    .registerExtensions(ALL_EXTENSIONS)
    .registerDependencies({ "meshopt.decoder": MeshoptDecoder, "meshopt.encoder": MeshoptEncoder });

  const doc = await io.read(input);
  bakeNodeTransforms(doc);

  // 0. Sin fragmentos sueltos (antes de medir, para que no inflen el tamaño)
  await doc.transform(weld());
  const floaters = removeFloaters(doc);
  if (floaters > 0) console.log(`Fragmentos sueltos eliminados: ${floaters} triángulos`);

  // 1. El eje más largo en el piso debe ser X
  let { min, max } = bounds(doc);
  if (max[2] - min[2] > max[0] - min[0]) applyToAll(doc, rotateY(Math.PI / 2));

  // 2. Punta hacia +X
  const { plus, minus } = endHeights(doc);
  if (plus > minus) applyToAll(doc, rotateY(Math.PI));

  // 3. Escala real, centrado en X/Z y base en y = 0
  ({ min, max } = bounds(doc));
  applyToAll(doc, scale(TARGET_LENGTH_M / (max[0] - min[0])));
  ({ min, max } = bounds(doc));
  applyToAll(doc, translate(-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2));

  // 3b. Sin restos pegados a la suela sobre el piso; se vuelve a centrar y escalar
  const skirt = trimFloorSkirt(doc);
  if (skirt > 0) {
    console.log(`Restos sobre el piso eliminados: ${skirt} triángulos`);
    await doc.transform(prune());
    ({ min, max } = bounds(doc));
    applyToAll(doc, scale(TARGET_LENGTH_M / (max[0] - min[0])));
    ({ min, max } = bounds(doc));
    applyToAll(doc, translate(-(min[0] + max[0]) / 2, -min[1], -(min[2] + max[2]) / 2));
  }

  // 4. Materiales tipo cuero/textil (los generadores a veces exageran el metal)
  for (const mat of doc.getRoot().listMaterials()) {
    mat.setMetallicFactor(0).setRoughnessFactor(Math.max(0.55, mat.getRoughnessFactor())).setDoubleSided(false);
  }

  // 5. Normales, texturas WebP y compresión
  await doc.transform(normals({ overwrite: true }), dedup(), prune());
  await texturesToWebp(doc);
  await doc.transform(meshopt({ encoder: MeshoptEncoder, level: "medium" }));

  const out = path.join(MODELS_DIR, `${slug}.glb`);
  await io.write(out, doc);

  // 6. Origen del modelo en el manifiesto (validate-models.mjs conserva estos campos)
  const manifest = JSON.parse(await readFile(MANIFEST, "utf8"));
  manifest.models ??= {};
  manifest.models[slug] = {
    ...(manifest.models[slug] ?? {}),
    kind: "ia-multivista",
    label: "3D generado con IA a partir de fotos propias",
    source: `${generator} (Space gratuito de Hugging Face) a partir de las fotos propias de assets/models/references/${slug}/`,
    author: "Key Street (fotos propias) + generación con IA",
    license: "Propio del proyecto (fotos propias; modelo generado)",
    sourceUrl: null,
  };
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  const final = bounds(doc);
  const size = final.max.map((n, i) => (n - final.min[i]).toFixed(3));
  const { size: bytes } = await import("node:fs").then((fs) => fs.promises.stat(out));
  console.log(`OK ${slug}.glb  ${(bytes / 1024).toFixed(0)} KB  tamaño ${size.join(" × ")} m`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
