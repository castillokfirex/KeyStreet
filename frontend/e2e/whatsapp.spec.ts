import { expect, test } from "@playwright/test";

test.describe("Flujo de pedido por WhatsApp", () => {
  test("exige talla seleccionada y abre wa.me con modelo, talla y precio", async ({
    page,
  }) => {
    await page.goto("/producto/nike-air-force-1-low-07-blanco");

    const whatsappBtn = page.getByRole("button", {
      name: /Pedir por WhatsApp/i,
    });
    await whatsappBtn.scrollIntoViewIfNeeded();
    await whatsappBtn.click();

    await expect(page.getByRole("alert")).toContainText(/Selecciona una talla/i);

    await page.getByRole("button", { name: "Talla 41" }).click();

    const [intentRes, popup] = await Promise.all([
      page.waitForResponse(
        (res) =>
          res.url().includes("/api/v1/public/orders/whatsapp-intent") &&
          res.status() === 200,
      ),
      page.waitForEvent("popup"),
      whatsappBtn.click(),
    ]);

    const body = (await intentRes.json()) as { whatsappUrl: string };
    expect(body.whatsappUrl).toMatch(/^https:\/\/wa\.me\/573176576059\?text=/);

    const popupUrl = popup.url();
    expect(popupUrl).toMatch(
      /^https:\/\/(wa\.me\/573176576059|api\.whatsapp\.com\/send\/\?phone=573176576059)/,
    );
    const decodedText =
      new URL(popupUrl).searchParams.get("text") ||
      decodeURIComponent(body.whatsappUrl.split("text=")[1] ?? "");
    expect(decodedText).toContain("Nike Air Force 1 '07");
    expect(decodedText).toContain("41");
    expect(decodedText).toContain("$526.400 COP");
    await popup.close();
  });
});
