import { describe, expect, it, vi } from "vitest";
import type { PoseLandmarkLike } from "../bodyParams";
import { estimatePoseFromFile } from "../PhotoPoseEstimator";

function clearPose(): PoseLandmarkLike[] {
  const arr: PoseLandmarkLike[] = Array.from({ length: 33 }, () => ({
    x: 0.5,
    y: 0.5,
    visibility: 0.9,
  }));
  arr[11] = { x: 0.6, y: 0.2, visibility: 0.95 };
  arr[12] = { x: 0.4, y: 0.2, visibility: 0.95 };
  arr[23] = { x: 0.57, y: 0.52, visibility: 0.95 };
  arr[24] = { x: 0.43, y: 0.52, visibility: 0.95 };
  arr[27] = { x: 0.54, y: 0.9, visibility: 0.95 };
  arr[28] = { x: 0.46, y: 0.9, visibility: 0.95 };
  return arr;
}

describe("PhotoPoseEstimator ephemeral cleanup", () => {
  it("closes bitmap, clears canvas dimensions, and resets input on success", async () => {
    const closeSpy = vi.fn();
    const fakeBitmap = {
      width: 800,
      height: 1200,
      close: closeSpy,
    } as unknown as ImageBitmap;

    const clearRectSpy = vi.fn();
    const drawImageSpy = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: drawImageSpy, clearRect: clearRectSpy }),
    } as unknown as HTMLCanvasElement;

    const fakeInput = { value: "C:\\fakepath\\foto.jpg" } as unknown as HTMLInputElement;
    const fakeFile = new File(["bytes"], "foto.jpg", { type: "image/jpeg" });

    const res = await estimatePoseFromFile(fakeFile, 178, fakeInput, {
      createBitmap: vi.fn().mockResolvedValue(fakeBitmap),
      createCanvas: () => fakeCanvas,
      detectLandmarks: vi.fn().mockResolvedValue(clearPose()),
    });

    expect(res.ephemeralCleared).toBe(true);
    expect(closeSpy).toHaveBeenCalledTimes(1);
    expect(clearRectSpy).toHaveBeenCalledTimes(1);
    expect(fakeCanvas.width).toBe(0);
    expect(fakeCanvas.height).toBe(0);
    expect(fakeInput.value).toBe("");
  });

  it("revokes objectUrl and resets input even when landmark detection fails", async () => {
    const revokeSpy = vi.fn();
    const fakeCanvas = {
      width: 0,
      height: 0,
      getContext: () => ({ drawImage: vi.fn(), clearRect: vi.fn() }),
    } as unknown as HTMLCanvasElement;

    const fakeInput = { value: "foto.png" } as unknown as HTMLInputElement;
    const fakeFile = new File(["bad"], "foto.png", { type: "image/png" });

    const OriginalImage = globalThis.Image;
    class MockImage {
      naturalWidth = 400;
      naturalHeight = 600;
      onload: (() => void) | null = null;
      onerror: (() => void) | null = null;
      set src(_v: string) {
        queueMicrotask(() => this.onload?.());
      }
    }
    globalThis.Image = MockImage as unknown as typeof Image;

    try {
      await expect(
        estimatePoseFromFile(fakeFile, 170, fakeInput, {
          createBitmap: vi.fn().mockRejectedValue(new Error("no bitmap")),
          createObjectUrl: vi.fn().mockReturnValue("blob:fake-url"),
          revokeObjectUrl: revokeSpy,
          createCanvas: () => fakeCanvas,
          detectLandmarks: vi.fn().mockResolvedValue([]),
        }),
      ).rejects.toThrow();

      expect(revokeSpy).toHaveBeenCalledWith("blob:fake-url");
      expect(fakeCanvas.width).toBe(0);
      expect(fakeCanvas.height).toBe(0);
      expect(fakeInput.value).toBe("");
    } finally {
      globalThis.Image = OriginalImage;
    }
  });
});
