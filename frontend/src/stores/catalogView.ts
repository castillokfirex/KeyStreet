import { create } from "zustand";
import { persist } from "zustand/middleware";

export type CatalogDensity = 2 | 3 | 4;

interface CatalogViewState {
  density: CatalogDensity;
  setDensity: (density: CatalogDensity) => void;
}

/** Preferencia de UI: columnas de la rejilla del catálogo (persistida). */
export const useCatalogViewStore = create<CatalogViewState>()(
  persist(
    (set) => ({
      density: 4,
      setDensity: (density) => set({ density }),
    }),
    { name: "keystreet-catalog-view-v1" },
  ),
);

/** Clases de rejilla: móvil siempre 2, tablet máx. 3, desktop la elegida. */
export const DENSITY_GRID: Record<CatalogDensity, string> = {
  2: "grid-cols-2",
  3: "grid-cols-2 md:grid-cols-3",
  4: "grid-cols-2 md:grid-cols-3 lg:grid-cols-4",
};
