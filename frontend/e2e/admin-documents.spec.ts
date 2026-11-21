import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("Panel Admin — Ingesta efímera y validaciones PDF", () => {
  test.beforeAll(async ({ request }) => {
    const loginRes = await request.post("/api/v1/auth/login", {
      headers: { "X-Tenant-Slug": "key-street" },
      data: {
        email: "admin@keystreet.co",
        password: "KeyStreet2026!",
      },
    });
    expect(loginRes.ok()).toBe(true);
    const { accessToken } = (await loginRes.json()) as { accessToken: string };
    const listRes = await request.get("/api/v1/admin/documents", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Tenant-Slug": "key-street",
      },
    });
    const docs = (await listRes.json()) as {
      items?: { id: string; originalFilename: string }[];
    };
    for (const d of docs.items ?? []) {
      if (d.originalFilename === "guia_tallas.pdf") {
        await request.delete(`/api/v1/admin/documents/${d.id}`, {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Tenant-Slug": "key-street",
          },
        });
      }
    }
  });

  test("sube PDF válido -> INDEXED + borrado verificado, y rechaza PDF falso (415)", async ({
    page,
  }) => {
    await page.goto("/admin/login");
    await page.getByLabel("Correo electrónico").fill("admin@keystreet.co");
    await page.getByLabel("Contraseña").fill("KeyStreet2026!");
    await page.getByRole("button", { name: /Ingresar al panel/i }).click();

    await expect(page).toHaveURL(/\/admin\/documents/);

    const validPdf = path.resolve(
      process.cwd(),
      "../rag-service/tests/fixtures/guia_tallas.pdf",
    );
    await page.getByLabel(/Archivo PDF/i).setInputFiles(validPdf);
    await page.getByRole("button", { name: /^Indexar$/i }).click();

    const row = page.locator("tr", { hasText: "guia_tallas.pdf" });
    await expect(row).toContainText("INDEXED", { timeout: 45_000 });
    await expect(row).toContainText("eliminado ✓ verificado");

    // Intento de subir archivo texto renombrado a .pdf -> error HTTP 415 visible
    await page.getByLabel(/Archivo PDF/i).setInputFiles({
      name: "falso.pdf",
      mimeType: "application/pdf",
      buffer: Buffer.from("Este archivo NO es un PDF valido"),
    });
    await page.getByLabel(/Título del documento/i).fill("Archivo falso");
    await page.getByRole("button", { name: /^Indexar$/i }).click();

    await expect(page.getByRole("alert")).toContainText("Error 415", {
      timeout: 15_000,
    });
  });
});
