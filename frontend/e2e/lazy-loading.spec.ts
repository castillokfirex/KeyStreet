import { expect, test } from "@playwright/test";

const HEAVY_ASSET_RE =
  /vendor-(three|r3f|mediapipe)|pose_landmarker|\.wasm|\.glb/i;

test.describe("Lazy loading de módulos 3D y MediaPipe", () => {
  test("Home y Catálogo no descargan Three.js, R3F ni MediaPipe; detalle los carga bajo demanda", async ({
    page,
  }) => {
    const heavyRequests: string[] = [];
    page.on("request", (req) => {
      const url = req.url();
      if (HEAVY_ASSET_RE.test(url)) {
        heavyRequests.push(url);
      }
    });

    await page.goto("/");
    await expect(
      page.getByRole("heading", { level: 1 }),
    ).toBeVisible();
    expect(heavyRequests).toEqual([]);

    await page.goto("/catalogo");
    await expect(page.locator('[data-testid^="product-card-"]')).toHaveCount(10);
    expect(heavyRequests).toEqual([]);

    await page.goto("/producto/nike-air-force-1-low-07-blanco");
    await expect(
      page.getByRole("button", { name: /Activar Visor 3D 360°/i }),
    ).toBeVisible();
    expect(heavyRequests).toEqual([]);

    // Solo al activar el visor se carga el runtime 3D (MediaPipe sigue en 0)
    await page.getByRole("button", { name: /Activar Visor 3D 360°/i }).click();
    await expect(
      page.locator('[data-testid="viewer3d-canvas-container"] canvas'),
    ).toBeVisible();
    expect(
      heavyRequests.some((u) => /vendor-(three|r3f)/i.test(u)),
    ).toBe(true);
    expect(
      heavyRequests.some((u) => /mediapipe|pose_landmarker|\.wasm/i.test(u)),
    ).toBe(false);
  });
});
