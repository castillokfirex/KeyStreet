import { cleanup, render, screen, within } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, describe, expect, it } from "vitest";
import type { ProductSummaryDto } from "@/lib/types";
import { ProductCard } from "../ProductCard";

function makeProduct(overrides: Partial<ProductSummaryDto> = {}): ProductSummaryDto {
  return {
    id: "p-1",
    slug: "nike-air-force-1-low-07-blanco",
    name: "Nike Air Force 1 Low '07",
    brand: "Nike",
    brandSlug: "nike",
    modelCode: "AF1",
    category: "SNEAKERS",
    silhouette: "LOW",
    shortDescription: "",
    badge: null,
    originalPriceCop: 185000,
    discountPercent: 10,
    discountPriceCop: 166500,
    finalPriceCop: 166500,
    hasDiscount: true,
    images: {
      basePath: "/assets/products/nike-air-force-1-low-07-blanco/",
      files: ["01-lateral.webp", "02-puesto.webp"],
      aspect: "4/5",
      ready: false,
    },
    availableSizes: [40, 41],
    styleTags: [],
    model3dReady: false,
    model3dUrl: "",
    isActive: true,
    ...overrides,
  };
}

function renderCard(product: ProductSummaryDto) {
  return render(
    <MemoryRouter>
      <ProductCard product={product} />
    </MemoryRouter>,
  );
}

describe("ProductCard editorial", () => {
  afterEach(cleanup);

  it("con images.ready === false no pide archivos (cero <img>) pero ofrece dos vistas", () => {
    const { container } = renderCard(makeProduct());
    expect(container.querySelectorAll("img")).toHaveLength(0);
    expect(container.querySelectorAll(".ks-card-slide")).toHaveLength(2);
  });

  it("muestra badge -X% OFF, precio anterior tachado y final, sin botón Añadir", () => {
    renderCard(makeProduct());
    const card = screen.getByTestId("product-card-nike-air-force-1-low-07-blanco");
    expect(within(card).getByText("-10% OFF")).toBeInTheDocument();
    expect(within(card).getByTestId("original-price")).toHaveTextContent("$185.000 COP");
    expect(within(card).getByTestId("final-price")).toHaveTextContent("$166.500 COP");
    expect(within(card).queryByText(/añadir/i)).toBeNull();
  });

  it("con fotos reales usa files[0] y files[1] para el hover", () => {
    const { container } = renderCard(
      makeProduct({
        images: {
          basePath: "/assets/products/x/",
          files: ["01-lateral.webp", "02-puesto.webp"],
          aspect: "4/5",
          ready: true,
        },
      }),
    );
    const sources = [...container.querySelectorAll("img")].map((img) => img.getAttribute("src"));
    expect(sources).toEqual(["/assets/products/x/01-lateral.webp", "/assets/products/x/02-puesto.webp"]);
  });

  it("con una sola foto real no inventa una segunda vista", () => {
    const { container } = renderCard(
      makeProduct({
        hasDiscount: false,
        discountPercent: 0,
        images: { basePath: "/a/", files: ["01.webp"], aspect: "4/5", ready: true },
      }),
    );
    expect(container.querySelectorAll(".ks-card-slide")).toHaveLength(1);
    expect(screen.queryByTestId("original-price")).toBeNull();
  });
});
