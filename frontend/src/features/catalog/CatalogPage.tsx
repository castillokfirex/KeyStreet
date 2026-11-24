import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TrustStrip } from "@/components/layout/TrustStrip";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { publicApi, queryKeys, type CatalogQueryParams } from "@/lib/queries";
import { DENSITY_GRID, useCatalogViewStore } from "@/stores/catalogView";
import { CollectionChips } from "./CollectionChips";
import { FilterBar, type FilterState } from "./FilterBar";
import { ProductCard } from "./ProductCard";

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageSize, setPageSize] = useState(24);
  const density = useCatalogViewStore((s) => s.density);

  const filters: FilterState = useMemo(() => {
    const sizeVal = searchParams.get("size");
    const minVal = searchParams.get("minPrice");
    const maxVal = searchParams.get("maxPrice");
    return {
      brand: searchParams.get("brand") || undefined,
      size: sizeVal ? Number(sizeVal) : undefined,
      silhouette: searchParams.get("silhouette") || undefined,
      minPrice: minVal ? Number(minVal) : undefined,
      maxPrice: maxVal ? Number(maxVal) : undefined,
      discounted: searchParams.get("discounted") === "true" || undefined,
      q: searchParams.get("q") || undefined,
      tags: searchParams.get("tags") || undefined,
      sort: searchParams.get("sort") || "recommended",
    };
  }, [searchParams]);

  const queryParams: CatalogQueryParams = useMemo(
    () => ({
      ...filters,
      page: 0,
      pageSize,
    }),
    [filters, pageSize],
  );

  const { data: facets } = useQuery({
    queryKey: queryKeys.facets,
    queryFn: publicApi.getFacets,
  });

  const { data, isLoading, isError, refetch } = useQuery({
    queryKey: queryKeys.products(queryParams),
    queryFn: () => publicApi.getProducts(queryParams),
  });

  const updateFilters = (patch: Partial<FilterState>) => {
    const next = new URLSearchParams(searchParams);
    const merged: FilterState = { ...filters, ...patch };

    const entries: [keyof FilterState, string | number | boolean | undefined][] = [
      ["brand", merged.brand],
      ["size", merged.size],
      ["silhouette", merged.silhouette],
      ["minPrice", merged.minPrice],
      ["maxPrice", merged.maxPrice],
      ["discounted", merged.discounted],
      ["q", merged.q],
      ["tags", merged.tags],
      ["sort", merged.sort === "recommended" ? undefined : merged.sort],
    ];

    for (const [k, v] of entries) {
      if (v === undefined || v === "" || v === false) {
        next.delete(k);
      } else {
        next.set(k, String(v));
      }
    }
    setSearchParams(next, { replace: true });
  };

  const clearFilters = () => {
    setSearchParams({}, { replace: true });
  };

  const items = data?.items ?? [];
  const totalItems = data?.totalItems ?? 0;
  const gridClass = `grid gap-[var(--ks-grid-gap)] ${DENSITY_GRID[density]}`;

  return (
    <div>
      <div className="mx-auto min-h-[1500px] max-w-[1680px] pt-5 pb-8">
        <div className="px-4 sm:px-6 lg:px-8">
          <Breadcrumbs
            items={[
              { label: "Inicio", to: "/" },
              { label: "Catálogo" },
            ]}
          />

          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1 pb-5">
            <h1 className="font-display text-sm font-semibold uppercase tracking-nav text-ink">
              Colección Sneakers & Streetwear
            </h1>
            <span className="min-w-[110px] text-[11px] text-muted" aria-live="polite">
              {isLoading ? "Cargando…" : `${totalItems} piezas disponibles`}
            </span>
          </div>

          <CollectionChips />

          <div className="mt-6">
            <FilterBar
              facets={facets}
              filters={filters}
              onChange={updateFilters}
              onClear={clearFilters}
            />
          </div>
        </div>

        {isLoading ? (
          <div className={`mt-[var(--ks-grid-gap)] ${gridClass}`} aria-hidden="true">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx}>
                <Skeleton className="aspect-[4/5] w-full" />
                <div className="space-y-2 px-3 pb-6 pt-3">
                  <Skeleton className="h-2.5 w-3/5" />
                  <Skeleton className="h-2.5 w-1/4" />
                </div>
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="mx-4 mt-10 py-16 text-center sm:mx-6 lg:mx-8">
            <p className="font-display text-xs font-semibold uppercase tracking-nav text-ink">
              No pudimos cargar el catálogo en este momento.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => refetch()}>
              Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="mx-4 mt-10 py-16 text-center sm:mx-6 lg:mx-8">
            <p className="font-display text-xs font-semibold uppercase tracking-nav text-ink">
              Sin coincidencias para estos filtros
            </p>
            <p className="mt-2 text-xs text-muted">
              Ajusta las tallas o elimina filtros para ver todas las siluetas del catálogo.
            </p>
            <Button variant="outline" size="sm" className="mt-5" onClick={clearFilters}>
              Ver toda la colección
            </Button>
          </div>
        ) : (
          <>
            <ul
              className={`mt-[var(--ks-grid-gap)] ${gridClass}`}
              aria-label="Productos del catálogo"
            >
              {items.map((product, idx) => (
                <li key={product.id}>
                  <ProductCard product={product} eager={idx < density} />
                </li>
              ))}
            </ul>

            <div className="mt-12 flex flex-col items-center gap-2 px-4">
              <p className="font-display text-[10px] uppercase tracking-label text-muted">
                Mostrando {items.length} de {totalItems}
              </p>
              {items.length < totalItems && pageSize < 48 && (
                <button
                  type="button"
                  onClick={() => setPageSize(48)}
                  className="font-display text-[11px] font-semibold uppercase tracking-nav text-ink underline underline-offset-4 hover:opacity-60 cursor-pointer"
                >
                  Cargar más siluetas
                </button>
              )}
            </div>
          </>
        )}
      </div>

      <TrustStrip />
    </div>
  );
}
