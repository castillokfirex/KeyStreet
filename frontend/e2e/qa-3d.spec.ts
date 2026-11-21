import { mkdirSync, readFileSync } from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

/**
 * QA visual de los modelos 3D (opt-in): abre cada producto en el Visor 3D y en
 * el Probador, exige el .glb con 200 y sin errores de carga/texturas en consola,
 * y guarda capturas en docs/qa-3d/{slug}.png y {slug}-probador.png.
 *
 *   QA_3D=1 QA_BASE_URL=http://localhost:5174 npx playwright test e2e/qa-3d.spec.ts --project=chromium
 */
const ROOT = path.resolve(process.cwd(), "..");
const OUT = path.join(ROOT, "docs", "qa-3d");
const BASE = process.env.QA_BASE_URL ?? "https://localhost";
const catalog = JSON.parse(
  readFileSync(path.join(ROOT, "scripts", "catalog", "catalog.json"), "utf8"),
) as { products: { slug: string }[] };

test.describe("QA 3D por producto", () => {
  test.skip(!process.env.QA_3D, "QA visual opt-in: define QA_3D=1");
  test.describe.configure({ mode: "serial" });

  test.beforeAll(() => {
    mkdirSync(OUT, { recursive: true });
  });

  for (const { slug } of catalog.products) {
    test(`visor y probador: ${slug}`, async ({ page }) => {
      test.setTimeout(90_000);
      const errors: string[] = [];
      page.on("console", (msg) => {
        if (msg.type() === "error") errors.push(msg.text());
      });
      page.on("pageerror", (err) => errors.push(String(err)));

      await page.goto(`${BASE}/producto/${slug}`);
      const glb = page.waitForResponse((res) => res.url().endsWith(`/assets/models/${slug}.glb`));
      await page.getByRole("button", { name: /Activar Visor 3D 360°/i }).click();
      expect((await glb).status()).toBe(200);

      const viewer = page.getByTestId("viewer3d-canvas-container");
      await expect(viewer.locator("canvas")).toBeVisible();
      await page.waitForTimeout(2000);
      await viewer.screenshot({ path: path.join(OUT, `${slug}.png`) });

      await page.getByRole("button", { name: "Probador 3D", exact: true }).click();
      const fitting = page.getByTestId("fitting-room");
      await expect(fitting.locator("canvas")).toBeVisible({ timeout: 30_000 });
      await page.getByRole("button", { name: /Zoom pies/i }).click();
      await page.waitForTimeout(2200);
      await fitting.screenshot({ path: path.join(OUT, `${slug}-probador.png`) });

      expect(
        errors.filter((e) => /texture|textura|404|Failed to load|Could not load|GLTF/i.test(e)),
      ).toEqual([]);
    });
  }
});
