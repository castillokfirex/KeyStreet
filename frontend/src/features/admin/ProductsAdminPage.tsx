import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Check, Loader2, Search } from "lucide-react";
import { useMemo, useState, type KeyboardEvent } from "react";
import { KastLogo } from "@/components/brand/KastLogo";
import { ProblemError } from "@/lib/api";
import { formatCop } from "@/lib/money";
import { adminApi, queryKeys } from "@/lib/queries";
import type { ProductSummaryDto } from "@/lib/types";
import { cartImageFor } from "@/stores/cart";
import { useToastStore } from "@/stores/toast";
import { CARD, PageHeader, SkeletonRows, StatGrid, TABLE, THEAD } from "./ui";

/** Mismo rango que valida el backend (DiscountPatchRequest: 0–90). */
export const MIN_DISCOUNT = 0;
export const MAX_DISCOUNT = 90;

/** Misma regla de redondeo que el servidor: a la centena inferior. */
export function previewFinalPrice(original: number, pct: number) {
  return pct > 0 ? Math.floor((original * (100 - pct)) / 10000) * 100 : original;
}

export function validateDiscount(raw: string): string | null {
  if (raw.trim() === "") return "Escribe un número.";
  const n = Number(raw);
  if (!Number.isInteger(n)) return "Usa un número entero.";
  if (n < MIN_DISCOUNT || n > MAX_DISCOUNT) return `Entre ${MIN_DISCOUNT} y ${MAX_DISCOUNT} %.`;
  return null;
}

function Thumb({ product }: { product: ProductSummaryDto }) {
  const src = cartImageFor(product.images);
  return (
    <span className="flex h-12 w-10 shrink-0 items-center justify-center overflow-hidden bg-surface text-ink/15">
      {src ? (
        <img src={src} alt="" loading="lazy" className="h-full w-full object-cover" />
      ) : (
        <KastLogo variant="isotype" size={22} title="" />
      )}
    </span>
  );
}

type RowState = "idle" | "saving" | "saved";

function ProductRow({ product }: { product: ProductSummaryDto }) {
  const qc = useQueryClient();
  const pushToast = useToastStore((s) => s.push);
  const [draft, setDraft] = useState<string | null>(null);
  const [state, setState] = useState<RowState>("idle");

  const value = draft ?? String(product.discountPercent);
  const error = draft === null ? null : validateDiscount(draft);
  const pct = error ? product.discountPercent : Number(value);
  const changed = draft !== null && !error && pct !== product.discountPercent;
  const preview = previewFinalPrice(product.originalPriceCop, pct);

  const mutation = useMutation({
    mutationFn: (discountPercent: number) => adminApi.patchDiscount(product.id, discountPercent),
    onMutate: () => setState("saving"),
    onSuccess: async () => {
      setDraft(null);
      setState("saved");
      window.setTimeout(() => setState("idle"), 1600);
      await qc.invalidateQueries({ queryKey: queryKeys.adminProducts });
      await qc.invalidateQueries({ queryKey: ["key-street", "products"] });
    },
    onError: (err) => {
      setState("idle");
      pushToast({
        title: "No se pudo guardar el descuento",
        description: err instanceof ProblemError ? err.detail : "Error inesperado.",
        tone: "error",
      });
    },
  });

  const save = () => {
    if (changed && state !== "saving") mutation.mutate(pct);
  };

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") save();
    if (e.key === "Escape") setDraft(null);
  };

  return (
    <tr className={`transition-colors duration-150 ${changed ? "bg-mint/40" : "hover:bg-surface/50"}`}>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <Thumb product={product} />
          <div className="min-w-0">
            <p className="max-w-[18rem] truncate text-[13px] font-semibold text-ink">{product.name}</p>
            <p className="font-mono text-[10px] uppercase tracking-[0.1em] text-muted">
              {product.brand} · {product.modelCode}
            </p>
          </div>
        </div>
      </td>
      <td className="whitespace-nowrap px-4 py-3 tabular-nums text-muted">{formatCop(product.originalPriceCop)}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-1.5">
          <input
            type="number"
            inputMode="numeric"
            min={MIN_DISCOUNT}
            max={MAX_DISCOUNT}
            step={1}
            value={value}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={onKey}
            aria-label={`Porcentaje descuento ${product.name}`}
            aria-invalid={Boolean(error)}
            aria-describedby={error ? `disc-err-${product.id}` : undefined}
            className="h-9 w-16 border border-line bg-white/80 px-2 text-right font-mono text-sm tabular-nums text-ink transition-[border-color,box-shadow] duration-150 focus:border-ink focus:outline-none focus:ring-4 focus:ring-ink/[0.06] aria-[invalid=true]:border-kast-error"
          />
          <span className="font-mono text-xs text-muted">%</span>
        </div>
        {error && (
          <p id={`disc-err-${product.id}`} className="mt-1 text-[11px] text-kast-error">
            {error}
          </p>
        )}
      </td>
      <td className="whitespace-nowrap px-4 py-3">
        <span className={`font-semibold tabular-nums ${changed ? "text-forest" : "text-ink"}`}>
          {formatCop(preview)}
        </span>
        {pct > 0 && (
          <span className="ml-2 bg-mint px-1.5 py-0.5 font-mono text-[10px] text-sale-text">−{pct}%</span>
        )}
        {changed && <p className="mt-0.5 text-[10px] text-muted">Vista previa · sin guardar</p>}
      </td>
      <td className="px-4 py-3 text-right">
        <button
          type="button"
          onClick={save}
          disabled={!changed && state !== "saved"}
          aria-label={`Guardar descuento de ${product.name}`}
          className={`relative inline-flex h-9 w-[6.5rem] cursor-pointer items-center justify-center gap-1.5 font-display text-[10px] font-semibold uppercase tracking-nav transition-[background-color,color,transform] duration-150 ease-out active:scale-[0.97] disabled:cursor-default disabled:active:scale-100 ${
            state === "saved"
              ? "bg-forest text-white"
              : changed
                ? "bg-ink text-canvas hover:bg-forest"
                : "bg-surface text-gray"
          }`}
        >
          {/* Cambio de estado con desenfoque corto para que no se vean dos textos superpuestos */}
          <span key={state} className="ks-swap inline-flex items-center gap-1.5">
            {state === "saving" ? (
              <>
                <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
                Guardando
              </>
            ) : state === "saved" ? (
              <>
                <Check className="h-3.5 w-3.5" aria-hidden="true" />
                Guardado
              </>
            ) : (
              "Aplicar"
            )}
          </span>
        </button>
      </td>
    </tr>
  );
}

export function ProductsAdminPage() {
  const [query, setQuery] = useState("");
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminProducts,
    queryFn: () => adminApi.getProducts(0, 60),
  });

  const products = useMemo(() => data?.items ?? [], [data?.items]);
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return q ? products.filter((p) => `${p.name} ${p.brand} ${p.modelCode}`.toLowerCase().includes(q)) : products;
  }, [products, query]);

  const discounted = products.filter((p) => p.hasDiscount);
  const avgDiscount = discounted.length
    ? Math.round(discounted.reduce((s, p) => s + p.discountPercent, 0) / discounted.length)
    : 0;
  const with3d = products.filter((p) => p.model3dReady).length;

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Catálogo en COP"
        title="Productos y descuentos"
        description="El descuento que guardes aquí cambia al instante el precio de la tienda y el del pedido por WhatsApp, calculado en el servidor."
        aside={
          <label className="flex h-10 w-full items-center gap-2 border-b border-line focus-within:border-ink sm:w-64">
            <Search className="h-4 w-4 text-muted" aria-hidden="true" />
            <input
              type="search"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar modelo o marca"
              aria-label="Buscar producto"
              className="h-9 w-full bg-transparent text-sm text-ink placeholder:text-gray focus:outline-none"
            />
          </label>
        }
      />

      <StatGrid
        stats={[
          { label: "Productos", value: isLoading ? "—" : products.length },
          { label: "Con descuento", value: isLoading ? "—" : discounted.length, tone: "good" },
          { label: "Descuento promedio", value: isLoading ? "—" : `${avgDiscount}%`, hint: "entre los que tienen oferta" },
          { label: "Con modelo 3D", value: isLoading ? "—" : `${with3d}/${products.length}` },
        ]}
      />

      <div className={CARD}>
        <table className={TABLE}>
          <thead className={THEAD}>
            <tr>
              <th className="px-4 py-3">Silueta</th>
              <th className="px-4 py-3">Precio base</th>
              <th className="px-4 py-3">Descuento</th>
              <th className="px-4 py-3">Precio final</th>
              <th className="px-4 py-3 text-right">
                <span className="sr-only">Guardar</span>
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <SkeletonRows cols={5} rows={6} />
            ) : filtered.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-xs text-muted">
                  Ningún producto coincide con “{query}”.
                </td>
              </tr>
            ) : (
              filtered.map((p) => <ProductRow key={p.id} product={p} />)
            )}
          </tbody>
        </table>
      </div>
      <p className="font-mono text-[10px] uppercase tracking-[0.12em] text-gray">
        Enter guarda · Esc deshace el cambio
      </p>
    </div>
  );
}
