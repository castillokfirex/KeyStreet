import { describe, expect, it } from "vitest";
import {
  computeMannequinScale,
  computeParamsFromLandmarks,
  footLengthCm,
  recommendSize,
  type PoseLandmarkLike,
} from "../bodyParams";

function makePose(widthScale = 1.0, visibility = 0.95): PoseLandmarkLike[] {
  const arr: PoseLandmarkLike[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.9,
  }));
  arr[11] = { x: 0.5 + 0.08 * widthScale, y: 0.22, visibility };
  arr[12] = { x: 0.5 - 0.08 * widthScale, y: 0.22, visibility };
  arr[23] = { x: 0.5 + 0.06 * widthScale, y: 0.52, visibility };
  arr[24] = { x: 0.5 - 0.06 * widthScale, y: 0.52, visibility };
  arr[27] = { x: 0.5 + 0.05, y: 0.88, visibility };
  arr[28] = { x: 0.5 - 0.05, y: 0.88, visibility };
  return arr;
}

describe("bodyParams anatomical calculations", () => {
  it("calculates EU foot length accurately", () => {
    expect(footLengthCm(40)).toBeCloseTo(25.17, 1);
    expect(footLengthCm(36)).toBeCloseTo(22.5, 1);
    expect(footLengthCm(44)).toBeCloseTo(27.83, 1);
  });

  it("scales mannequin dimensions smoothly within height & build ranges", () => {
    const slim = computeMannequinScale({
      heightCm: 165,
      build: "delgada",
      usualSizeEu: 38,
    });
    const robust = computeMannequinScale({
      heightCm: 190,
      build: "robusta",
      usualSizeEu: 43,
    });
    expect(robust.heightScale).toBeGreaterThan(slim.heightScale);
    expect(robust.shoulderScale).toBeGreaterThan(slim.shoulderScale);
    expect(robust.footScale).toBeGreaterThan(slim.footScale);
  });

  it("rejects pose landmarks when key visibility <= 0.6", () => {
    const blurry = makePose(1.0, 0.45);
    expect(() => computeParamsFromLandmarks(blurry, 175)).toThrow(/Visibilidad insuficiente/i);
  });

  it("extracts clamped anatomical ratios when pose landmarks are clear", () => {
    const good = makePose(1.15, 0.92);
    const out = computeParamsFromLandmarks(good, 178);
    expect(out.heightCm).toBe(178);
    expect(out.ratios.shoulderToHeight).toBeGreaterThanOrEqual(0.17);
    expect(out.ratios.shoulderToHeight).toBeLessThanOrEqual(0.31);
  });

  it("recommends +1 on RUNS_SMALL and exact size on TRUE_TO_SIZE", () => {
    expect(recommendSize(40, "RUNS_SMALL").sizeEu).toBe(41);
    expect(recommendSize(44, "RUNS_SMALL").sizeEu).toBe(44);
    expect(recommendSize(40, "TRUE_TO_SIZE").sizeEu).toBe(40);
    expect(recommendSize(40, "RUNS_LARGE").sizeEu).toBe(39);
  });
});
