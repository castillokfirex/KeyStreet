export type TopGarment = "camiseta" | "buso";
export type BottomGarment = "mochos" | "pantaloneta" | "sudadera";

export const TOP_GARMENT_OPTIONS: { id: TopGarment; label: string }[] = [
  { id: "camiseta", label: "Camiseta" },
  { id: "buso", label: "Buso Hoodie" },
];

export const BOTTOM_GARMENT_OPTIONS: { id: BottomGarment; label: string }[] = [
  { id: "mochos", label: "Mochos (Bermuda)" },
  { id: "pantaloneta", label: "Pantaloneta" },
  { id: "sudadera", label: "Sudadera Jogger" },
];

export const GARMENT_SWATCHES: { name: string; hex: string }[] = [
  { name: "Grafito Noir", hex: "#1F2937" },
  { name: "Gris Humo", hex: "#525866" },
  { name: "Arena Stone", hex: "#D6D3D1" },
  { name: "Verde Bosque", hex: "#16302B" },
  { name: "Azul Marino", hex: "#0F172A" },
  { name: "Blanco Hueso", hex: "#E5E7EB" },
];
