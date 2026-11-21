import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Sparkles } from "lucide-react";
import { Link } from "react-router";
import { LazyKastMascot } from "@/components/brand/LazyKastMascot";
import { TrustStrip } from "@/components/layout/TrustStrip";
import { Badge } from "@/components/ui/Badge";
import { Skeleton } from "@/components/ui/Skeleton";
import { ProductCard } from "@/features/catalog/ProductCard";
import { publicApi, queryKeys } from "@/lib/queries";
import { useAssistantStore } from "@/stores/assistant";

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
      <section className="border-b border-line bg-surface/65">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 py-12 sm:py-16 lg:py-20">
          <div className="grid grid-cols-1 items-center gap-10 lg:grid-cols-12">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-line bg-canvas px-3.5 py-1.5">
                <span className="h-2 w-2 rounded-full bg-forest" />
                <span className="font-display text-[10px] font-bold uppercase tracking-[0.18em] text-navy">
                  Drop Colombia 2026 · 10 Siluetas Curadas
                </span>
              </div>

              <h1 className="font-display text-3xl sm:text-5xl font-bold uppercase leading-[1.02] tracking-tight text-navy">
                Sneakers de archivo con{" "}
                <span className="text-forest">probador 3D</span> y asesoría IA
              </h1>

              <p className="max-w-xl text-sm sm:text-base leading-relaxed text-muted">
                Explora modelos icónicos de Nike, Adidas, Puma, New Balance y Converse
                en pesos colombianos. Ajusta tu talla con Kast y verifica cada material
                en 360° antes de pedir por WhatsApp.
              </p>

              <div className="flex flex-wrap items-center gap-3 pt-1">
                <Link
                  to="/catalogo"
                  className="inline-flex h-12 items-center gap-2 rounded-xl bg-forest px-6 font-display text-xs font-bold uppercase tracking-[0.14em] text-white hover:bg-[#1e423b] transition-colors"
                >
                  <span>Explorar colección</span>
                  <ArrowRight className="h-4 w-4" aria-hidden="true" />
                </Link>
                <Link
                  to="/catalogo?discounted=true"
                  className="inline-flex h-12 items-center gap-2 rounded-xl border border-line bg-canvas px-6 font-display text-xs font-bold uppercase tracking-[0.14em] text-navy hover:border-navy transition-colors"
                >
                  <span>Ver ofertas 10% – 15% OFF</span>
                </Link>
              </div>
            </div>

            <div className="lg:col-span-5">
              <div className="rounded-2xl border border-line bg-canvas p-6 shadow-xs">
                <div className="flex items-start justify-between gap-4">
                  <div className="space-y-2">
                    <Badge tone="mint">Asistente RAG + Privacidad Local</Badge>
                    <h2 className="font-display text-lg font-bold uppercase tracking-tight text-navy">
                      Conoce a Kast
                    </h2>
                    <p className="text-xs leading-relaxed text-muted">
                      Consulta fichas técnicas, hormas y cuidados citando guías
                      reales de la tienda. Tu foto del probador se procesa local y se
                      borra al instante.
                    </p>
                  </div>
                  <LazyKastMascot state="idle" size={56} title="Kast, mascota de Key Street" />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() =>
                      openAssistant({
                        prefill: "¿El Adidas Samba OG tiene horma estrecha?",
                      })
                    }
                    className="inline-flex items-center gap-1.5 rounded-full border border-line bg-surface px-3.5 py-2 text-xs font-semibold text-navy hover:border-forest cursor-pointer"
                  >
                    <Sparkles className="h-3.5 w-3.5 text-forest" aria-hidden="true" />
                    <span>Preguntar sobre hormas</span>
                  </button>
                  <Link
                    to="/producto/nike-air-force-1-low-07-blanco"
                    className="inline-flex items-center gap-1.5 rounded-full bg-navy px-3.5 py-2 text-xs font-semibold text-white hover:bg-forest transition-colors"
                  >
                    <span>Probar 3D en Air Force 1</span>
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Drops destacados */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 pt-12 pb-4">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-6">
          <div>
            <p className="font-display text-[10px] font-bold uppercase tracking-[0.2em] text-forest">
              Selección especial · Descuentos vigentes
            </p>
            <h2 className="mt-1 font-display text-xl sm:text-2xl font-bold uppercase tracking-tight text-navy">
              Drops destacados
            </h2>
          </div>
          <Link
            to="/catalogo"
            className="inline-flex items-center gap-1 font-display text-xs font-bold uppercase tracking-[0.14em] text-navy hover:text-forest"
          >
            <span>Ver los 10 pares</span>
            <ArrowRight className="h-3.5 w-3.5" aria-hidden="true" />
          </Link>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="aspect-[4/5] w-full" />
            ))}
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-3.5 sm:gap-5 md:grid-cols-4">
            {(featured?.items ?? []).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        )}
      </section>

      <TrustStrip />
    </div>
  );
}
