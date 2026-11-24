import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("Probador anatómico 3D con foto efímera", () => {
  test("procesa foto localmente sin enviarla a red, limpia blobs y cambia prendas/cámara", async ({
    page,
  }) => {
    const uploadedImageRequests: string[] = [];
    page.on("request", (req) => {
      const ct = req.headers()["content-type"] ?? "";
      if (ct.includes("multipart") || ct.startsWith("image/")) {
        uploadedImageRequests.push(`${req.method()} ${req.url()}`);
      }
    });

    await page.goto("/producto/nike-air-force-1-low-07-blanco/probador");
    const fittingRoom = page.getByTestId("fitting-room");
    await expect(fittingRoom).toBeVisible();
    await expect(fittingRoom).toHaveAttribute("data-camera-mode", "full");
    await expect(fittingRoom.locator("canvas")).toBeVisible();

    const fixturePath = path.resolve(
      process.cwd(),
      "e2e/fixtures/full-body.jpg",
    );
    await page.getByTestId("fitting-photo-input").setInputFiles(fixturePath);

    await expect(page.getByText("Foto eliminada ✓")).toBeVisible({
      timeout: 45_000,
    });
    expect(uploadedImageRequests).toEqual([]);
    await expect(page.locator('img[src^="blob:"]')).toHaveCount(0);

    // Ropa: cada prenda con su propio tipo y color
    await page.getByRole("tab", { name: /Ropa/ }).click();
    const hoodieBtn = page.getByRole("button", { name: "Hoodie" });
    await hoodieBtn.click();
    await expect(hoodieBtn).toHaveAttribute("aria-pressed", "true");

    const joggerBtn = page.getByRole("button", { name: "Jogger" });
    await joggerBtn.click();
    await expect(joggerBtn).toHaveAttribute("aria-pressed", "true");

    await page.getByRole("radiogroup", { name: "Color de la parte de arriba" }).getByRole("radio", { name: "Negro" }).click();
    await page.getByRole("radiogroup", { name: "Color de la parte de abajo" }).getByRole("radio", { name: "Blanco hueso" }).click();
    await expect(
      page.getByRole("radiogroup", { name: "Color de la parte de arriba" }).getByRole("radio", { name: "Negro" }),
    ).toHaveAttribute("aria-checked", "true");

    // Zoom directo a los zapatos
    const zoomFeetBtn = page.getByRole("button", { name: /Zoom pies/i });
    await zoomFeetBtn.click();
    await expect(fittingRoom).toHaveAttribute("data-camera-mode", "feet");
  });
});
