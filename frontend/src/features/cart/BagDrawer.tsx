import { ArrowRight, MessageCircle, Minus, Plus, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type CSSProperties } from "react";
import { Link } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";
import { LazyKastMascot } from "@/components/brand/LazyKastMascot";
import { Drawer } from "@/components/ui/Drawer";
import { formatCop } from "@/lib/money";
import { useAssistantStore } from "@/stores/assistant";
import { MAX_QTY_PER_ITEM, useCartStore, type CartItem } from "@/stores/cart";
import { useWhatsappCheckout } from "./useWhatsappCheckout";

/** Tiempo de la animación de salida de un producto antes de quitarlo. */
const REMOVE_MS = 280;

const CTA =
  "group relative isolate flex h-[52px] w-full cursor-pointer items-center justify-center gap-2.5 overflow-hidden bg-ink font-display text-[12px] font-semibold uppercase tracking-nav text-canvas transition-transform duration-300 active:scale-[0.98] disabled:cursor-not-allowed";
const CTA_SWEEP =
  "absolute inset-0 -z-10 origin-left scale-x-0 bg-forest transition-transform duration-500 ease-editorial group-hover:scale-x-100 group-disabled:scale-x-0";

function Thumb({ item }: { item: CartItem }) {
  const [broken, setBroken] = useState(false);
  if (!item.image || broken) {
    return (
      <div className="flex h-full w-full items-center justify-center text-ink/15">
        <KastLogo variant="isotype" size={40} title="" />
      </div>
    );
  }
  return (
    <img
      src={item.image}
      alt=""
      loading="lazy"
      decoding="async"
      onError={() => setBroken(true)}
      className="h-full w-full object-cover transition-transform duration-700 ease-editorial group-hover/item:scale-110"
    />
  );
}

function BagItem({
  item,
  index,
  leaving,
  onRemove,
  onNavigate,
}: {
  item: CartItem;
  index: number;
  leaving: boolean;
  onRemove: () => void;
  onNavigate: () => void;
}) {
  const updateQty = useCartStore((s) => s.updateQty);
  const atMax = item.quantity >= MAX_QTY_PER_ITEM;

  return (
    <li
      className={`grid transition-[grid-template-rows,opacity,transform] duration-300 ease-editorial ${
        leaving ? "grid-rows-[0fr] translate-x-8 opacity-0" : "grid-rows-[1fr]"
      }`}
    >
      <div className="min-h-0 overflow-hidden">
        <div
          className="ks-slide-in group/item flex gap-4 border-b border-line py-5"
          style={{ animationDelay: `${120 + index * 70}ms` } as CSSProperties}
        >
          <Link
            to={`/producto/${item.slug}`}
            onClick={onNavigate}
            tabIndex={-1}
            aria-hidden="true"
            className="block aspect-[4/5] w-28 shrink-0 overflow-hidden bg-surface"
          >
            <Thumb item={item} />
          </Link>

          <div className="flex min-w-0 flex-1 flex-col">
            <div className="flex items-start justify-between gap-2">
              <Link
                to={`/producto/${item.slug}`}
                onClick={onNavigate}
                className="font-display text-[13px] font-bold uppercase leading-snug text-ink transition-colors hover:text-forest"
              >
                {item.name}
              </Link>
              <button
                type="button"
                onClick={onRemove}
                aria-label={`Eliminar ${item.name} de la bolsa`}
                title="Eliminar"
                className="group/trash -mr-1.5 -mt-1 flex h-8 w-8 shrink-0 cursor-pointer items-center justify-center text-gray transition-colors hover:text-kast-error"
              >
                <Trash2
                  className="h-4 w-4 transition-transform duration-300 group-hover/trash:-rotate-12 group-hover/trash:scale-110"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </button>
            </div>

            <p className="mt-1.5 font-mono text-[11px] uppercase tracking-[0.1em] text-muted">
              {item.brand} · Talla: {item.sizeEu} EU
            </p>
            <p className="mt-1 flex items-baseline gap-2 text-sm text-ink">
              {formatCop(item.finalPriceCop)}
              {item.hasDiscount && (
                <>
                  <span className="text-xs text-gray line-through">
                    {formatCop(item.originalPriceCop)}
                  </span>
                  <span className="bg-mint px-1 font-mono text-[10px] text-sale-text">
                    −{item.discountPercent}%
                  </span>
                </>
              )}
            </p>

            <div className="mt-auto flex items-center justify-between pt-3">
              <div
                className="inline-flex items-center"
                role="group"
                aria-label={`Cantidad de ${item.name}`}
              >
                <button
                  type="button"
                  onClick={() => updateQty(item.variantId, item.quantity - 1)}
                  disabled={item.quantity <= 1}
                  aria-label="Disminuir cantidad"
                  className="flex h-8 w-8 cursor-pointer items-center justify-center text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-line disabled:hover:bg-transparent"
                >
                  <Minus
                    className="h-3.5 w-3.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>
                <span
                  key={item.quantity}
                  aria-live="polite"
                  className="ks-rise w-8 text-center font-mono text-sm text-forest"
                >
                  {item.quantity}
                </span>
                <button
                  type="button"
                  onClick={() => updateQty(item.variantId, item.quantity + 1)}
                  disabled={atMax}
                  aria-label="Aumentar cantidad"
                  title={
                    atMax ? `Máximo ${MAX_QTY_PER_ITEM} por talla` : undefined
                  }
                  className="flex h-8 w-8 cursor-pointer items-center justify-center text-ink transition-colors hover:bg-surface disabled:cursor-not-allowed disabled:text-line disabled:hover:bg-transparent"
                >
                  <Plus
                    className="h-3.5 w-3.5"
                    strokeWidth={1.5}
                    aria-hidden="true"
                  />
                </button>
              </div>
              {item.quantity > 1 && (
                <span className="text-right font-mono text-[10px] uppercase leading-tight tracking-[0.08em] text-muted">
                  Subtotal
                  <span className="block whitespace-nowrap text-[11px] normal-case tracking-normal text-ink">
                    {formatCop(item.finalPriceCop * item.quantity)}
                  </span>
                </span>
              )}
            </div>
          </div>
        </div>
      </div>
    </li>
  );
}

function EmptyBag({ onClose }: { onClose: () => void }) {
  return (
    <div className="flex h-full flex-col items-center justify-center px-8 py-12 text-center">
      <div className="ks-slide-in relative" style={{ animationDelay: "120ms" }}>
        {/* Globo de diálogo de Kast */}
        <div className="relative mx-auto mb-4 w-max bg-ink px-4 py-2.5 font-display text-[12px] font-bold uppercase tracking-[0.06em] text-canvas">
          ¡Tu bolsa está vacía!
          <span
            aria-hidden="true"
            className="absolute -bottom-1.5 left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 bg-ink"
          />
        </div>
        <div className="ks-bob mx-auto w-max text-ink">
          <LazyKastMascot state="speaking" size={128} title="Kast" />
        </div>
      </div>

      <p
        className="ks-slide-in mt-6 max-w-[17rem] text-sm leading-relaxed text-muted"
        style={{ animationDelay: "220ms" }}
      >
        Aún no has separado ningún par. Date una vuelta por el catálogo y elige
        tu talla.
      </p>

      <div
        className="ks-slide-in mt-7 w-full max-w-[17rem] space-y-2"
        style={{ animationDelay: "300ms" }}
      >
        <Link to="/catalogo" onClick={onClose} className={CTA}>
          <span aria-hidden="true" className={CTA_SWEEP} />
          <span>Ir al catálogo</span>
          <ArrowRight
            className="h-4 w-4 transition-transform duration-300 ease-editorial group-hover:translate-x-1.5"
            aria-hidden="true"
          />
        </Link>
        <Link
          to="/catalogo?discounted=true"
          onClick={onClose}
          className="flex h-11 w-full items-center justify-center border border-ink font-display text-[11px] font-semibold uppercase tracking-nav text-ink transition-colors hover:bg-ink hover:text-canvas"
        >
          Ver ofertas 10–15% off
        </Link>
      </div>
    </div>
  );
}

export function BagDrawer() {
  const bagOpen = useCartStore((s) => s.bagOpen);
  const setBagOpen = useCartStore((s) => s.setBagOpen);
  const items = useCartStore((s) => s.items);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const openAssistant = useAssistantStore((s) => s.openDrawer);
  const { checkout, loading } = useWhatsappCheckout();

  const [leaving, setLeaving] = useState<string[]>([]);
  const timers = useRef<number[]>([]);
  useEffect(
    () => () => timers.current.forEach((t) => window.clearTimeout(t)),
    [],
  );

  const close = () => setBagOpen(false);
  const count = items.reduce((a, b) => a + b.quantity, 0);
  const totalCop = items.reduce(
    (sum, item) => sum + item.finalPriceCop * item.quantity,
    0,
  );
  const savingsCop = items.reduce(
    (sum, item) =>
      sum + (item.originalPriceCop - item.finalPriceCop) * item.quantity,
    0,
  );

  const handleRemove = (variantId: string) => {
    setLeaving((ids) => [...ids, variantId]);
    const t = window.setTimeout(() => {
      removeItem(variantId);
      setLeaving((ids) => ids.filter((id) => id !== variantId));
    }, REMOVE_MS);
    timers.current.push(t);
  };

  const handleCheckout = () => {
    void checkout(
      items.map((i) => ({
        variantId: i.variantId,
        quantity: i.quantity,
        fallback: {
          productName: i.name,
          sizeEu: i.sizeEu,
          sku: i.sku,
          originalPriceCop: i.originalPriceCop,
          finalPriceCop: i.finalPriceCop,
          discountPercent: i.discountPercent,
          hasDiscount: i.hasDiscount,
          quantity: i.quantity,
        },
      })),
    );
  };

  return (
    <Drawer
      open={bagOpen}
      onClose={close}
      title="Bolsa de compras"
      titleAddon={
        count > 0 ? (
          <sup
            key={count}
            aria-label={`${count} artículos`}
            className="ks-rise font-mono text-[10px] leading-none font-medium text-muted"
          >
            {count}
          </sup>
        ) : undefined
      }
    >
      {items.length === 0 ? (
        <EmptyBag onClose={close} />
      ) : (
        <div className="flex min-h-full flex-col">
          <ul className="px-5" aria-label="Productos en la bolsa">
            {items.map((item, i) => (
              <BagItem
                key={item.variantId}
                item={item}
                index={i}
                leaving={leaving.includes(item.variantId)}
                onRemove={() => handleRemove(item.variantId)}
                onNavigate={close}
              />
            ))}
          </ul>

          {/* Kast acompaña la bolsa y ofrece ayuda con la talla */}
          <div
            className="ks-slide-in flex flex-1 flex-col items-center justify-center gap-3 px-8 py-10 text-center"
            style={{ animationDelay: `${180 + items.length * 70}ms` }}
          >
            <div className="ks-bob text-ink">
              <LazyKastMascot state="idle" size={84} title="Kast" />
            </div>
            <p className="max-w-[15rem] text-xs leading-relaxed text-muted">
              ¿Dudas con la talla o la horma? Kast te ayuda antes de pedir.
            </p>
            <button
              type="button"
              onClick={() => {
                close();
                openAssistant({
                  prefill:
                    "¿Qué talla me recomiendas para los pares de mi bolsa?",
                });
              }}
              className="cursor-pointer font-display text-[10px] font-semibold uppercase tracking-nav text-ink underline underline-offset-4 transition-colors hover:text-forest"
            >
              Preguntar a Kast
            </button>
          </div>

          <div className="sticky bottom-0 border-t border-line bg-canvas/95 px-5 pb-5 pt-4 backdrop-blur-sm">
            {savingsCop > 0 && (
              <p className="mb-1 flex items-center justify-between font-mono text-[11px] text-sale-text">
                <span>Ahorras</span>
                <span>−{formatCop(savingsCop)}</span>
              </p>
            )}
            <div className="flex items-baseline justify-between">
              <span className="font-display text-sm font-bold uppercase tracking-[0.06em] text-ink">
                Total
              </span>
              <span
                key={totalCop}
                className="ks-rise font-display text-lg font-bold text-ink"
              >
                {formatCop(totalCop)}
              </span>
            </div>
            <button
              type="button"
              disabled={loading}
              onClick={handleCheckout}
              className={`${CTA} mt-4`}
            >
              <span aria-hidden="true" className={CTA_SWEEP} />
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>
                {loading ? "Generando pedido…" : "Pedir por WhatsApp"}
              </span>
              {!loading && (
                <ArrowRight
                  className="h-4 w-4 transition-transform duration-300 ease-editorial group-hover:translate-x-1.5"
                  aria-hidden="true"
                />
              )}
            </button>
            <button
              type="button"
              onClick={clearCart}
              className="mt-3 w-full cursor-pointer text-center font-mono text-[10px] uppercase tracking-[0.12em] text-muted transition-colors hover:text-kast-error"
            >
              Vaciar bolsa
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
