import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { publicApi, queryKeys } from "@/lib/queries";
import {
  buildFallbackWhatsappUrl,
  type WhatsappFallbackItem,
} from "@/lib/whatsapp";
import { useToastStore } from "@/stores/toast";

export function useWhatsappCheckout() {
  const [loading, setLoading] = useState(false);
  const pushToast = useToastStore((s) => s.push);
  const { data: tenant } = useQuery({
    queryKey: queryKeys.tenant,
    queryFn: publicApi.getTenant,
  });

  const checkout = async (
    items: { variantId: string; quantity: number; fallback: WhatsappFallbackItem }[],
  ) => {
    if (items.length === 0) return;
    setLoading(true);
    try {
      let targetUrl: string;
      try {
        const res = await publicApi.createWhatsappIntent(
          items.map((i) => ({ variantId: i.variantId, quantity: i.quantity })),
        );
        targetUrl = res.whatsappUrl;
      } catch {
        targetUrl = buildFallbackWhatsappUrl(
          tenant?.whatsappPhone || "573000000000",
          tenant?.name || "Key Street",
          items.map((i) => i.fallback),
        );
        pushToast({
          title: "Usando enlace directo de respaldo",
          description: "El servidor no respondió; abrimos tu pedido por WhatsApp.",
          tone: "warning",
        });
      }
      const win = window.open(targetUrl, "_blank");
      if (win) {
        win.opener = null;
      }
    } finally {
      setLoading(false);
    }
  };

  return { checkout, loading };
}
