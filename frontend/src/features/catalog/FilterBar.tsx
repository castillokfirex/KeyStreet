import { RotateCcw } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import type { FacetsDto } from "@/lib/types";

export interface FilterState {
  brand?: string;
  size?: number;
  silhouette?: string;
  minPrice?: number;
  maxPrice?: number;
  discounted?: boolean;
  q?: string;
  sort?: string;
}

export function FilterBar({
  facets,
  filters,
  onChange,
  onClear,
}: {
  facets?: FacetsDto;
  filters: FilterState;
  onChange: (patch: Partial<FilterState>) => void;
  onClear: () => void;
}) {
  const hasActiveFilters = Boolean(
    filters.brand ||
      filters.size ||
      filters.silhouette ||
      filters.minPrice !== undefined ||
      filters.maxPrice !== undefined ||
      filters.discounted ||
      filters.q,
  );

  return (
    <div className="flex flex-col gap-3 rounded-2xl border border-line bg-surface/60 p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          {/* Tallas */}
          <select
            aria-label="Filtrar por talla EU"
            value={filters.size ?? ""}
            onChange={(e) =>
              onChange({
                size: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="h-9 rounded-full border border-line bg-canvas px-3.5 text-xs font-medium text-navy focus:border-navy focus:outline-none cursor-pointer"
          >
            <option value="">Tallas: 36 – 44</option>
            {(facets?.sizes ?? []).map((s) => (
              <option key={s.sizeEu} value={s.sizeEu}>
                EU {s.sizeEu} ({s.count})
              </option>
            ))}
          </select>

          {/* Marcas */}
          <select
            aria-label="Filtrar por marca"
            value={filters.brand ?? ""}
            onChange={(e) =>
              onChange({ brand: e.target.value || undefined })
            }
            className="h-9 rounded-full border border-line bg-canvas px-3.5 text-xs font-medium text-navy focus:border-navy focus:outline-none cursor-pointer"
          >
            <option value="">Todas las marcas</option>
            {(facets?.brands ?? []).map((b) => (
              <option key={b.slug} value={b.slug}>
                {b.name} ({b.count})
              </option>
            ))}
          </select>

          {/* Silueta */}
          <select
            aria-label="Filtrar por silueta"
            value={filters.silhouette ?? ""}
            onChange={(e) =>
              onChange({ silhouette: e.target.value || undefined })
            }
            className="h-9 rounded-full border border-line bg-canvas px-3.5 text-xs font-medium text-navy focus:border-navy focus:outline-none cursor-pointer"
          >
            <option value="">Silueta: Todas</option>
            {(facets?.silhouettes ?? ["LOW", "HIGH"]).map((sil) => (
              <option key={sil} value={sil}>
                {sil === "HIGH" ? "Caña Alta (High)" : "Perfil Bajo (Low)"}
              </option>
            ))}
          </select>

          {/* Rango COP */}
          <select
            aria-label="Filtrar por precio en COP"
            value={filters.maxPrice ? String(filters.maxPrice) : ""}
            onChange={(e) =>
              onChange({
                maxPrice: e.target.value ? Number(e.target.value) : undefined,
              })
            }
            className="h-9 rounded-full border border-line bg-canvas px-3.5 text-xs font-medium text-navy focus:border-navy focus:outline-none cursor-pointer"
          >
            <option value="">Precio: Todos</option>
            <option value="185000">Hasta $185.000 COP</option>
            <option value="200000">Hasta $200.000 COP</option>
          </select>

          {/* Solo descuentos */}
          <Chip
            active={Boolean(filters.discounted)}
            onClick={() =>
              onChange({ discounted: filters.discounted ? undefined : true })
            }
          >
            <span>Solo descuentos</span>
            {facets && (
              <span className="rounded-full bg-mint px-1.5 py-0.5 text-[10px] font-bold text-forest">
                {facets.discountedCount}
              </span>
            )}
          </Chip>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex items-center gap-1 rounded-full px-3 py-1.5 font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted hover:text-navy cursor-pointer"
            >
              <RotateCcw className="h-3 w-3" aria-hidden="true" />
              <span>Limpiar todo</span>
            </button>
          )}
        </div>

        {/* Orden */}
        <div className="flex items-center gap-2">
          <label
            htmlFor="catalog-sort"
            className="text-[11px] font-semibold text-muted"
          >
            Ordenar:
          </label>
          <select
            id="catalog-sort"
            aria-label="Ordenar productos"
            value={filters.sort ?? "recommended"}
            onChange={(e) => onChange({ sort: e.target.value })}
            className="h-9 rounded-full border border-line bg-canvas px-3.5 text-xs font-semibold text-navy focus:border-navy focus:outline-none cursor-pointer"
          >
            <option value="recommended">Recomendados (Drops & Ofertas)</option>
            <option value="price_asc">Precio: Menor a mayor</option>
            <option value="price_desc">Precio: Mayor a menor</option>
            <option value="discount_desc">Mayor descuento</option>
            <option value="newest">Más recientes</option>
          </select>
        </div>
      </div>

      {filters.q && (
        <div className="flex items-center gap-2 text-xs text-muted">
          <span>
            Buscando: <strong className="text-navy">“{filters.q}”</strong>
          </span>
          <button
            type="button"
            onClick={() => onChange({ q: undefined })}
            className="underline hover:text-navy cursor-pointer"
          >
            Quitar búsqueda
          </button>
        </div>
      )}
    </div>
  );
}
