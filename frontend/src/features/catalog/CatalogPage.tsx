import { useQuery } from "@tanstack/react-query";
import { ChevronDown } from "lucide-react";
import { useMemo, useState } from "react";
import { useSearchParams } from "react-router";
import { Breadcrumbs } from "@/components/layout/Breadcrumbs";
import { TrustStrip } from "@/components/layout/TrustStrip";
import { Stagger, StaggerItem } from "@/components/motion/Stagger";
import { Button } from "@/components/ui/Button";
import { Skeleton } from "@/components/ui/Skeleton";
import { publicApi, queryKeys, type CatalogQueryParams } from "@/lib/queries";
import { FilterBar, type FilterState } from "./FilterBar";
import { ProductCard } from "./ProductCard";

export function CatalogPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const [pageSize, setPageSize] = useState(24);

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

  return (
    <div>
      <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-6 pb-8">
        <Breadcrumbs
          items={[
            { label: "Inicio", to: "/" },
            { label: "Catálogo" },
            { label: "Sneakers & Streetwear" },
          ]}
        />

        <div className="flex flex-wrap items-end justify-between gap-4 pb-5">
          <div>
            <h1 className="font-display text-2xl sm:text-3xl font-bold uppercase tracking-tight text-navy">
              Colección Sneakers & Streetwear
            </h1>
            <p className="mt-1 text-xs text-muted">
              Curaduría en Colombia · Precios en COP · 4 referencias con descuento exclusivo del 10% al 15%
            </p>
          </div>
          <span className="font-display text-[11px] font-bold uppercase tracking-[0.16em] text-muted">
            {totalItems} piezas disponibles
          </span>
        </div>

        <FilterBar
          facets={facets}
          filters={filters}
          onChange={updateFilters}
          onClear={clearFilters}
        />

        {isLoading ? (
          <div className="mt-6 grid grid-cols-2 gap-4 md:grid-cols-3 lg:grid-cols-4">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="space-y-3 rounded-2xl border border-line p-3">
                <Skeleton className="aspect-[4/5] w-full" />
                <Skeleton className="h-3 w-20" />
                <Skeleton className="h-4 w-3/4" />
                <Skeleton className="h-8 w-full" />
              </div>
            ))}
          </div>
        ) : isError ? (
          <div className="mt-8 rounded-2xl border border-red-200 bg-red-50 p-6 text-center">
            <p className="text-sm font-bold text-red-900">
              No pudimos cargar el catálogo en este momento.
            </p>
            <Button
              variant="navy"
              size="sm"
              className="mt-3"
              onClick={() => refetch()}
            >
              Reintentar
            </Button>
          </div>
        ) : items.length === 0 ? (
          <div className="mt-8 rounded-2xl border border-line bg-surface/60 p-10 text-center">
            <p className="font-display text-sm font-bold uppercase tracking-wider text-navy">
              Sin coincidencias para estos filtros
            </p>
            <p className="mt-1 text-xs text-muted">
              Ajusta las tallas o elimina filtros para ver las 10 siluetas del catálogo.
            </p>
            <Button
              variant="outline"
              size="sm"
              className="mt-4"
              onClick={clearFilters}
            >
              Ver toda la colección
            </Button>
          </div>
        ) : (
          <>
            <Stagger className="mt-6 grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-3 lg:grid-cols-4">
              {items.map((product) => (
                <StaggerItem key={product.id}>
                  <ProductCard product={product} />
                </StaggerItem>
              ))}
            </Stagger>

            <div className="mt-10 flex flex-col items-center gap-3">
              <p className="text-xs text-muted">
                Mostrando <strong className="text-navy">{items.length}</strong> de{" "}
                <strong className="text-navy">{totalItems}</strong> piezas exclusivas
              </p>
              {items.length < totalItems && pageSize < 48 && (
                <Button
                  variant="outline"
                  onClick={() => setPageSize(48)}
                >
                  <span>Cargar más siluetas</span>
                  <ChevronDown className="h-4 w-4" aria-hidden="true" />
                </Button>
              )}
            </div>
          </>
        )}
      </div>

      <TrustStrip />
    </div>
  );
}
