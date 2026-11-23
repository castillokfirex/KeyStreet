import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it } from "vitest";
import type { ProductSummaryDto } from "@/lib/types";
import {
  curateShowcaseProducts,
  EditorialSneakerCarousel,
} from "../EditorialSneakerCarousel";

function makeProduct(
  idx: number,
  overrides: Partial<ProductSummaryDto> = {},
): ProductSummaryDto {
  return {
    id: `p-${idx}`,
    slug: `sneaker-${idx}`,
    name: `Modelo Editorial ${idx}`,
    brand: `Marca ${idx}`,
    brandSlug: `marca-${idx}`,
    modelCode: `KS-${idx}`,
    category: "sneakers",
    silhouette: idx % 2 === 0 ? "LOW" : "HIGH",
    shortDescription: `Descripción corta del par ${idx}.`,
    badge: idx === 1 ? "DESTACADO" : null,
    originalPriceCop: 220000,
    discountPercent: idx === 1 ? 15 : 0,
    discountPriceCop: idx === 1 ? 187000 : null,
    finalPriceCop: idx === 1 ? 187000 : 220000,
    hasDiscount: idx === 1,
    images: {
      basePath: `/assets/products/sneaker-${idx}/`,
      files: [`sneaker-${idx}-1.960.webp`],
      aspect: "4/5",
      ready: true,
    },
    availableSizes: [38, 39, 40],
    styleTags: ["clasico"],
    model3dReady: true,
    model3dUrl: `/assets/models/sneaker-${idx}.glb`,
    isActive: true,
    ...overrides,
  };
}

function renderCarousel(products: ProductSummaryDto[]) {
  const qc = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <EditorialSneakerCarousel initialProducts={products} />
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

describe("EditorialSneakerCarousel", () => {
  it("curateShowcaseProducts prioriza variedad de marcas hasta el límite", () => {
    const items = [
      makeProduct(1, { brand: "Nike", brandSlug: "nike" }),
      makeProduct(2, { brand: "Nike", brandSlug: "nike" }),
      makeProduct(3, { brand: "Adidas", brandSlug: "adidas" }),
      makeProduct(4, { brand: "Puma", brandSlug: "puma" }),
      makeProduct(5, { brand: "Vans", brandSlug: "vans" }),
      makeProduct(6, { brand: "Converse", brandSlug: "converse" }),
      makeProduct(7, { brand: "New Balance", brandSlug: "new-balance" }),
    ];

    const curated = curateShowcaseProducts(items, 6);
    expect(curated).toHaveLength(6);
    expect(new Set(curated.map((p) => p.brandSlug)).size).toBe(6);
  });

  it("renderiza el primer producto con contador, precio COP, descuento y enlace al detalle", () => {
    const products = [makeProduct(1), makeProduct(2), makeProduct(3)];
    renderCarousel(products);

    expect(screen.getByText("01 / 03")).toBeInTheDocument();
    expect(screen.getByText("Modelo Editorial 1")).toBeInTheDocument();
    expect(screen.getByText("$187.000 COP")).toBeInTheDocument();
    expect(screen.getByText("$220.000 COP")).toBeInTheDocument();

    const cta = screen.getByRole("link", { name: /explorar silueta/i });
    expect(cta).toHaveAttribute("href", "/producto/sneaker-1");
  });

  it("permite cambiar de slide con flechas e indicadores inferiores", async () => {
    const products = [makeProduct(1), makeProduct(2), makeProduct(3)];
    renderCarousel(products);

    const nextBtns = screen.getAllByRole("button", { name: /siguiente silueta/i });
    fireEvent.click(nextBtns[0]);
    const tabs = screen.getAllByRole("tab");
    expect(tabs[1]).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("02 / 03")).toBeInTheDocument();

    fireEvent.click(tabs[2]);
    expect(tabs[2]).toHaveAttribute("aria-selected", "true");
    expect(await screen.findByText("03 / 03")).toBeInTheDocument();
  });
});
