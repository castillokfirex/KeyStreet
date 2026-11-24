import { sampleAppearanceFromImageData } from "./avatarAppearance";
import { computeParamsFromLandmarks, type PoseLandmarkLike } from "./bodyParams";
import type { AnatomicalRatios, BodyBuild } from "@/stores/fitProfile";

export interface PoseEstimationResult {
  heightCm: number;
  build: BodyBuild;
  ratios: AnatomicalRatios;
  skinTone?: string;
  hairColor?: string;
  ephemeralCleared: true;
}

export interface EstimatorDeps {
  createBitmap?: (file: File) => Promise<ImageBitmap>;
  createCanvas?: () => HTMLCanvasElement;
  createObjectUrl?: (file: File) => string;
  revokeObjectUrl?: (url: string) => void;
  detectLandmarks?: (source: HTMLCanvasElement) => Promise<PoseLandmarkLike[]>;
}

let landmarkerPromise: Promise<{
  detect: (canvas: HTMLCanvasElement) => { landmarks?: PoseLandmarkLike[][] };
}> | null = null;

async function getPoseLandmarker() {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      const vision = await import("@mediapipe/tasks-vision");
      const fileset = await vision.FilesetResolver.forVisionTasks(
        "/mediapipe/wasm",
      );
      return vision.PoseLandmarker.createFromOptions(fileset, {
        baseOptions: {
          modelAssetPath: "/mediapipe/pose_landmarker_lite.task",
          delegate: "CPU",
        },
        runningMode: "IMAGE",
        numPoses: 1,
      });
    })();
  }
  return landmarkerPromise;
}

function loadViaObjectUrl(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("No se pudo decodificar la imagen."));
    img.src = url;
  });
}

export async function estimatePoseFromFile(
  file: File,
  declaredHeightCm: number,
  inputEl?: HTMLInputElement | null,
  deps: EstimatorDeps = {},
): Promise<PoseEstimationResult> {
  const createBitmapFn =
    deps.createBitmap ?? ((f: File) => createImageBitmap(f));
  const createCanvasFn =
    deps.createCanvas ?? (() => document.createElement("canvas"));
  const createUrlFn =
    deps.createObjectUrl ?? ((f: File) => URL.createObjectURL(f));
  const revokeFn =
    deps.revokeObjectUrl ?? ((u: string) => URL.revokeObjectURL(u));

  const resources: {
    bitmap: ImageBitmap | null;
    canvas: HTMLCanvasElement | null;
    objectUrl: string | null;
  } = {
    bitmap: null,
    canvas: null,
    objectUrl: null,
  };

  try {
    const canvas = createCanvasFn();
    resources.canvas = canvas;
    let srcW = 640;
    let srcH = 640;
    let drawSource: CanvasImageSource;

    try {
      const bmp = await createBitmapFn(file);
      resources.bitmap = bmp;
      srcW = bmp.width;
      srcH = bmp.height;
      drawSource = bmp;
    } catch {
      const url = createUrlFn(file);
      resources.objectUrl = url;
      const img = await loadViaObjectUrl(url);
      srcW = img.naturalWidth || 640;
      srcH = img.naturalHeight || 640;
      drawSource = img;
    }

    const maxDim = 640;
    const scale = Math.min(1, maxDim / Math.max(srcW, srcH, 1));
    canvas.width = Math.max(64, Math.round(srcW * scale));
    canvas.height = Math.max(64, Math.round(srcH * scale));
    const ctx = canvas.getContext("2d");
    if (ctx) {
      ctx.drawImage(drawSource, 0, 0, canvas.width, canvas.height);
    }

    let landmarks: PoseLandmarkLike[];
    if (deps.detectLandmarks) {
      landmarks = await deps.detectLandmarks(canvas);
    } else {
      const detector = await getPoseLandmarker();
      const result = detector.detect(canvas);
      landmarks = result.landmarks?.[0] ?? [];
    }

    const computed = computeParamsFromLandmarks(landmarks, declaredHeightCm);
    const appearance =
      ctx &&
      typeof ctx.getImageData === "function" &&
      canvas.width > 0 &&
      canvas.height > 0
        ? sampleAppearanceFromImageData(
            (x, y, w, h) => ctx.getImageData(x, y, w, h).data,
            canvas.width,
            canvas.height,
            landmarks,
          )
        : {};
    return {
      ...computed,
      ...appearance,
      ephemeralCleared: true,
    };
  } finally {
    try {
      resources.bitmap?.close();
    } catch {
      // noop
    }
    resources.bitmap = null;

    if (resources.canvas) {
      const ctx = resources.canvas.getContext("2d");
      ctx?.clearRect(0, 0, resources.canvas.width, resources.canvas.height);
      resources.canvas.width = 0;
      resources.canvas.height = 0;
      resources.canvas = null;
    }

    if (resources.objectUrl) {
      revokeFn(resources.objectUrl);
      resources.objectUrl = null;
    }

    if (inputEl) {
      inputEl.value = "";
    }
  }
}
