import { MessageCircle, Minus, Plus, ShoppingBag, Trash2 } from "lucide-react";
import { Link } from "react-router";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { formatCop } from "@/lib/money";
import { useCartStore } from "@/stores/cart";
import { useWhatsappCheckout } from "./useWhatsappCheckout";

export function BagDrawer() {
  const bagOpen = useCartStore((s) => s.bagOpen);
  const setBagOpen = useCartStore((s) => s.setBagOpen);
  const items = useCartStore((s) => s.items);
  const updateQty = useCartStore((s) => s.updateQty);
  const removeItem = useCartStore((s) => s.removeItem);
  const clearCart = useCartStore((s) => s.clearCart);
  const { checkout, loading } = useWhatsappCheckout();

  const totalCop = items.reduce(
    (sum, item) => sum + item.finalPriceCop * item.quantity,
    0,
  );

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
      onClose={() => setBagOpen(false)}
      title="Tu Bolsa"
      subtitle={`${items.reduce((a, b) => a + b.quantity, 0)} artículo(s) · Precios COP`}
    >
      {items.length === 0 ? (
        <div className="flex h-full flex-col items-center justify-center p-8 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-surface text-muted">
            <ShoppingBag className="h-5 w-5" aria-hidden="true" />
          </div>
          <p className="mt-4 font-display text-sm font-bold uppercase tracking-wider text-navy">
            Tu bolsa está vacía
          </p>
          <p className="mt-1 text-xs text-muted">
            Elige una silueta y tu talla EU para reservarla por WhatsApp.
          </p>
          <Link
            to="/catalogo"
            onClick={() => setBagOpen(false)}
            className="mt-5 inline-flex h-10 items-center rounded-xl bg-navy px-5 font-display text-xs font-bold uppercase tracking-wider text-white"
          >
            Ir al catálogo
          </Link>
        </div>
      ) : (
        <div className="flex h-full flex-col justify-between">
          <ul className="divide-y divide-line p-5">
            {items.map((item) => (
              <li key={item.variantId} className="py-4 first:pt-0">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                      {item.brand} · Talla {item.sizeEu}
                    </p>
                    <Link
                      to={`/producto/${item.slug}`}
                      onClick={() => setBagOpen(false)}
                      className="text-xs font-bold text-navy hover:text-forest"
                    >
                      {item.name}
                    </Link>
                    <p className="mt-0.5 text-[11px] text-muted">SKU {item.sku}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => removeItem(item.variantId)}
                    aria-label={`Eliminar ${item.name}`}
                    className="text-muted hover:text-red-600 cursor-pointer"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>

                <div className="mt-3 flex items-center justify-between">
                  <div className="inline-flex items-center rounded-xl border border-line">
                    <button
                      type="button"
                      onClick={() => updateQty(item.variantId, item.quantity - 1)}
                      aria-label="Disminuir cantidad"
                      className="flex h-8 w-8 items-center justify-center text-navy hover:bg-surface cursor-pointer"
                    >
                      <Minus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                    <span className="w-8 text-center text-xs font-bold">
                      {item.quantity}
                    </span>
                    <button
                      type="button"
                      onClick={() => updateQty(item.variantId, item.quantity + 1)}
                      aria-label="Aumentar cantidad"
                      className="flex h-8 w-8 items-center justify-center text-navy hover:bg-surface cursor-pointer"
                    >
                      <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                    </button>
                  </div>

                  <span className="font-display text-sm font-bold text-navy">
                    {formatCop(item.finalPriceCop * item.quantity)}
                  </span>
                </div>
              </li>
            ))}
          </ul>

          <div className="border-t border-line bg-surface/60 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-muted">Total estimado</span>
              <span className="font-display text-lg font-bold text-navy">
                {formatCop(totalCop)}
              </span>
            </div>
            <Button
              variant="forest"
              fullWidth
              size="lg"
              disabled={loading}
              onClick={handleCheckout}
            >
              <MessageCircle className="h-4 w-4" aria-hidden="true" />
              <span>
                {loading ? "Generando pedido..." : "Pedir bolsa por WhatsApp"}
              </span>
            </Button>
            <button
              type="button"
              onClick={clearCart}
              className="w-full text-center text-[11px] text-muted hover:text-navy cursor-pointer"
            >
              Vaciar bolsa
            </button>
          </div>
        </div>
      )}
    </Drawer>
  );
}
