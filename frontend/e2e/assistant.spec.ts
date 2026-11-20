import fs from "node:fs";
import path from "node:path";
import { expect, test } from "@playwright/test";

test.describe("Asistente IA Kast con citas verificadas", () => {
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

    const docsRes = await request.get("/api/v1/admin/documents", {
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "X-Tenant-Slug": "key-street",
      },
    });
    const docsData = (await docsRes.json()) as {
      items?: { status: string; title: string }[];
    };
    const hasIndexed = (docsData.items ?? []).some(
      (d) => d.status === "INDEXED",
    );

    if (!hasIndexed) {
      const pdfPath = path.resolve(
        process.cwd(),
        "../rag-service/tests/fixtures/guia_tallas.pdf",
      );
      const up = await request.post(
        "/api/v1/admin/documents?title=Gu%C3%ADa+de+tallas+2026",
        {
          headers: {
            Authorization: `Bearer ${accessToken}`,
            "X-Tenant-Slug": "key-street",
          },
          multipart: {
            file: {
              name: "guia_tallas.pdf",
              mimeType: "application/pdf",
              buffer: fs.readFileSync(pdfPath),
            },
          },
        },
      );
      if (up.status() === 202) {
        const created = (await up.json()) as { id: string };
        for (let i = 0; i < 20; i++) {
          const check = await request.get(
            `/api/v1/admin/documents/${created.id}`,
            {
              headers: {
                Authorization: `Bearer ${accessToken}`,
                "X-Tenant-Slug": "key-street",
              },
            },
          );
          const detail = (await check.json()) as { status: string };
          if (detail.status === "INDEXED") break;
          await new Promise((r) => setTimeout(r, 1500));
        }
      }
    }
  });

  test("abre FAB de Kast, responde pregunta sobre Samba OG y muestra cita con página", async ({
    page,
  }) => {
    await page.goto("/catalogo");
    await page.getByTestId("kast-fab").click();

    const input = page.getByLabel("Escribe tu pregunta para Kast");
    await expect(input).toBeVisible();
    await input.fill("¿El Adidas Samba OG tiene horma estrecha?");
    await page.getByRole("button", { name: /Enviar pregunta a Kast/i }).click();

    const citations = page.getByTestId("citation-list").first();
    await expect(citations).toBeVisible({ timeout: 25_000 });
    await expect(citations).toContainText(/pág(?:s)?\.\s*\d+/i);
  });
});
