import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Search } from "lucide-react";
import { useId, useMemo, useRef, useState, type FormEvent, type KeyboardEvent } from "react";
import { Link, useNavigate } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { formatCop } from "@/lib/money";
import { publicApi, queryKeys } from "@/lib/queries";
import type { ProductSummaryDto } from "@/lib/types";
import { cartImageFor } from "@/stores/cart";
import { normalize, searchProducts } from "./searchMatch";

const CATALOG_PARAMS = { sort: "recommended", page: 0, pageSize: 60 } as const;

function Thumb({ product }: { product: ProductSummaryDto }) {
  const src = cartImageFor(product.images);
  return (
    <span className="flex h-[70px] w-14 shrink-0 items-center justify-center overflow-hidden bg-surface text-ink/15">
      {src ? (
        <img src={src} alt="" loading="lazy" decoding="async" className="h-full w-full object-cover" />
      ) : (
        <KastLogo variant="isotype" size={28} title="" />
      )}
    </span>
  );
}

/** Búsqueda del header con hasta 3 sugerencias (nombre, marca o siglas). */
export function SearchBox() {
  const navigate = useNavigate();
  const id = useId();
  const listId = `${id}-suggestions`;
  const [value, setValue] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);
  const [wantsData, setWantsData] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // El catálogo se pide solo cuando el usuario empieza a buscar
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.products(CATALOG_PARAMS),
    queryFn: () => publicApi.getProducts(CATALOG_PARAMS),
    enabled: wantsData,
    staleTime: 5 * 60_000,
  });

  const query = value.trim();
  const results = useMemo(
    () => (query ? searchProducts(data?.items ?? [], query) : []),
    [data?.items, query],
  );
  const showPanel = open && query.length > 0;
  // El catálogo busca por texto: con siglas ("aj4") no encontraría nada
  const textMatches =
    results.length > 0 &&
    results.some((p) => normalize(`${p.brand} ${p.name}`).includes(normalize(query)));
  // Opciones navegables: sugerencias + "ver todos"
  const optionCount = results.length + 1;

  const goToCatalog = () => {
    setOpen(false);
    // Sin coincidencias, el catálogo completo es más útil que una lista vacía
    navigate(textMatches ? `/catalogo?q=${encodeURIComponent(query)}` : "/catalogo");
  };

  const goToProduct = (p: ProductSummaryDto) => {
    setOpen(false);
    setValue("");
    navigate(`/producto/${p.slug}`);
  };

  const onSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (active >= 0 && active < results.length) goToProduct(results[active]);
    else goToCatalog();
  };

  const onKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (!showPanel) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setActive((i) => (i + 1) % optionCount);
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setActive((i) => (i <= 0 ? optionCount - 1 : i - 1));
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  };

  const optionId = (i: number) => `${id}-opt-${i}`;

  return (
    <div
      ref={rootRef}
      className="relative mr-2 hidden md:block"
      onBlur={(e) => {
        if (!rootRef.current?.contains(e.relatedTarget as Node)) setOpen(false);
      }}
    >
      <form
        onSubmit={onSubmit}
        role="search"
        className="flex items-center gap-2 border-b border-line transition-colors focus-within:border-ink"
      >
        <Search className="h-4 w-4 text-muted" strokeWidth={1.5} aria-hidden="true" />
        <input
          type="search"
          value={value}
          onChange={(e) => {
            setValue(e.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => {
            setWantsData(true);
            setOpen(true);
          }}
          onKeyDown={onKeyDown}
          placeholder="Busca: AF1, Samba, NB…"
          aria-label="Buscar silueta o marca"
          role="combobox"
          aria-expanded={showPanel}
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={showPanel && active >= 0 ? optionId(active) : undefined}
          autoComplete="off"
          className="h-9 w-36 bg-transparent text-xs text-ink placeholder:text-muted focus:outline-none lg:w-44"
        />
      </form>

      {showPanel && (
        <div className="ks-dropdown-in absolute right-0 top-full z-40 mt-2 w-[22rem] origin-top-right border border-line bg-canvas shadow-[0_22px_48px_-24px_rgb(17_17_17/0.45)]">
          <p className="border-b border-line px-4 py-2.5 font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
            {isLoading ? "Buscando…" : results.length > 0 ? "Pares sugeridos" : "Sin coincidencias"}
          </p>

          <ul id={listId} role="listbox" aria-label="Sugerencias de búsqueda">
            {results.map((p, i) => (
              <li key={p.id} id={optionId(i)} role="option" aria-selected={active === i}>
                <Link
                  to={`/producto/${p.slug}`}
                  onClick={() => {
                    setOpen(false);
                    setValue("");
                  }}
                  onPointerEnter={() => setActive(i)}
                  className={`flex items-center gap-3 px-4 py-3 transition-colors ${
                    active === i ? "bg-surface" : ""
                  }`}
                >
                  <Thumb product={p} />
                  <span className="min-w-0 flex-1">
                    <span className="block font-mono text-[10px] uppercase tracking-[0.12em] text-muted">
                      {p.brand}
                    </span>
                    <span className="mt-0.5 block truncate font-display text-xs font-bold uppercase text-ink">
                      {p.name}
                    </span>
                    <span className="mt-1 flex items-baseline gap-2 font-mono text-xs">
                      <span className={p.hasDiscount ? "text-sale-text" : "text-ink"}>
                        {formatCop(p.finalPriceCop)}
                      </span>
                      {p.hasDiscount && (
                        <span className="text-[10px] text-gray line-through">
                          {formatCop(p.originalPriceCop)}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            ))}
          </ul>

          {!isLoading && results.length === 0 && (
            <div className="flex items-center gap-3 px-4 py-4 text-xs text-muted">
              <span className="text-ink/20">
                <KastLogo variant="isotype" size={32} title="" />
              </span>
              <span>
                No encontramos pares para <strong className="text-ink">“{query}”</strong>. Prueba con la
                marca o el modelo.
              </span>
            </div>
          )}

          <button
            type="button"
            id={optionId(results.length)}
            onClick={goToCatalog}
            onPointerEnter={() => setActive(results.length)}
            className={`group flex w-full cursor-pointer items-center justify-between border-t border-line px-4 py-3 font-display text-[10px] font-semibold uppercase tracking-nav text-ink transition-colors ${
              active === results.length ? "bg-surface" : ""
            }`}
          >
            {textMatches ? `Ver resultados de “${query}”` : "Ver todo el catálogo"}
            <ArrowRight
              className="h-3.5 w-3.5 transition-transform group-hover:translate-x-1"
              aria-hidden="true"
            />
          </button>
        </div>
      )}
    </div>
  );
}
