import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { cleanup, fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { ProductSummaryDto } from "@/lib/types";
import { HeroShowcase, pickHeroProducts } from "../HeroShowcase";

function makeProduct(
  idx: number,
  overrides: Partial<ProductSummaryDto> = {},
): ProductSummaryDto {
  return {
    id: `p-${idx}`,
    slug: `sneaker-${idx}`,
    name: `Modelo ${idx}`,
    brand: `Marca ${idx}`,
    brandSlug: `marca-${idx}`,
    modelCode: `KS-${idx}`,
    category: "sneakers",
    silhouette: "LOW",
    shortDescription: `Par ${idx}`,
    badge: null,
    originalPriceCop: 300000,
    discountPercent: idx === 1 ? 10 : 0,
    discountPriceCop: idx === 1 ? 270000 : null,
    finalPriceCop: idx === 1 ? 270000 : 300000,
    hasDiscount: idx === 1,
    images: {
      basePath: `/assets/products/sneaker-${idx}/`,
      files: [`sneaker-${idx}-1.960.webp`],
      aspect: "4/5",
      ready: true,
    },
    availableSizes: [40],
    styleTags: [],
    model3dReady: true,
    model3dUrl: `/assets/models/sneaker-${idx}.glb`,
    isActive: true,
    ...overrides,
  };
}

afterEach(cleanup);

function renderHero(products: ProductSummaryDto[]) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter>
        <HeroShowcase initialProducts={products} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("pickHeroProducts", () => {
  it("descarta pares sin foto y respeta el límite", () => {
    const items = [
      makeProduct(1),
      makeProduct(2, {
        images: { basePath: "/x/", files: [], aspect: "4/5", ready: false },
      }),
      makeProduct(3),
      makeProduct(4),
    ];
    expect(pickHeroProducts(items, 2).map((p) => p.id)).toEqual(["p-1", "p-3"]);
  });
});

describe("HeroShowcase", () => {
  it("muestra el titular y el primer par con su precio con descuento", async () => {
    renderHero([makeProduct(1), makeProduct(2)]);
    expect(screen.getByRole("heading", { level: 1 })).toHaveTextContent(
      /pisa fuerte/i,
    );
    expect(
      await screen.findByAltText("Modelo 1", {}, { timeout: 5000 }),
    ).toBeInTheDocument();
    expect(screen.getByText("−10%")).toBeInTheDocument();
    expect(screen.getByRole("link", { name: /ver este par/i })).toHaveAttribute(
      "href",
      "/producto/sneaker-1",
    );
  });

  it("cambia de par al elegir otro segmento", async () => {
    renderHero([makeProduct(1), makeProduct(2), makeProduct(3)]);
    fireEvent.click(
      await screen.findByRole(
        "button",
        { name: "Ver Modelo 3" },
        { timeout: 5000 },
      ),
    );
    expect(
      screen.getByRole("button", { name: "Ver Modelo 3" }),
    ).toHaveAttribute("aria-current", "true");
    expect(screen.getByRole("link", { name: /ver este par/i })).toHaveAttribute(
      "href",
      "/producto/sneaker-3",
    );
  });

  it("sin pares con foto mantiene el mensaje sin vitrina", () => {
    renderHero([]);
    expect(screen.getByRole("heading", { level: 1 })).toBeInTheDocument();
    expect(
      screen.queryByRole("link", { name: /ver este par/i }),
    ).not.toBeInTheDocument();
  });
});
