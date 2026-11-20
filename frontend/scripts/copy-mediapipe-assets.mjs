import {
  copyFileSync,
  existsSync,
  mkdirSync,
  readdirSync,
  statSync,
  writeFileSync,
} from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const rootDir = path.resolve(__dirname, "..");

// 1. Subsets latinos de fuentes autohospedadas para preload instantáneo
const fontsDest = path.join(rootDir, "public", "fonts");
mkdirSync(fontsDest, { recursive: true });
const fontCopies = [
  [
    path.join(
      rootDir,
      "node_modules",
      "@fontsource-variable",
      "plus-jakarta-sans",
      "files",
      "plus-jakarta-sans-latin-wght-normal.woff2",
    ),
    path.join(fontsDest, "plus-jakarta-sans-latin.woff2"),
  ],
  [
    path.join(
      rootDir,
      "node_modules",
      "@fontsource-variable",
      "space-grotesk",
      "files",
      "space-grotesk-latin-wght-normal.woff2",
    ),
    path.join(fontsDest, "space-grotesk-latin.woff2"),
  ],
];
for (const [src, dest] of fontCopies) {
  if (existsSync(src)) {
    copyFileSync(src, dest);
  }
}

// 2. WASM + Modelo MediaPipe local
const wasmSrc = path.join(
  rootDir,
  "node_modules",
  "@mediapipe",
  "tasks-vision",
  "wasm",
);
const outBase = path.join(rootDir, "public", "mediapipe");
const wasmDest = path.join(outBase, "wasm");
const modelDest = path.join(outBase, "pose_landmarker_lite.task");
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_lite/float16/1/pose_landmarker_lite.task";

mkdirSync(wasmDest, { recursive: true });

if (existsSync(wasmSrc)) {
  let copied = 0;
  for (const entry of readdirSync(wasmSrc)) {
    const srcFile = path.join(wasmSrc, entry);
    if (statSync(srcFile).isFile()) {
      copyFileSync(srcFile, path.join(wasmDest, entry));
      copied += 1;
    }
  }
  console.log(`[mediapipe] Copiados ${copied} archivos WASM a public/mediapipe/wasm`);
} else {
  console.warn("[mediapipe] Directorio wasm no encontrado aún; omitiendo copia.");
}

if (!existsSync(modelDest) || statSync(modelDest).size < 100_000) {
  console.log("[mediapipe] Descargando pose_landmarker_lite.task...");
  const res = await fetch(MODEL_URL);
  if (!res.ok) {
    throw new Error(`Fallo descargando modelo MediaPipe: HTTP ${res.status}`);
  }
  const buf = Buffer.from(await res.arrayBuffer());
  writeFileSync(modelDest, buf);
  console.log(`[mediapipe] Modelo guardado (${(buf.length / 1024 / 1024).toFixed(2)} MB)`);
} else {
  console.log("[mediapipe] Modelo pose_landmarker_lite.task ya presente.");
}
