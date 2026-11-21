import { cleanup, render } from "@testing-library/react";
import { afterEach, describe, expect, it } from "vitest";
import type { ProductImages } from "@/lib/types";
import { ProductImage } from "../ProductImage";

const normalized: ProductImages = {
  basePath: "/assets/products/adidas-stan-smith/",
  files: ["adidas-stan-smith-1.960.webp", "adidas-stan-smith-2.960.webp"],
  aspect: "4/5",
  ready: true,
};

describe("ProductImage", () => {
  afterEach(cleanup);

  it("sirve AVIF y WebP con srcset 480/960/1440 para archivos normalizados", () => {
    const { container } = render(<ProductImage images={normalized} alt="Stan Smith" />);
    const [avif, webp] = [...container.querySelectorAll("source")];
    expect(avif).toHaveAttribute("type", "image/avif");
    expect(avif.getAttribute("srcset")).toBe(
      "/assets/products/adidas-stan-smith/adidas-stan-smith-1.480.avif 480w, " +
        "/assets/products/adidas-stan-smith/adidas-stan-smith-1.960.avif 960w, " +
        "/assets/products/adidas-stan-smith/adidas-stan-smith-1.1440.avif 1440w",
    );
    expect(webp).toHaveAttribute("type", "image/webp");
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/assets/products/adidas-stan-smith/adidas-stan-smith-1.960.webp");
    expect(img).toHaveAttribute("alt", "Stan Smith");
  });

  it("usa el índice de galería y deja alt vacío en vistas secundarias", () => {
    const { container } = render(<ProductImage images={normalized} alt="Stan Smith" index={1} />);
    const img = container.querySelector("img");
    expect(img).toHaveAttribute("src", "/assets/products/adidas-stan-smith/adidas-stan-smith-2.960.webp");
    expect(img).toHaveAttribute("alt", "");
  });

  it("con ready=false no construye ninguna URL (cero 404)", () => {
    const { container } = render(
      <ProductImage images={{ ...normalized, ready: false }} alt="Stan Smith" />,
    );
    expect(container.querySelector("img, source")).toBeNull();
  });

  it("archivos con otro nombre se sirven tal cual, sin srcset", () => {
    const { container } = render(
      <ProductImage
        images={{ basePath: "/x/", files: ["01-lateral.webp"], aspect: "4/5", ready: true }}
        alt="X"
      />,
    );
    expect(container.querySelector("source")).toBeNull();
    expect(container.querySelector("img")).toHaveAttribute("src", "/x/01-lateral.webp");
  });
});
