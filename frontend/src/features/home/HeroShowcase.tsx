import { useQuery } from "@tanstack/react-query";
import { ArrowRight } from "lucide-react";
import { lazy, Suspense, useMemo } from "react";
import { Link } from "react-router";
import { publicApi, queryKeys } from "@/lib/queries";
import type { ProductSummaryDto } from "@/lib/types";

const HeroStage = lazy(() => import("./HeroStage"));

const HERO_LIMIT = 8;

const CTA_BASE =
  "inline-flex h-10 items-center gap-2 px-5 font-display text-[11px] font-semibold uppercase tracking-nav transition-colors sm:h-11 xl:h-12 xl:px-6";

/** Solo pares con foto real: el hero vive de la imagen del producto. */
export function pickHeroProducts(
  items: ProductSummaryDto[],
  limit = HERO_LIMIT,
) {
  return items
    .filter((p) => p.images?.ready && p.images.files.length > 0)
    .slice(0, limit);
}

function StagePlaceholder() {
  return (
    <div
      className="relative flex h-full min-h-[360px] w-full items-center justify-center sm:min-h-[520px]"
      aria-hidden="true"
    >
      <span className="text-outline font-display font-expanded text-[clamp(5rem,16vw,15rem)] font-black uppercase leading-none opacity-20">
        KS
      </span>
    </div>
  );
}

/* ---------------------------------------------------------------------------
 * Hero
 * ------------------------------------------------------------------------- */

export function HeroShowcase({
  initialProducts,
}: {
  initialProducts?: ProductSummaryDto[];
}) {
  const { data } = useQuery({
    queryKey: queryKeys.products({
      sort: "recommended",
      page: 0,
      pageSize: 15,
    }),
    queryFn: () =>
      publicApi.getProducts({ sort: "recommended", page: 0, pageSize: 15 }),
    enabled: !initialProducts,
  });
  const products = useMemo(
    () => pickHeroProducts(initialProducts ?? data?.items ?? []),
    [initialProducts, data?.items],
  );

  return (
    <>
      <section className="relative isolate overflow-hidden border-b border-line">
        {/* Luz de estudio + grano */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 -z-10"
          style={{
            background:
              "radial-gradient(60% 70% at 72% 50%, #e6e6e3 0%, rgba(230,230,227,0) 70%), radial-gradient(40% 50% at 10% 100%, rgba(31,58,46,0.07) 0%, rgba(31,58,46,0) 70%)",
          }}
        />
        <div
          aria-hidden="true"
          className="bg-grain pointer-events-none absolute inset-0 -z-10 opacity-[0.07] mix-blend-multiply"
        />

        <div className="mx-auto grid max-w-[1680px] items-center gap-4 px-4 pb-6 pt-3 sm:px-6 sm:pt-6 lg:min-h-[min(calc(100svh-var(--ks-header-h)),820px)] lg:grid-cols-[minmax(0,1fr)_minmax(0,1.08fr)] lg:gap-8 lg:px-8 lg:pb-6 lg:pt-5 xl:gap-10 xl:pb-10 xl:pt-8">
          {/* Mensaje */}
          <div className="relative z-10">
            <h1 className="font-display font-expanded text-[clamp(2.25rem,min(5.2vw,8.2vh),6rem)] font-black uppercase leading-[0.88] tracking-[-0.035em] text-ink">
              <span className="ks-rise block" style={{ animationDelay: "80ms" }}>
                Pisa fuerte.
              </span>
              <span className="ks-rise block" style={{ animationDelay: "200ms" }}>
                Deja{" "}
                <span className="relative isolate inline-block">
                  <span
                    aria-hidden="true"
                    className="ks-marker absolute inset-x-[-0.06em] bottom-[0.04em] top-[0.2em] -z-10 -rotate-1 bg-[#c9e265]"
                  />
                  huella.
                </span>
              </span>
            </h1>

            <p
              className="ks-rise mt-3.5 max-w-md text-sm leading-relaxed text-muted lg:mt-4 xl:mt-6 xl:text-base"
              style={{ animationDelay: "400ms" }}
            >
              Los pares que todos miran, originales y en pesos colombianos.
              Elige el tuyo, pruébatelo en 3D y recíbelo en todo el país.
            </p>

            <div
              className="ks-rise mt-5 flex flex-wrap items-center gap-2 lg:mt-6 xl:mt-8"
              style={{ animationDelay: "500ms" }}
            >
              <Link
                to="/catalogo"
                className={`${CTA_BASE} bg-ink text-canvas hover:bg-forest`}
              >
                <span>Explorar colección</span>
                <ArrowRight
                  className="h-4 w-4"
                  strokeWidth={1.5}
                  aria-hidden="true"
                />
              </Link>
              <Link
                to="/catalogo?discounted=true"
                className={`${CTA_BASE} border border-ink text-ink hover:bg-ink hover:text-canvas`}
              >
                <span>Ofertas 10–15% off</span>
              </Link>
            </div>

            <dl
              className="ks-rise mt-5 hidden max-w-md grid-cols-3 border-t border-line pt-3.5 sm:grid lg:mt-6 lg:pt-4 xl:mt-10 xl:pt-5"
              style={{ animationDelay: "600ms" }}
            >
              {[
                ["14", "Siluetas"],
                ["7", "Marcas"],
                ["360°", "Probador 3D"],
              ].map(([value, label]) => (
                <div key={label}>
                  <dt className="sr-only">{label}</dt>
                  <dd className="font-display font-expanded text-2xl font-extrabold text-ink">
                    {value}
                  </dd>
                  <dd className="mt-1 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
                    {label}
                  </dd>
                </div>
              ))}
            </dl>
          </div>

          {/* Vitrina */}
          <div className="relative -order-1 lg:order-none lg:h-[min(calc(100svh-var(--ks-header-h)-5rem),760px)]">
            {products.length > 0 ? (
              <Suspense fallback={<StagePlaceholder />}>
                <HeroStage products={products} />
              </Suspense>
            ) : (
              <StagePlaceholder />
            )}
          </div>
        </div>
      </section>
    </>
  );
}
