/**
 * Navegación del storefront. Cada enlace usa filtros que existen en
 * GET /public/products (silhouette, tags, discounted, sort): sin rutas vacías.
 */
export interface NavItem {
  label: string;
  to: string;
  highlight?: boolean;
}

export const MAIN_NAV: NavItem[] = [
  { label: "Hombre", to: "/catalogo?silhouette=HIGH" },
  { label: "Mujer", to: "/catalogo?silhouette=LOW" },
  { label: "Sneakers", to: "/catalogo" },
  { label: "Novedades", to: "/catalogo?sort=newest" },
  { label: "Sale", to: "/catalogo?discounted=true", highlight: true },
];

export const CATEGORY_NAV: NavItem[] = [
  { label: "Low Top", to: "/catalogo?silhouette=LOW" },
  { label: "High Top", to: "/catalogo?silhouette=HIGH" },
  { label: "Retro", to: "/catalogo?tags=retro" },
  { label: "Skate", to: "/catalogo?tags=skate" },
  { label: "Básquet", to: "/catalogo?tags=basquet" },
  { label: "Clásicos", to: "/catalogo?tags=clasico" },
  { label: "Gamuza", to: "/catalogo?tags=gamuza" },
];

const SEGMENT_KEYS = ["silhouette", "tags", "discounted"];

/** Activo si la ruta coincide y todos los parámetros del enlace están en la URL. */
export function isNavActive(to: string, pathname: string, search: string): boolean {
  const target = new URL(to, "http://ks.local");
  if (target.pathname !== pathname) return false;
  const current = new URLSearchParams(search);
  const params = [...target.searchParams.entries()];
  if (params.length === 0) {
    // "Sneakers" (catálogo completo): activo solo sin segmento ni "Novedades"
    return !SEGMENT_KEYS.some((key) => current.has(key)) && current.get("sort") !== "newest";
  }
  return params.every(([key, value]) => current.get(key) === value);
}
