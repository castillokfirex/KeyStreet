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

    await page.goto("/producto/nike-air-force-1-low-07-blanco?modo=probador");
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

    // Prendas básicas de un solo tono
    const camisetaBtn = page.getByRole("button", { name: "Camiseta" });
    await camisetaBtn.click();
    await expect(camisetaBtn).toHaveAttribute("aria-pressed", "true");

    const sudaderaBtn = page.getByRole("button", { name: "Sudadera Jogger" });
    await sudaderaBtn.click();
    await expect(sudaderaBtn).toHaveAttribute("aria-pressed", "true");

    // Zoom directo a los zapatos
    const zoomFeetBtn = page.getByRole("button", { name: /Zoom pies/i });
    await zoomFeetBtn.click();
    await expect(fittingRoom).toHaveAttribute("data-camera-mode", "feet");
  });
});
