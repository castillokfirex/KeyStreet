import { z } from "zod";
import type { AnatomicalRatios, BodyBuild } from "@/stores/fitProfile";

export const bodyProfileSchema = z.object({
  heightCm: z
    .number()
    .min(140, "Estatura mínima 140 cm")
    .max(210, "Estatura máxima 210 cm"),
  build: z.enum(["delgada", "media", "atletica", "robusta"]),
  usualSizeEu: z
    .number()
    .int()
    .min(36, "Talla mínima 36 EU")
    .max(44, "Talla máxima 44 EU"),
});

export type BodyProfileFormValues = z.infer<typeof bodyProfileSchema>;

export interface PoseLandmarkLike {
  x: number;
  y: number;
  z?: number;
  visibility?: number;
}

export interface MannequinScale {
  heightScale: number;
  shoulderScale: number;
  hipScale: number;
  depthScale: number;
  torsoScale: number;
  legScale: number;
  footLengthCm: number;
  footScale: number;
}

const BUILD_WIDTH: Record<BodyBuild, { shoulder: number; hip: number; depth: number }> = {
  delgada: { shoulder: 0.88, hip: 0.88, depth: 0.86 },
  media: { shoulder: 1.0, hip: 1.0, depth: 1.0 },
  atletica: { shoulder: 1.12, hip: 0.98, depth: 1.04 },
  robusta: { shoulder: 1.18, hip: 1.2, depth: 1.18 },
};

export function footLengthCm(sizeEu: number): number {
  const clamped = Math.max(36, Math.min(44, sizeEu));
  return Number((clamped / 1.5 - 1.5).toFixed(2));
}

export function clamp(val: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, val));
}

export function computeMannequinScale(params: {
  heightCm: number;
  build: BodyBuild;
  usualSizeEu: number;
  ratios?: AnatomicalRatios | null;
}): MannequinScale {
  const hScale = clamp(params.heightCm, 140, 210) / 175;
  const mult = BUILD_WIDTH[params.build];

  const shoulderRatioFactor = params.ratios
    ? clamp(params.ratios.shoulderToHeight / 0.23, 0.82, 1.28)
    : 1;
  const hipRatioFactor = params.ratios
    ? clamp(params.ratios.hipToHeight / 0.175, 0.82, 1.28)
    : 1;
  const torsoToLeg = params.ratios
    ? clamp(params.ratios.torsoToLeg, 0.45, 0.68)
    : 0.56;

  const fLen = footLengthCm(params.usualSizeEu);
  const baseFootCm = footLengthCm(40); // 25.17 cm -> escala 1.0

  return {
    heightScale: hScale,
    shoulderScale: mult.shoulder * shoulderRatioFactor,
    hipScale: mult.hip * hipRatioFactor,
    depthScale: mult.depth,
    torsoScale: clamp(torsoToLeg / 0.56, 0.88, 1.14),
    legScale: clamp(0.56 / torsoToLeg, 0.88, 1.14),
    footLengthCm: fLen,
    footScale: Number((fLen / baseFootCm).toFixed(3)),
  };
}

export function computeParamsFromLandmarks(
  landmarks: PoseLandmarkLike[],
  declaredHeightCm: number,
): {
  heightCm: number;
  build: BodyBuild;
  ratios: AnatomicalRatios;
} {
  const requiredIdx = [11, 12, 23, 24, 27, 28];
  if (!landmarks || landmarks.length < 29) {
    throw new Error("No detectamos cuerpo completo. Intenta de frente en buena luz.");
  }

  for (const idx of requiredIdx) {
    const lm = landmarks[idx];
    if (!lm || (lm.visibility ?? 0) <= 0.6) {
      throw new Error(
        "Visibilidad insuficiente en hombros, caderas o tobillos (>0.6 requerida). Acerca o centra tu foto de cuerpo entero.",
      );
    }
  }

  const leftShoulder = landmarks[11];
  const rightShoulder = landmarks[12];
  const leftHip = landmarks[23];
  const rightHip = landmarks[24];
  const leftAnkle = landmarks[27];
  const rightAnkle = landmarks[28];

  const shoulderY = (leftShoulder.y + rightShoulder.y) / 2;
  const hipY = (leftHip.y + rightHip.y) / 2;
  const ankleY = (leftAnkle.y + rightAnkle.y) / 2;

  const totalBodySpan = Math.max(0.2, Math.abs(ankleY - shoulderY) / 0.82);
  const torsoSpan = Math.max(0.08, Math.abs(hipY - shoulderY));
  const legSpan = Math.max(0.1, Math.abs(ankleY - hipY));

  const shoulderWidth = Math.abs(leftShoulder.x - rightShoulder.x);
  const hipWidth = Math.abs(leftHip.x - rightHip.x);

  const shoulderToHeight = clamp(shoulderWidth / totalBodySpan, 0.17, 0.31);
  const hipToHeight = clamp(hipWidth / totalBodySpan, 0.13, 0.25);
  const torsoToLeg = clamp(torsoSpan / legSpan, 0.44, 0.72);

  let build: BodyBuild = "media";
  if (shoulderToHeight < 0.205 && hipToHeight < 0.16) {
    build = "delgada";
  } else if (shoulderToHeight >= 0.245 && shoulderToHeight > hipToHeight * 1.32) {
    build = "atletica";
  } else if (hipToHeight >= 0.205) {
    build = "robusta";
  }

  return {
    heightCm: clamp(declaredHeightCm, 140, 210),
    build,
    ratios: {
      shoulderToHeight: Number(shoulderToHeight.toFixed(4)),
      hipToHeight: Number(hipToHeight.toFixed(4)),
      torsoToLeg: Number(torsoToLeg.toFixed(4)),
    },
  };
}

export { recommendSize } from "@/lib/fitHint";
