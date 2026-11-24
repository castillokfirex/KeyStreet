#!/usr/bin/env node
/**
 * Valida cada modelo 3D del catálogo y escribe el registro de licencias.
 *
 * Comprobaciones por .glb:
 *   - gltf-validator: 0 errores
 *   - Y arriba / punta hacia +X: el eje más largo del bounding box es X y la
 *     punta (lado más bajo y largo) queda en +X
 *   - centrado: centro de X/Z en el origen (±5 mm); base en y = 0 (±1 mm)
 *   - escala real: largo entre 0,28 y 0,30 m
 *   - texturas: solo KTX2 o WebP (o ninguna)
 *   - compresión: EXT_meshopt_compression o KHR_draco_mesh_compression
 *   - peso ≤ 3 MB
 *
 * Uso: node models/validate-models.mjs
 * Salida: assets/models/manifest.json y docs/creditos-3d.md (y código 1 si algo falla)
 */
import { readFile, stat, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { getBounds, NodeIO } from "@gltf-transform/core";
import { ALL_EXTENSIONS } from "@gltf-transform/extensions";
import validator from "gltf-validator";
import { MeshoptDecoder } from "meshoptimizer";

const SCRIPTS = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const REPO = path.resolve(SCRIPTS, "..");
const CATALOG = path.join(SCRIPTS, "catalog", "catalog.json");
const MODELS_DIR = path.join(REPO, "frontend", "public", "assets", "models");
const MANIFEST = path.join(REPO, "assets", "models", "manifest.json");
const CREDITS = path.join(REPO, "docs", "creditos-3d.md");
const MAX_BYTES = 3 * 1024 * 1024;
const today = new Date().toISOString().slice(0, 10);

const round = (n, d = 4) => Number(n.toFixed(d));

async function inspect(file) {
  const bytes = new Uint8Array(await readFile(file));
  const report = await validator.validateBytes(bytes, { maxIssues: 50 });
  await MeshoptDecoder.ready;
  const io = new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({ "meshopt.decoder": MeshoptDecoder });
  const doc = await io.readBinary(bytes);
  const root = doc.getRoot();
  const scene = root.getDefaultScene() ?? root.listScenes()[0];
  const { min, max } = getBounds(scene);
  const size = [max[0] - min[0], max[1] - min[1], max[2] - min[2]];
  const center = [(max[0] + min[0]) / 2, (max[1] + min[1]) / 2, (max[2] + min[2]) / 2];
  const textures = root.listTextures().map((t) => t.getMimeType());
  const extensions = root.listExtensionsUsed().map((e) => e.extensionName);

  // Punta hacia +X: en el extremo +X la altura del zapato es menor que en el talón (-X)
  let toeHeight = 0;
  let heelHeight = 0;
  for (const mesh of root.listMeshes()) {
    for (const prim of mesh.listPrimitives()) {
      const pos = prim.getAttribute("POSITION");
      if (!pos) continue;
      const v = [0, 0, 0];
      for (let i = 0; i < pos.getCount(); i++) {
        pos.getElement(i, v);
        if (v[0] > max[0] - size[0] * 0.25) toeHeight = Math.max(toeHeight, v[1] - min[1]);
        if (v[0] < min[0] + size[0] * 0.25) heelHeight = Math.max(heelHeight, v[1] - min[1]);
      }
    }
  }

  const checks = {
    validatorErrors: report.issues.numErrors,
    validatorWarnings: report.issues.numWarnings,
    yUpLongestX: size[0] > size[2] && size[0] > size[1],
    toeTowardsPlusX: toeHeight < heelHeight,
    centeredXZ: Math.abs(center[0]) <= 0.005 && Math.abs(center[2]) <= 0.005,
    baseAtZero: Math.abs(min[1]) <= 0.001,
    realScale: size[0] >= 0.28 && size[0] <= 0.3,
    texturesOk: textures.every((m) => m === "image/ktx2" || m === "image/webp"),
    compressed: extensions.includes("EXT_meshopt_compression") || extensions.includes("KHR_draco_mesh_compression"),
  };
  return {
    bytes: bytes.byteLength,
    sizeOk: bytes.byteLength <= MAX_BYTES,
    dimensionsM: size.map((n) => round(n)),
    center: center.map((n) => round(n)),
    minY: round(min[1]),
    textures,
    extensions,
    checks,
    ok:
      checks.validatorErrors === 0 &&
      checks.yUpLongestX &&
      checks.toeTowardsPlusX &&
      checks.centeredXZ &&
      checks.baseAtZero &&
      checks.realScale &&
      checks.texturesOk &&
      checks.compressed &&
      bytes.byteLength <= MAX_BYTES,
  };
}

async function main() {
  const catalog = JSON.parse(await readFile(CATALOG, "utf8"));
  let previous = {};
  try {
    previous = JSON.parse(await readFile(MANIFEST, "utf8")).models ?? {};
  } catch {
    /* primer registro */
  }

  const models = {};
  let failures = 0;
  for (const product of catalog.products) {
    const file = path.join(MODELS_DIR, `${product.slug}.glb`);
    try {
      await stat(file);
    } catch {
      models[product.slug] = { status: "sin-modelo", url: null };
      failures++;
      continue;
    }
    const result = await inspect(file);
    if (!result.ok) failures++;
    const prev = previous[product.slug] ?? {};
    models[product.slug] = {
      status: result.ok ? "validado" : "con-errores",
      url: `/assets/models/${product.slug}.glb`,
      kind: prev.kind ?? "generico",
      label: prev.label ?? "3D genérico",
      source: prev.source ?? "Generado por scripts/models/build-generic-glb.mjs a partir del PlaceholderSneaker del proyecto",
      author: prev.author ?? "Key Street (modelo propio generado)",
      license: prev.license ?? "Propio del proyecto (sin terceros)",
      sourceUrl: prev.sourceUrl ?? null,
      palette: product.palette,
      silhouette: product.silhouette,
      validatedAt: today,
      ...result,
    };
    console.log(
      `${result.ok ? "OK " : "ERR"} ${product.slug}.glb  ${(result.bytes / 1024).toFixed(1)} KB  largo ${result.dimensionsM[0]} m  errores ${result.checks.validatorErrors}`,
    );
  }

  const manifest = {
    $comment:
      "Registro de modelos 3D: origen, licencia y validación. Sketchfab (CC0/CC BY) requiere SKETCHFAB_API_TOKEN; sin token, cada producto usa el 3D genérico del proyecto con su paleta.",
    version: 1,
    conventions: {
      up: "+Y",
      toe: "+X",
      origin: "centro en X/Z, base en y = 0",
      lengthM: [0.28, 0.3],
      textures: "KTX2 o WebP",
      compression: "EXT_meshopt_compression",
      maxBytes: MAX_BYTES,
    },
    models,
  };
  await writeFile(MANIFEST, `${JSON.stringify(manifest, null, 2)}\n`);

  const rows = Object.entries(models).map(([slug, m]) =>
    m.status === "sin-modelo"
      ? `| \`${slug}\` | — | Sin modelo | — | — | — |`
      : `| \`${slug}\` | ${m.label} | ${m.author} | ${m.license} | ${(m.bytes / 1024).toFixed(1)} KB · ${m.dimensionsM[0]} m | ${m.status} |`,
  );
  const credits = `# Créditos y licencias de los modelos 3D

Generado por \`scripts/models/validate-models.mjs\` el ${today}. Detalle técnico en [\`assets/models/manifest.json\`](../assets/models/manifest.json).

## Origen de los modelos

- **Sketchfab (CC0 / CC BY):** no se usó. La descarga requiere \`SKETCHFAB_API_TOKEN\` y no hay ninguno configurado en \`.env\`. Cuando se agregue, cada modelo descargado debe registrarse aquí con autor, URL y licencia (CC BY exige atribución visible).
- **3D genérico:** todos los productos usan el sneaker genérico del proyecto (mismas piezas que \`PlaceholderSneaker\`), exportado a GLB con la paleta de color aproximada de cada colorway. Es un modelo propio, sin derechos de terceros. **No representa la forma real de cada modelo de la marca.**

## Convenciones verificadas

Y arriba · punta hacia +X · centrado en X/Z · base en y = 0 · largo 0,28–0,30 m · sin texturas (solo factores PBR; si se agregan deben ser KTX2 o WebP) · compresión meshopt · ≤ 3 MB por zapato.

Pasos de normalización con \`@gltf-transform/cli\`: \`gltf-transform center <in> <out> --pivot below\` y \`gltf-transform meshopt <in> <out>\`.

## Modelos

| Producto | Tipo | Autor | Licencia | Peso · largo | Validación |
|---|---|---|---|---|---|
${rows.join("\n")}
`;
  await writeFile(CREDITS, credits);
  console.log(failures ? `\n${failures} modelo(s) con problemas` : "\nTodos los modelos pasan la validación");
  process.exitCode = failures ? 1 : 0;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
