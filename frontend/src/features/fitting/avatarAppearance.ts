import type { PoseLandmarkLike } from "./bodyParams";
import type { Swatch } from "./garments";

export type BodyStyle = "masculino" | "femenino";
export type HairStyle = "rapado" | "corto" | "urbano" | "ondulado" | "largo";
export type FacialHair = "ninguno" | "sombra" | "candado" | "completa";

export const BODY_STYLE_OPTIONS: { id: BodyStyle; label: string }[] = [
  { id: "masculino", label: "Hombre" },
  { id: "femenino", label: "Mujer" },
];

export const SKIN_TONES: Swatch[] = [
  { name: "Porcelana", hex: "#F5D8C6" },
  { name: "Marfil cálido", hex: "#ECC3A5" },
  { name: "Trigueño claro", hex: "#DFAC84" },
  { name: "Arena dorada", hex: "#CC9266" },
  { name: "Canela", hex: "#B2754B" },
  { name: "Caramelo", hex: "#915935" },
  { name: "Moreno profundo", hex: "#6D3F24" },
  { name: "Ébano", hex: "#4A2918" },
];

export const HAIR_STYLE_OPTIONS: { id: HairStyle; label: string }[] = [
  { id: "rapado", label: "Rapado" },
  { id: "corto", label: "Corto" },
  { id: "urbano", label: "Urbano" },
  { id: "ondulado", label: "Ondulado" },
  { id: "largo", label: "Largo" },
];

export const HAIR_COLORS: Swatch[] = [
  { name: "Negro azabache", hex: "#181616" },
  { name: "Castaño oscuro", hex: "#3A2518" },
  { name: "Castaño medio", hex: "#6B462B" },
  { name: "Rubio miel", hex: "#C49A52" },
  { name: "Cobrizo", hex: "#8C3B23" },
  { name: "Gris plata", hex: "#BDBFC4" },
];

export const FACIAL_HAIR_OPTIONS: { id: FacialHair; label: string }[] = [
  { id: "ninguno", label: "Sin barba" },
  { id: "sombra", label: "Sombra" },
  { id: "candado", label: "Candado" },
  { id: "completa", label: "Completa" },
];

export const DEFAULT_APPEARANCE = {
  bodyStyle: "masculino" as BodyStyle,
  skinTone: SKIN_TONES[2].hex,
  hairStyle: "corto" as HairStyle,
  hairColor: HAIR_COLORS[0].hex,
  facialHair: "ninguno" as FacialHair,
};

function hexToRgb(hex: string): [number, number, number] {
  const n = parseInt(hex.slice(1), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function luminance(r: number, g: number, b: number): number {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  return sorted[Math.floor(sorted.length / 2)] ?? 0;
}

function nearestSwatch(r: number, g: number, b: number, palette: Swatch[]): string {
  let best = palette[0].hex;
  let bestDist = Infinity;
  for (const sw of palette) {
    const [sr, sg, sb] = hexToRgb(sw.hex);
    // Distancia perceptual ponderada (prioriza luminancia y calidez natural)
    const dr = r - sr;
    const dg = g - sg;
    const db = b - sb;
    const d = 0.34 * dr * dr + 0.46 * dg * dg + 0.2 * db * db;
    if (d < bestDist) {
      bestDist = d;
      best = sw.hex;
    }
  }
  return best;
}

/** Mezcla dos colores hexadecimales (útil para sombras de barba o subtonos de piel). */
export function blendHex(hexA: string, hexB: string, ratioB = 0.5): string {
  const [ar, ag, ab] = hexToRgb(hexA);
  const [br, bg, bb] = hexToRgb(hexB);
  const t = Math.max(0, Math.min(1, ratioB));
  const r = Math.round(ar * (1 - t) + br * t);
  const g = Math.round(ag * (1 - t) + bg * t);
  const b = Math.round(ab * (1 - t) + bb * t);
  return `#${((1 << 24) | (r << 16) | (g << 8) | b).toString(16).slice(1)}`;
}

/**
 * Muestrea tono de piel y color de cabello desde un <canvas> efímero usando
 * los landmarks de MediaPipe. No conserva píxeles ni envía datos fuera del equipo.
 */
export function sampleAppearanceFromImageData(
  getPatch: (x: number, y: number, w: number, h: number) => Uint8ClampedArray | number[],
  width: number,
  height: number,
  landmarks: PoseLandmarkLike[],
): { skinTone?: string; hairColor?: string } {
  if (!width || !height || !landmarks?.length) return {};

  const skinR: number[] = [];
  const skinG: number[] = [];
  const skinB: number[] = [];

  const sampleRegion = (
    nx: number,
    ny: number,
    radiusPx: number,
    accept: (r: number, g: number, b: number, lum: number) => boolean,
    outR: number[],
    outG: number[],
    outB: number[],
  ) => {
    const cx = Math.round(Math.max(0, Math.min(width - 1, nx * width)));
    const cy = Math.round(Math.max(0, Math.min(height - 1, ny * height)));
    const x0 = Math.max(0, cx - radiusPx);
    const y0 = Math.max(0, cy - radiusPx);
    const pw = Math.max(1, Math.min(width - x0, radiusPx * 2 + 1));
    const ph = Math.max(1, Math.min(height - y0, radiusPx * 2 + 1));
    const data = getPatch(x0, y0, pw, ph);
    for (let i = 0; i + 3 < data.length; i += 4) {
      const a = data[i + 3] ?? 255;
      if (a < 128) continue;
      const r = data[i];
      const g = data[i + 1];
      const b = data[i + 2];
      const lum = luminance(r, g, b);
      if (accept(r, g, b, lum)) {
        outR.push(r);
        outG.push(g);
        outB.push(b);
      }
    }
  };

  // Rostro (nariz y mejillas) + muñecas si son visibles
  const faceIndices = [0, 2, 5, 9, 10, 15, 16];
  const patchRadius = Math.max(2, Math.round(Math.min(width, height) * 0.015));
  for (const idx of faceIndices) {
    const lm = landmarks[idx];
    if (!lm || (lm.visibility ?? 0) < 0.5) continue;
    sampleRegion(
      lm.x,
      lm.y,
      patchRadius,
      (r, g, b, lum) => lum >= 0.08 && lum <= 0.9 && r >= g * 0.92 && r >= b * 0.96,
      skinR,
      skinG,
      skinB,
    );
  }

  let skinTone: string | undefined;
  if (skinR.length >= 4) {
    skinTone = nearestSwatch(median(skinR), median(skinG), median(skinB), SKIN_TONES);
  }

  // Cabello justo por encima de la frente
  const nose = landmarks[0];
  const leftSh = landmarks[11];
  const rightSh = landmarks[12];
  let hairColor: string | undefined;
  if (nose && (nose.visibility ?? 0) >= 0.5) {
    const shY =
      leftSh && rightSh
        ? (leftSh.y + rightSh.y) / 2
        : (leftSh?.y ?? rightSh?.y ?? nose.y + 0.14);
    const headSpan = Math.max(0.035, Math.min(0.18, Math.abs(shY - nose.y)));
    const hairY = Math.max(0.01, nose.y - headSpan * 0.58);
    const hairR: number[] = [];
    const hairG: number[] = [];
    const hairB: number[] = [];
    sampleRegion(
      nose.x,
      hairY,
      patchRadius,
      (_r, _g, _b, lum) => lum >= 0.03 && lum <= 0.88,
      hairR,
      hairG,
      hairB,
    );
    if (hairR.length >= 4) {
      hairColor = nearestSwatch(median(hairR), median(hairG), median(hairB), HAIR_COLORS);
    }
  }

  return { skinTone, hairColor };
}
