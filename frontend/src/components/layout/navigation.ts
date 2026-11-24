/**
 * Navegación del storefront. Cada enlace usa filtros que existen en
 * GET /public/products (silhouette, tags, discounted, sort): sin rutas vacías.
 */
export interface NavItem {
  label: string;
  to: string;
  highlight?: boolean;
  /** Submenú que se despliega al pasar el mouse (o con el teclado). */
  children?: NavItem[];
}

export const MAIN_NAV: NavItem[] = [
  { label: "Hombre", to: "/catalogo?silhouette=HIGH" },
  { label: "Mujer", to: "/catalogo?silhouette=LOW" },
  {
    label: "Sale",
    to: "/catalogo?discounted=true",
    highlight: true,
    children: [
      { label: "Hombre", to: "/catalogo?discounted=true&silhouette=HIGH" },
      { label: "Mujer", to: "/catalogo?discounted=true&silhouette=LOW" },
    ],
  },
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
