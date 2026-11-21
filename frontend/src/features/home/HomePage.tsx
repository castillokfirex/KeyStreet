import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { LazyKastMascot } from "@/components/brand/LazyKastMascot";
import { TrustStrip } from "@/components/layout/TrustStrip";
import { Skeleton } from "@/components/ui/Skeleton";
import { CollectionChips } from "@/features/catalog/CollectionChips";
import { ProductCard } from "@/features/catalog/ProductCard";
import { publicApi, queryKeys } from "@/lib/queries";
import { useAssistantStore } from "@/stores/assistant";

const CTA_BASE =
  "inline-flex h-12 items-center gap-2 px-6 font-display text-[11px] font-semibold uppercase tracking-nav transition-colors";

export function HomePage() {
  const openAssistant = useAssistantStore((s) => s.openDrawer);

  const { data: featured, isLoading } = useQuery({
    queryKey: queryKeys.products({ sort: "recommended", page: 0, pageSize: 4 }),
    queryFn: () =>
      publicApi.getProducts({ sort: "recommended", page: 0, pageSize: 4 }),
  });

  return (
    <div>
      {/* Hero editorial sin cargas 3D ni ML */}
      <section className="border-b border-line">
        <div className="mx-auto grid max-w-[1680px] grid-cols-1 items-end gap-12 px-4 py-16 sm:px-6 sm:py-20 lg:grid-cols-12 lg:px-8 lg:py-24">
          <div className="space-y-6 lg:col-span-8">
            <p className="font-display text-[10px] font-semibold uppercase tracking-nav text-muted">
              Drop Colombia 2026 · 10 siluetas curadas
            </p>

            <h1 className="max-w-4xl font-display text-3xl font-semibold uppercase leading-[1.05] tracking-tight text-ink sm:text-5xl lg:text-6xl">
              Sneakers de archivo con <span className="text-forest">probador 3D</span> y asesoría IA
            </h1>

            <p className="max-w-xl text-sm leading-relaxed text-muted">
              Modelos icónicos de Nike, Adidas, Puma, New Balance y Converse en pesos
              colombianos. Ajusta tu talla con Kast y verifica cada material en 360°
              antes de pedir por WhatsApp.
            </p>

            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Link to="/catalogo" className={`${CTA_BASE} bg-ink text-canvas hover:bg-forest`}>
                <span>Explorar colección</span>
                <ArrowRight className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              </Link>
              <Link
                to="/catalogo?discounted=true"
                className={`${CTA_BASE} border border-ink text-ink hover:bg-ink hover:text-canvas`}
              >
                <span>Ver ofertas 10% – 15% OFF</span>
              </Link>
            </div>
          </div>

          {/* Kast: dormido hasta interactuar */}
          <div className="lg:col-span-4">
            <div className="flex items-start gap-4 border-t border-line pt-6">
              <LazyKastMascot state="idle" size={64} title="Kast, mascota de Key Street" />
              <div className="space-y-2">
                <h2 className="font-display text-xs font-semibold uppercase tracking-nav text-ink">
                  Conoce a Kast
                </h2>
                <p className="text-xs leading-relaxed text-muted">
                  Consulta fichas técnicas, hormas y cuidados citando guías reales de la
                  tienda. Tu foto del probador se procesa local y se borra al instante.
                </p>
                <div className="flex flex-wrap gap-x-4 gap-y-2 pt-1">
                  <button
                    type="button"
                    onClick={() =>
                      openAssistant({
                        prefill: "¿El Adidas Samba OG tiene horma estrecha?",
                      })
                    }
                    className="inline-flex items-center gap-1.5 font-display text-[10px] font-semibold uppercase tracking-nav text-ink underline underline-offset-4 hover:opacity-60 cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
                    <span>Preguntar sobre hormas</span>
                  </button>
                  <Link
                    to="/producto/nike-air-force-1-low-07-blanco"
                    className="font-display text-[10px] font-semibold uppercase tracking-nav text-ink underline underline-offset-4 hover:opacity-60"
                  >
                    Probar 3D en Air Force 1
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Drops destacados */}
      <section className="mx-auto max-w-[1680px] pt-12">
        <div className="mb-5 flex flex-wrap items-end justify-between gap-4 px-4 sm:px-6 lg:px-8">
          <div>
            <p className="font-display text-[10px] font-semibold uppercase tracking-nav text-sale-text">
              Selección especial · Descuentos vigentes
            </p>
            <h2 className="mt-1 font-display text-sm font-semibold uppercase tracking-nav text-ink">
              Drops destacados
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-1 font-display text-[10px] font-semibold uppercase tracking-nav text-ink underline underline-offset-4 hover:opacity-60"
          >
            <span>Ver los 10 pares</span>
            <ArrowRight className="h-3.5 w-3.5" strokeWidth={1.5} aria-hidden="true" />
          </Link>
        </div>

        <div className="mb-6 px-4 sm:px-6 lg:px-8">
          <CollectionChips />
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-[var(--ks-grid-gap)] md:grid-cols-4" aria-hidden="true">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        ) : (
          <ul className="grid grid-cols-2 gap-[var(--ks-grid-gap)] md:grid-cols-4" aria-label="Drops destacados">
            {(featured?.items ?? []).map((product, idx) => (
              <li key={product.id}>
                <ProductCard product={product} eager={idx < 2} />
              </li>
            ))}
          </ul>
        )}
      </section>

      <TrustStrip />
    </div>
  );
}
