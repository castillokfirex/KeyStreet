import type { CSSProperties, ReactNode } from "react";
import { KastStaticIcon } from "@/components/brand/KastStaticIcon";
import {
  ChatScene,
  CourtScene,
  NapScene,
  Polaroid,
  SceneCard,
  SizeScene,
  SpinScene,
} from "@/features/admin/login/KastScenes";

/**
 * "Cultura Key Street": muro negro con dos filas de pósters en movimiento
 * continuo (frases, marcas disponibles y escenas de Kast). Todo es HTML/CSS
 * con fotos del catálogo: liviano y sin imágenes generadas.
 */

const photo = (slug: string) => `/assets/products/${slug}/${slug}-1.480.webp`;

function QuotePoster({
  lines,
  accentLine,
  bg,
  ink,
  accent,
  caption,
}: {
  lines: string[];
  accentLine: number;
  bg: string;
  ink: string;
  accent: string;
  caption: string;
}) {
  return (
    <figure
      className="group relative aspect-[4/5] w-full overflow-hidden"
      style={{ backgroundColor: bg, color: ink }}
    >
      <div className="absolute inset-0 flex flex-col justify-between p-5 transition-transform duration-[900ms] ease-editorial group-hover:scale-[1.06]">
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">Key Street · 2026</span>
        <p className="font-display font-expanded text-[1.2rem] font-black uppercase leading-[0.92] tracking-[-0.02em] xl:text-[1.6rem]">
          {lines.map((line, i) => (
            <span key={line} className="block" style={i === accentLine ? { color: accent } : undefined}>
              {line}
            </span>
          ))}
        </p>
        <span className="font-mono text-[9px] uppercase tracking-[0.18em] opacity-70">{caption}</span>
      </div>
    </figure>
  );
}

const longestWord = (text: string) => Math.max(...text.split(" ").map((w) => w.length));

function BrandPoster({ name, slug, tone }: { name: string; slug: string; tone: string }) {
  return (
    <figure className="group relative aspect-[4/5] w-full overflow-hidden bg-[#1c1c1c]">
      <div className="absolute inset-0 transition-transform duration-[900ms] ease-editorial group-hover:scale-[1.08]">
        <span
          className="text-outline absolute left-4 top-4 font-display font-expanded font-black uppercase leading-[0.85]"
          style={
            {
              "--outline-color": tone,
              "--outline-w": "1.5px",
              // La palabra más larga debe caber en el ancho del póster
              fontSize: `min(2.4rem, ${(11.5 / (longestWord(name) * 0.95)).toFixed(2)}rem)`,
            } as CSSProperties
          }
        >
          {name.split(" ").map((w) => (
            <span key={w} className="block">
              {w}
            </span>
          ))}
        </span>
        <Polaroid src={photo(slug)} rotate={-5} className="bottom-[12%] left-[12%] w-[76%]" />
      </div>
      <figcaption className="absolute bottom-2.5 left-2.5 z-20 bg-white px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] text-ink">
        Disponible · {name}
      </figcaption>
    </figure>
  );
}

/** Kast en modo vacaciones: gafas, sol y la frase del póster de la marca. */
function RelaxScene() {
  return (
    <SceneCard bg="#7cc4f0" aspect="4/5" caption="Kast en vacaciones">
      <div className="absolute -right-6 -top-6 h-28 w-28 rounded-full bg-[#ffd84d] opacity-90" />
      <div className="absolute inset-x-0 bottom-0 h-[30%] bg-[#f2d6a2]" />
      <div className="absolute inset-x-0 bottom-[30%] h-[9%] bg-[#3a9fd8]" />
      <p className="absolute left-4 top-5 z-10 font-display font-expanded text-[1.15rem] font-black uppercase leading-[0.9] text-white [text-shadow:0_3px_0_#111] xl:text-[1.5rem]">
        Con estilo
        <br />
        que te
        <br />
        <span className="text-[#ffd84d]">relaja</span>
      </p>
      <div className="ks-bob absolute bottom-[14%] right-[8%] w-[50%]">
        <div className="relative">
          <KastStaticIcon state="idle" size={200} className="h-auto w-full text-white" title="" />
          {/* Gafas de sol sobre los ojos */}
          <div className="absolute left-[27%] top-[50%] flex w-[46%] items-center gap-[6%]" aria-hidden="true">
            <span className="h-[0.9rem] flex-1 rounded-b-full rounded-t-md bg-ink" />
            <span className="h-[0.9rem] flex-1 rounded-b-full rounded-t-md bg-ink" />
          </div>
        </div>
      </div>
    </SceneCard>
  );
}

const ROW_A: ReactNode[] = [
  <QuotePoster
    key="q1"
    lines={["Tu estilo", "te", "define."]}
    accentLine={2}
    bg="#c9e265"
    ink="#111111"
    accent="#1f3a2e"
    caption="Frase de la casa"
  />,
  <CourtScene key="court" />,
  <BrandPoster key="nike" name="Nike" slug="nike-air-force-1-low-07-blanco" tone="#ffffff" />,
  <QuotePoster
    key="q2"
    lines={["Camina", "como si", "fuera tu", "pasarela."]}
    accentLine={3}
    bg="#111111"
    ink="#ffffff"
    accent="#c9e265"
    caption="Street rules"
  />,
  <RelaxScene key="relax" />,
  <BrandPoster key="jordan" name="Jordan" slug="air-jordan-4" tone="#ff6b4a" />,
  <QuotePoster
    key="q3"
    lines={["Primero", "los tenis,", "después", "el plan."]}
    accentLine={1}
    bg="#ff6b4a"
    ink="#111111"
    accent="#ffffff"
    caption="Orden de prioridades"
  />,
  <SpinScene key="spin" />,
];

const ROW_B: ReactNode[] = [
  <BrandPoster key="adidas" name="Adidas" slug="adidas-samba-og-blanco-negro" tone="#9ec5ff" />,
  <NapScene key="nap" />,
  <QuotePoster
    key="q4"
    lines={["Menos", "ruido,", "más", "calle."]}
    accentLine={3}
    bg="#2f4fa8"
    ink="#ffffff"
    accent="#ffd84d"
    caption="Manifiesto"
  />,
  <BrandPoster key="nb" name="New Balance" slug="new-balance-550" tone="#c9e265" />,
  <SizeScene key="size" />,
  <QuotePoster
    key="q5"
    lines={["Cada par", "cuenta", "una", "historia."]}
    accentLine={0}
    bg="#f4b6c6"
    ink="#111111"
    accent="#5c1f2a"
    caption="Kast lo sabe"
  />,
  <BrandPoster key="converse" name="Converse" slug="converse-chuck-taylor-all-star-clasico" tone="#ffd84d" />,
  <ChatScene key="chat" />,
];

function MarqueeRow({ items, reverse, duration }: { items: ReactNode[]; reverse?: boolean; duration: string }) {
  const cells = (hidden: boolean) => (
    <div className="flex gap-3 pr-3" aria-hidden={hidden || undefined} inert={hidden || undefined}>
      {items.map((node, i) => (
        <div key={i} className="w-40 shrink-0 sm:w-48 lg:w-44 xl:w-56 [&>figure]:!aspect-[4/5]">
          {node}
        </div>
      ))}
    </div>
  );
  return (
    <div className="overflow-hidden">
      <div
        className={`ks-marquee-x flex w-max ${reverse ? "ks-marquee-reverse" : ""}`}
        style={{ "--ks-marquee-duration": duration } as CSSProperties}
      >
        {cells(false)}
        {cells(true)}
      </div>
    </div>
  );
}

export function StyleWall() {
  return (
    <section aria-labelledby="style-wall-title" className="mt-10 bg-ink py-10 text-white sm:mt-14 sm:py-12 lg:py-14">
      <div className="mx-auto mb-6 flex max-w-[1680px] flex-wrap items-end justify-between gap-4 px-4 sm:mb-8 sm:px-6 lg:px-8">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[#c9e265]">
            Cultura Key Street
          </p>
          <h2
            id="style-wall-title"
            className="mt-2 font-display font-expanded text-2xl font-black uppercase leading-[0.92] tracking-[-0.02em] sm:text-4xl xl:text-5xl"
          >
            Más que tenis,
            <br />
            <span className="text-outline" style={{ "--outline-color": "#ffffff" } as CSSProperties}>
              una actitud.
            </span>
          </h2>
        </div>
        <p className="max-w-sm text-sm leading-relaxed text-white/65">
          Las marcas que traemos, las frases que nos mueven y Kast viviendo el estilo a su manera.
        </p>
      </div>

      <div className="space-y-3">
        <MarqueeRow items={ROW_A} duration="70s" />
        <MarqueeRow items={ROW_B} duration="80s" reverse />
      </div>
    </section>
  );
}
