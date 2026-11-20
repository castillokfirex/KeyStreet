import { expect, test } from "@playwright/test";

test.describe("Catálogo editorial y descuentos COP", () => {
  test("muestra 10 productos, 4 descuentos exactos, filtros y orden sincronizados", async ({
    page,
  }) => {
    await page.goto("/catalogo");

    const cards = page.locator('[data-testid^="product-card-"]');
    await expect(cards).toHaveCount(10);

    // Exactamente 4 modelos con badge -X% OFF
    const discountBadges = page.getByText(/^-\d+% OFF$/);
    await expect(discountBadges).toHaveCount(4);

    // Precios finales esperados en COP
    await expect(
      page
        .getByTestId("product-card-nike-air-force-1-low-07-blanco")
        .getByTestId("final-price"),
    ).toContainText("$166.500 COP");
    await expect(
      page.getByTestId("product-card-puma-suede-xl").getByTestId("final-price"),
    ).toContainText("$162.800 COP");
    await expect(
      page.getByTestId("product-card-new-balance-574").getByTestId("final-price"),
    ).toContainText("$154.000 COP");
    await expect(
      page
        .getByTestId("product-card-converse-chuck-taylor-all-star-clasico")
        .getByTestId("final-price"),
    ).toContainText("$144.500 COP");

    // Filtrar solo descuentos y ordenar por precio ascendente
    await page.getByRole("button", { name: /Solo descuentos/i }).click();
    await expect(page).toHaveURL(/discounted=true/);
    await expect(cards).toHaveCount(4);

    await page
      .getByLabel("Ordenar productos")
      .selectOption("price_asc");
    await expect(page).toHaveURL(/sort=price_asc/);

    const firstCard = cards.first();
    await expect(firstCard).toContainText("Converse Chuck Taylor All Star");
    await expect(firstCard.getByTestId("final-price")).toContainText(
      "$144.500 COP",
    );
  });
});
