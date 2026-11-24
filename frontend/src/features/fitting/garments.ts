export type TopGarment = "camiseta" | "oversize" | "hoodie" | "camisa";
export type BottomGarment =
  "jean" | "jogger" | "cargo" | "mochos" | "pantaloneta";
export type SockStyle = "ninguna" | "tobilleras" | "altas";

export interface Swatch {
  name: string;
  hex: string;
}

export interface Outfit {
  top: { type: TopGarment; color: string };
  bottom: { type: BottomGarment; color: string };
  socks: { type: SockStyle; color: string };
}

export const TOP_GARMENT_OPTIONS: { id: TopGarment; label: string }[] = [
  { id: "camiseta", label: "Camiseta" },
  { id: "oversize", label: "Oversize" },
  { id: "hoodie", label: "Hoodie" },
  { id: "camisa", label: "Camisa" },
];

export const BOTTOM_GARMENT_OPTIONS: { id: BottomGarment; label: string }[] = [
  { id: "jean", label: "Jean" },
  { id: "jogger", label: "Jogger" },
  { id: "cargo", label: "Cargo" },
  { id: "mochos", label: "Mochos" },
  { id: "pantaloneta", label: "Pantaloneta" },
];

export const SOCK_OPTIONS: { id: SockStyle; label: string }[] = [
  { id: "tobilleras", label: "Tobilleras" },
  { id: "altas", label: "Altas" },
  { id: "ninguna", label: "Sin medias" },
];

export const TOP_COLORS: Swatch[] = [
  { name: "Blanco", hex: "#F4F4F2" },
  { name: "Negro", hex: "#161616" },
  { name: "Gris jaspe", hex: "#9A9DA3" },
  { name: "Arena", hex: "#D6CBB8" },
  { name: "Verde bosque", hex: "#1F3A2E" },
  { name: "Azul marino", hex: "#1B2A44" },
  { name: "Vinotinto", hex: "#5C1F2A" },
  { name: "Café", hex: "#6B4A33" },
];

export const BOTTOM_COLORS: Swatch[] = [
  { name: "Denim claro", hex: "#8FA6C2" },
  { name: "Denim medio", hex: "#4E6A93" },
  { name: "Denim oscuro", hex: "#26344D" },
  { name: "Negro", hex: "#161616" },
  { name: "Gris", hex: "#6E7178" },
  { name: "Arena", hex: "#CBBFA7" },
  { name: "Verde oliva", hex: "#55593A" },
  { name: "Blanco hueso", hex: "#ECE8DF" },
];

export const SOCK_COLORS: Swatch[] = [
  { name: "Blanco", hex: "#F7F7F5" },
  { name: "Negro", hex: "#1A1A1A" },
  { name: "Gris", hex: "#A3A6AB" },
];

export const OUTFIT_PRESETS: { id: string; label: string; outfit: Outfit }[] = [
  {
    id: "clasico",
    label: "Clásico",
    outfit: {
      top: { type: "camiseta", color: "#F4F4F2" },
      bottom: { type: "jean", color: "#4E6A93" },
      socks: { type: "tobilleras", color: "#F7F7F5" },
    },
  },
  {
    id: "urbano",
    label: "Urbano",
    outfit: {
      top: { type: "hoodie", color: "#161616" },
      bottom: { type: "cargo", color: "#55593A" },
      socks: { type: "altas", color: "#F7F7F5" },
    },
  },
  {
    id: "verano",
    label: "Verano",
    outfit: {
      top: { type: "oversize", color: "#D6CBB8" },
      bottom: { type: "mochos", color: "#161616" },
      socks: { type: "tobilleras", color: "#F7F7F5" },
    },
  },
  {
    id: "monocromo",
    label: "Monocromo",
    outfit: {
      top: { type: "hoodie", color: "#9A9DA3" },
      bottom: { type: "jogger", color: "#6E7178" },
      socks: { type: "altas", color: "#A3A6AB" },
    },
  },
];

export const DEFAULT_OUTFIT: Outfit = OUTFIT_PRESETS[0].outfit;

export function swatchName(list: Swatch[], hex: string): string {
  return (
    list.find((s) => s.hex.toLowerCase() === hex.toLowerCase())?.name ??
    "Personalizado"
  );
}

export function sameOutfit(a: Outfit, b: Outfit): boolean {
  return (
    a.top.type === b.top.type &&
    a.top.color === b.top.color &&
    a.bottom.type === b.bottom.type &&
    a.bottom.color === b.bottom.color &&
    a.socks.type === b.socks.type &&
    a.socks.color === b.socks.color
  );
}
