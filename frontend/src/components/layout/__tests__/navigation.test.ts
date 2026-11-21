import { describe, expect, it } from "vitest";
import { CATEGORY_NAV, isNavActive, MAIN_NAV } from "../navigation";

describe("navegación del storefront", () => {
  it("solo usa filtros soportados por GET /public/products", () => {
    const allowed = new Set(["silhouette", "tags", "discounted", "sort"]);
    for (const item of [...MAIN_NAV, ...CATEGORY_NAV]) {
      const url = new URL(item.to, "http://ks.local");
      expect(url.pathname).toBe("/catalogo");
      for (const key of url.searchParams.keys()) {
        expect(allowed.has(key)).toBe(true);
      }
    }
  });

  it("marca activo el segmento cuyos parámetros están en la URL", () => {
    expect(isNavActive("/catalogo?tags=retro", "/catalogo", "?tags=retro&sort=price_asc")).toBe(true);
    expect(isNavActive("/catalogo?tags=retro", "/catalogo", "?tags=skate")).toBe(false);
    expect(isNavActive("/catalogo?discounted=true", "/", "")).toBe(false);
  });

  it("'Sneakers' solo está activo en el catálogo completo", () => {
    expect(isNavActive("/catalogo", "/catalogo", "")).toBe(true);
    expect(isNavActive("/catalogo", "/catalogo", "?sort=price_asc")).toBe(true);
    expect(isNavActive("/catalogo", "/catalogo", "?silhouette=LOW")).toBe(false);
    expect(isNavActive("/catalogo", "/catalogo", "?sort=newest")).toBe(false);
  });
});
