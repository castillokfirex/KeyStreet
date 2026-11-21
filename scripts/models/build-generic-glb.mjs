#!/usr/bin/env node
/**
 * Genera el "3D genérico" de cada producto sin modelo con licencia válida.
 *
 * Reproduce las piezas del PlaceholderSneaker del proyecto (suela, mediasuela,
 * capellada, puntera, cuello, paneles, contrafuerte, lengüeta y cordones) a
 * escala real y con la paleta del producto, y lo exporta a GLB.
 *
 * Normalización (convención del proyecto):
 *   - Y arriba, punta hacia +X, centrado en X/Z, base apoyada en y = 0
 *   - largo ≈ 0,29 m (rango aceptado 0,28–0,30 m)
 *   - sin texturas (solo factores PBR) y compresión meshopt
 * Pasos con @gltf-transform/cli:
 *   gltf-transform center <in> <out> --pivot below
 *   gltf-transform meshopt <in> <out>
 *
 * Uso: node models/build-generic-glb.mjs [slug ...]
 * Salida: frontend/public/assets/models/{slug}.glb
 */
import { execFileSync } from "node:child_process";
import { mkdir, readFile, rm } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { Document, NodeIO } from "@gltf-transform/core";
import * as THREE from "three";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SCRIPTS, "..");
const CATALOG = path.join(SCRIPTS, "catalog", "catalog.json");
const MANIFEST = path.join(REPO, "assets", "models", "manifest.json");
const OUT_DIR = path.join(REPO, "frontend", "public", "assets", "models");
const TMP = path.join(SCRIPTS, ".cache", "models");
const CLI = path.join(SCRIPTS, "node_modules", "@gltf-transform", "cli", "bin", "cli.js");

/** Largo del PlaceholderSneaker (0,27 m) → largo real objetivo (0,29 m). */
const PLACEHOLDER_LENGTH = 0.27;
const TARGET_LENGTH = 0.29;
const SCALE = TARGET_LENGTH / PLACEHOLDER_LENGTH;

/** sRGB hex → color lineal (glTF baseColorFactor es lineal). */
function linear(hex) {
  const c = new THREE.Color(hex);
  c.convertSRGBToLinear();
  return [c.r, c.g, c.b, 1];
}

/** Alturas del cuello/lengüeta/contrafuerte según silueta (LOW | MID | HIGH). */
function heights(silhouette) {
  const s = String(silhouette).toUpperCase();
  if (s === "HIGH") return { collarH: 0.088, collarY: 0.095, heelH: 0.09, heelY: 0.072, tongueY: 0.1 };
  if (s === "MID") return { collarH: 0.062, collarY: 0.082, heelH: 0.072, heelY: 0.061, tongueY: 0.086 };
  return { collarH: 0.038, collarY: 0.068, heelH: 0.055, heelY: 0.05, tongueY: 0.072 };
}

/** Piezas del sneaker genérico en el marco del PlaceholderSneaker. */
function parts(silhouette, palette) {
  const h = heights(silhouette);
  const upper = palette.upper ?? "#FFFFFF";
  const sole = palette.sole ?? "#EAEAE6";
  const accent = palette.accent ?? "#16302B";
  const lace = accent.toLowerCase() === upper.toLowerCase() ? "#CBD5E1" : accent;
  const box = (w, hh, d) => new THREE.BoxGeometry(w, hh, d);
  return [
    { name: "suela", geo: box(0.27, 0.018, 0.096), pos: [0, -0.012, 0], color: sole, rough: 0.75, metal: 0.05 },
    { name: "mediasuela", geo: box(0.264, 0.022, 0.092), pos: [0, 0.006, 0], color: "#F8FAFC", rough: 0.55 },
    { name: "capellada", geo: box(0.17, 0.062, 0.086), pos: [-0.03, 0.045, 0], color: upper, rough: 0.5 },
    { name: "puntera", geo: box(0.1, 0.038, 0.084), pos: [0.078, 0.034, 0], color: upper, rough: 0.5 },
    { name: "cuello", geo: new THREE.CylinderGeometry(0.043, 0.045, h.collarH, 24), pos: [-0.075, h.collarY, 0], color: upper, rough: 0.55 },
    { name: "panel-ext", geo: box(0.11, 0.018, 0.006), pos: [-0.008, 0.044, 0.044], rot: [0, 0, -0.18], color: accent, rough: 0.4 },
    { name: "panel-int", geo: box(0.11, 0.018, 0.006), pos: [-0.008, 0.044, -0.044], rot: [0, 0, -0.18], color: accent, rough: 0.4 },
    { name: "contrafuerte", geo: box(0.012, h.heelH, 0.076), pos: [-0.116, h.heelY, 0], color: accent, rough: 0.45 },
    { name: "lengueta", geo: box(0.05, 0.055, 0.058), pos: [0.01, h.tongueY, 0], rot: [0, 0, -0.42], color: upper, rough: 0.6 },
    ...[0.025, 0.042, 0.059].map((x, i) => ({
      name: `cordon-${i + 1}`,
      // cordones cruzando el empeine (eje Z)
      geo: new THREE.CylinderGeometry(0.0035, 0.0035, 0.062, 10),
      pos: [x, 0.066 - i * 0.006, 0],
      rot: [Math.PI / 2, 0, 0],
      color: lace,
      rough: 0.7,
    })),
  ];
}

function buildDocument(product) {
  const doc = new Document();
  doc.getRoot().getAsset().generator = "KeyStreet build-generic-glb";
  const buffer = doc.createBuffer();
  const scene = doc.createScene(product.slug);
  const node = doc.createNode(`${product.slug}-generico`);
  scene.addChild(node);
  doc.getRoot().setDefaultScene(scene);
  const mesh = doc.createMesh("sneaker-generico");
  const materials = new Map();

  for (const part of parts(product.silhouette, product.palette)) {
    const m = new THREE.Matrix4().compose(
      new THREE.Vector3(...part.pos),
      new THREE.Quaternion().setFromEuler(new THREE.Euler(...(part.rot ?? [0, 0, 0]))),
      new THREE.Vector3(1, 1, 1),
    );
    const geo = part.geo.toNonIndexed ? part.geo : part.geo;
    geo.applyMatrix4(m);
    geo.applyMatrix4(new THREE.Matrix4().makeScale(SCALE, SCALE, SCALE));
    geo.computeVertexNormals();

    const key = `${part.color}|${part.rough}|${part.metal ?? 0}`;
    if (!materials.has(key)) {
      materials.set(
        key,
        doc
          .createMaterial(part.name)
          .setBaseColorFactor(linear(part.color))
          .setRoughnessFactor(part.rough)
          .setMetallicFactor(part.metal ?? 0),
      );
    }
    const position = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array(geo.attributes.position.array))
      .setBuffer(buffer);
    const normal = doc
      .createAccessor()
      .setType("VEC3")
      .setArray(new Float32Array(geo.attributes.normal.array))
      .setBuffer(buffer);
    const prim = doc.createPrimitive().setAttribute("POSITION", position).setAttribute("NORMAL", normal);
    if (geo.index) {
      prim.setIndices(doc.createAccessor().setType("SCALAR").setArray(new Uint16Array(geo.index.array)).setBuffer(buffer));
    }
    prim.setMaterial(materials.get(key));
    mesh.addPrimitive(prim);
  }
  node.setMesh(mesh);
  return doc;
}

async function main() {
  const only = new Set(process.argv.slice(2));
  const catalog = JSON.parse(await readFile(CATALOG, "utf8"));
  await mkdir(OUT_DIR, { recursive: true });
  await mkdir(TMP, { recursive: true });
  const io = new NodeIO();

  for (const product of catalog.products) {
    if (only.size && !only.has(product.slug)) continue;
    const raw = path.join(TMP, `${product.slug}.raw.glb`);
    const centered = path.join(TMP, `${product.slug}.centered.glb`);
    const out = path.join(OUT_DIR, `${product.slug}.glb`);
    await io.write(raw, buildDocument(product));
    // Normalización con @gltf-transform/cli
    execFileSync(process.execPath, [CLI, "center", raw, centered, "--pivot", "below"], { stdio: "pipe" });
    execFileSync(process.execPath, [CLI, "meshopt", centered, out], { stdio: "pipe" });
    await rm(raw, { force: true });
    await rm(centered, { force: true });
    console.log(`3D genérico: ${path.relative(REPO, out)}`);
  }
  console.log(`Siguiente paso: node models/validate-models.mjs (actualiza ${path.relative(REPO, MANIFEST)})`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
