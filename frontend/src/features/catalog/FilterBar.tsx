import { RotateCcw, X } from "lucide-react";
import { Chip } from "@/components/ui/Chip";
import { Dropdown } from "@/components/ui/Dropdown";
import { formatCop } from "@/lib/money";
import type { FacetsDto } from "@/lib/types";
import { collectionLabel } from "./CollectionChips";
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

/** Topes de precio acordes al catálogo (pares entre ~$350.000 y ~$1.200.000). */
const PRICE_CAPS = [400000, 550000, 700000, 1000000];

const SORT_OPTIONS = [
  { value: "recommended", label: "Recomendados" },
  { value: "price_asc", label: "Precio: menor a mayor" },
  { value: "price_desc", label: "Precio: mayor a menor" },
  { value: "discount_desc", label: "Mayor descuento" },
  { value: "newest", label: "Más recientes" },
];

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
          <Dropdown
            label="Talla"
            ariaLabel="Filtrar por talla EU"
            value={filters.size ? String(filters.size) : ""}
            options={[
              { value: "", label: "Todas las tallas" },
              ...(facets?.sizes ?? []).map((s) => ({
                value: String(s.sizeEu),
                label: `EU ${s.sizeEu}`,
                meta: String(s.count),
              })),
            ]}
            onChange={(v) => onChange({ size: v ? Number(v) : undefined })}
          />

          {/* Marcas */}
          <Dropdown
            label="Marca"
            ariaLabel="Filtrar por marca"
            value={filters.brand ?? ""}
            options={[
              { value: "", label: "Todas las marcas" },
              ...(facets?.brands ?? []).map((b) => ({
                value: b.slug,
                label: b.name,
                meta: String(b.count),
              })),
            ]}
            onChange={(v) => onChange({ brand: v || undefined })}
          />

          {/* Silueta */}
          <Dropdown
            label="Silueta"
            ariaLabel="Filtrar por silueta"
            value={filters.silhouette ?? ""}
            options={[
              { value: "", label: "Todas las siluetas" },
              ...(facets?.silhouettes ?? ["LOW", "HIGH"]).map((sil) => ({
                value: sil,
                label:
                  sil === "HIGH"
                    ? "Caña alta (High)"
                    : sil === "MID"
                      ? "Caña media (Mid)"
                      : "Perfil bajo (Low)",
              })),
            ]}
            onChange={(v) => onChange({ silhouette: v || undefined })}
          />

          {/* Rango COP */}
          <Dropdown
            label="Precio"
            ariaLabel="Filtrar por precio en COP"
            value={filters.maxPrice ? String(filters.maxPrice) : ""}
            options={[
              { value: "", label: "Cualquier precio" },
              ...PRICE_CAPS.map((cap) => ({
                value: String(cap),
                label: `Hasta ${formatCop(cap)}`,
              })),
            ]}
            onChange={(v) => onChange({ maxPrice: v ? Number(v) : undefined })}
          />

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
        <Dropdown
          label="Ordenar"
          prefix="Ordenar"
          ariaLabel="Ordenar productos"
          align="right"
          value={filters.sort ?? "recommended"}
          options={SORT_OPTIONS}
          onChange={(v) => onChange({ sort: v })}
        />
      </div>

      {(filters.q || filters.tags) && (
        <div className="flex flex-wrap items-center gap-4 pb-3 text-xs text-muted">
          {filters.tags && (
            <span className="inline-flex items-center gap-1.5">
              Colección: <strong className="font-semibold uppercase text-ink">{collectionLabel(filters.tags)}</strong>
              <button
                type="button"
                onClick={() => onChange({ tags: undefined })}
                aria-label={`Quitar colección ${collectionLabel(filters.tags)}`}
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
