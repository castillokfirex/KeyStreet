import { expect, test } from "@playwright/test";

test.describe("Catálogo editorial y descuentos COP", () => {
  test("muestra 15 productos, 4 descuentos exactos, filtros y orden sincronizados", async ({
    page,
  }) => {
    await page.goto("/catalogo");

    const cards = page.locator('[data-testid^="product-card-"]');
    await expect(cards).toHaveCount(15);

    // Exactamente 4 modelos con badge -X% OFF
    const discountBadges = page.getByText(/^-\d+% OFF$/);
    await expect(discountBadges).toHaveCount(4);

    // Precios finales esperados en COP (db/migrations/V002)
    await expect(
      page
        .getByTestId("product-card-nike-air-force-1-low-07-blanco")
        .getByTestId("final-price"),
    ).toContainText("$526.400 COP");
    await expect(
      page.getByTestId("product-card-puma-suede-xl").getByTestId("final-price"),
    ).toContainText("$395.900 COP");
    await expect(
      page.getByTestId("product-card-new-balance-530").getByTestId("final-price"),
    ).toContainText("$466.300 COP");
    await expect(
      page
        .getByTestId("product-card-converse-chuck-taylor-all-star-clasico")
        .getByTestId("final-price"),
    ).toContainText("$254.900 COP");

    // Filtrar solo descuentos y ordenar por precio ascendente
    await page.getByRole("button", { name: /Solo descuentos/i }).click();
    await expect(page).toHaveURL(/discounted=true/);
    await expect(cards).toHaveCount(4);

    await page.getByRole("button", { name: /Ordenar productos/ }).click();
    await page.getByRole("option", { name: "Precio: menor a mayor" }).click();
    await expect(page).toHaveURL(/sort=price_asc/);

    const firstCard = cards.first();
    await expect(firstCard).toContainText("Converse Chuck Taylor All Star");
    await expect(firstCard.getByTestId("final-price")).toContainText(
      "$254.900 COP",
    );
  });
});
