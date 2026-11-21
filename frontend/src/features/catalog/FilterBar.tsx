import { ChevronDown, RotateCcw, X } from "lucide-react";
import type { ReactNode } from "react";
import { Chip } from "@/components/ui/Chip";
import type { FacetsDto } from "@/lib/types";
import { DensityToggle } from "./DensityToggle";

export interface FilterState {
  brand?: string;
  size?: number;
  silhouette?: string;
  minPrice?: number;
  maxPrice?: number;
  discounted?: boolean;
  q?: string;
  tags?: string;
  sort?: string;
}

const SELECT =
  "h-10 appearance-none bg-transparent pr-6 font-display text-[10px] font-semibold uppercase tracking-nav text-ink focus:outline-none cursor-pointer";

function MinimalSelect({ children }: { children: ReactNode }) {
  return (
    <span className="relative inline-flex items-center border-b border-transparent focus-within:border-ink">
      {children}
      <ChevronDown
        className="pointer-events-none absolute right-0 h-3.5 w-3.5 text-muted"
        strokeWidth={1.5}
        aria-hidden="true"
      />
    </span>
  );
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
      filters.q ||
      filters.tags,
  );

  return (
    <div className="border-y border-line">
      <div className="flex flex-wrap items-center justify-between gap-x-6 gap-y-2 py-1">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <DensityToggle />

          {/* Tallas */}
          <MinimalSelect>
            <select
              aria-label="Filtrar por talla EU"
              value={filters.size ?? ""}
              onChange={(e) =>
                onChange({
                  size: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className={SELECT}
            >
              <option value="">Talla</option>
              {(facets?.sizes ?? []).map((s) => (
                <option key={s.sizeEu} value={s.sizeEu}>
                  EU {s.sizeEu} ({s.count})
                </option>
              ))}
            </select>
          </MinimalSelect>

          {/* Marcas */}
          <MinimalSelect>
            <select
              aria-label="Filtrar por marca"
              value={filters.brand ?? ""}
              onChange={(e) => onChange({ brand: e.target.value || undefined })}
              className={SELECT}
            >
              <option value="">Marca</option>
              {(facets?.brands ?? []).map((b) => (
                <option key={b.slug} value={b.slug}>
                  {b.name} ({b.count})
                </option>
              ))}
            </select>
          </MinimalSelect>

          {/* Silueta */}
          <MinimalSelect>
            <select
              aria-label="Filtrar por silueta"
              value={filters.silhouette ?? ""}
              onChange={(e) =>
                onChange({ silhouette: e.target.value || undefined })
              }
              className={SELECT}
            >
              <option value="">Silueta</option>
              {(facets?.silhouettes ?? ["LOW", "HIGH"]).map((sil) => (
                <option key={sil} value={sil}>
                  {sil === "HIGH"
                    ? "Caña alta (High)"
                    : sil === "MID"
                      ? "Caña media (Mid)"
                      : "Perfil bajo (Low)"}
                </option>
              ))}
            </select>
          </MinimalSelect>

          {/* Rango COP */}
          <MinimalSelect>
            <select
              aria-label="Filtrar por precio en COP"
              value={filters.maxPrice ? String(filters.maxPrice) : ""}
              onChange={(e) =>
                onChange({
                  maxPrice: e.target.value ? Number(e.target.value) : undefined,
                })
              }
              className={SELECT}
            >
              <option value="">Precio</option>
              <option value="185000">Hasta $185.000 COP</option>
              <option value="200000">Hasta $200.000 COP</option>
            </select>
          </MinimalSelect>

          {/* Solo descuentos */}
          <Chip
            active={Boolean(filters.discounted)}
            onClick={() =>
              onChange({ discounted: filters.discounted ? undefined : true })
            }
          >
            <span>Solo descuentos</span>
            {facets && (
              <span
                className={`tabular-nums ${filters.discounted ? "text-canvas/70" : "text-sale-text"}`}
              >
                {facets.discountedCount}
              </span>
            )}
          </Chip>

          {hasActiveFilters && (
            <button
              type="button"
              onClick={onClear}
              className="inline-flex h-10 items-center gap-1 font-display text-[10px] font-semibold uppercase tracking-nav text-muted hover:text-ink cursor-pointer"
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
            className="font-display text-[10px] font-semibold uppercase tracking-nav text-muted"
          >
            Ordenar
          </label>
          <MinimalSelect>
            <select
              id="catalog-sort"
              aria-label="Ordenar productos"
              value={filters.sort ?? "recommended"}
              onChange={(e) => onChange({ sort: e.target.value })}
              className={SELECT}
            >
              <option value="recommended">Recomendados</option>
              <option value="price_asc">Precio: menor a mayor</option>
              <option value="price_desc">Precio: mayor a menor</option>
              <option value="discount_desc">Mayor descuento</option>
              <option value="newest">Más recientes</option>
            </select>
          </MinimalSelect>
        </div>
      </div>

      {(filters.q || filters.tags) && (
        <div className="flex flex-wrap items-center gap-4 pb-3 text-xs text-muted">
          {filters.tags && (
            <span className="inline-flex items-center gap-1.5">
              Colección: <strong className="font-semibold uppercase text-ink">{filters.tags}</strong>
              <button
                type="button"
                onClick={() => onChange({ tags: undefined })}
                aria-label={`Quitar colección ${filters.tags}`}
                className="inline-flex h-6 w-6 items-center justify-center hover:text-ink cursor-pointer"
              >
                <X className="h-3.5 w-3.5" aria-hidden="true" />
              </button>
            </span>
          )}
          {filters.q && (
            <span className="inline-flex items-center gap-2">
              Buscando: <strong className="text-ink">“{filters.q}”</strong>
              <button
                type="button"
                onClick={() => onChange({ q: undefined })}
                className="underline hover:text-ink cursor-pointer"
              >
                Quitar búsqueda
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
}
