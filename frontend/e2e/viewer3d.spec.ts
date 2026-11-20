import { expect, test } from "@playwright/test";

test.describe("Visor 3D 360° e interacción de hotspots", () => {
  test("renderiza canvas 3D y muestra tarjeta de material en hotspot", async ({
    page,
  }) => {
    await page.goto("/producto/nike-air-force-1-low-07-blanco");
    await page.getByRole("button", { name: /Activar Visor 3D 360°/i }).click();

    const canvas = page.locator(
      '[data-testid="viewer3d-canvas-container"] canvas',
    );
    await expect(canvas).toBeVisible();

    const upperPin = page.getByTestId("hotspot-pin-upper");
    await expect(upperPin).toBeVisible();
    await upperPin.click();

    const card = page.getByTestId("hotspot-card-upper");
    await expect(card).toBeVisible();
    await expect(card).toContainText("Cuero plena flor");
    await expect(
      card.getByRole("button", { name: /Preguntar a Kast/i }),
    ).toBeVisible();
  });
});
