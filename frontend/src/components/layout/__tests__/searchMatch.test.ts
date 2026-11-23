import { describe, expect, it } from "vitest";
import type { ProductSummaryDto } from "@/lib/types";
import { normalize, searchProducts } from "../searchMatch";

const p = (slug: string, name: string, brand: string, modelCode: string) =>
  ({ id: slug, slug, name, brand, modelCode }) as ProductSummaryDto;

const CATALOG = [
  p("af1", "Nike Air Force 1 '07 (Blanco)", "Nike", "AF1"),
  p("aj1", "Air Jordan 1 Low (Blanco / Azul marino)", "Jordan", "AJ1L"),
  p("aj4", "Air Jordan 4 Retro (White Cement)", "Jordan", "AJ4"),
  p("nb550", "New Balance 550 (Blanco / Burdeos)", "New Balance", "550"),
  p("nb530", "New Balance 530 (Blanco / Plata)", "New Balance", "530"),
  p("chuck", "Converse Chuck Taylor All Star (Bota / Clásico)", "Converse", "CTA"),
  p("samba", "Adidas Samba OG (Blanco / Negro)", "Adidas", "SMB"),
  p("stan", "Adidas Stan Smith (Blanco / Verde)", "Adidas", "STS"),
  p("super", "Adidas Superstar (Blanco / Negro)", "Adidas", "SST"),
  p("campus", "Adidas Campus 00s (Café / Blanco)", "Adidas", "C00S"),
];

const slugs = (q: string) => searchProducts(CATALOG, q).map((x) => x.slug);

describe("searchProducts", () => {
  it("entiende siglas y códigos de modelo", () => {
    expect(slugs("af1")[0]).toBe("af1");
    expect(slugs("AJ4")[0]).toBe("aj4");
    expect(slugs("ctas")).toEqual(["chuck"]);
    expect(slugs("nb 550")[0]).toBe("nb550");
  });

  it("busca por nombre o marca sin importar tildes", () => {
    expect(slugs("samba")).toEqual(["samba"]);
    expect(slugs("cafe")).toEqual(["campus"]);
    expect(slugs("jordan")).toEqual(expect.arrayContaining(["aj1", "aj4"]));
  });

  it("devuelve como máximo 3 pares", () => {
    expect(slugs("adidas")).toHaveLength(3);
  });

  it("no inventa coincidencias", () => {
    expect(slugs("xyz")).toEqual([]);
    expect(slugs("")).toEqual([]);
  });

  it("normaliza texto", () => {
    expect(normalize("Air Force 1 '07 (Café)")).toBe("air force 1 07 cafe");
  });
});
