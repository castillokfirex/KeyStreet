import type { CSSProperties, ReactNode } from "react";
import { KastStaticIcon } from "@/components/brand/KastStaticIcon";

/**
 * Escenas ilustradas de Kast para la vitrina del login. Todo es HTML/CSS +
 * el SVG estático de Kast (sin `motion`) y fotos reales del catálogo, así que
 * pesan poco y se pueden duplicar para el bucle infinito.
 */

const photo = (slug: string, n = 1) =>
  `/assets/products/${slug}/${slug}-${n}.480.webp`;

type Aspect = "4/5" | "1/1" | "3/4";

export function SceneCard({
  bg,
  aspect,
  caption,
  dark = false,
  children,
}: {
  bg: string;
  aspect: Aspect;
  caption: string;
  dark?: boolean;
  children: ReactNode;
}) {
  return (
    <figure
      className="group relative w-full shrink-0 cursor-default overflow-hidden"
      style={{ background: bg, aspectRatio: aspect }}
    >
      <div className="absolute inset-0 transition-transform duration-[900ms] ease-editorial will-change-transform group-hover:scale-[1.12] group-hover:-rotate-1">
        {children}
      </div>
      <figcaption
        className={`absolute bottom-2.5 left-2.5 z-20 px-2 py-1 font-mono text-[9px] uppercase tracking-[0.14em] transition-transform duration-500 ease-editorial group-hover:-translate-y-0.5 ${
          dark ? "bg-white text-ink" : "bg-ink text-white"
        }`}
      >
        {caption}
      </figcaption>
    </figure>
  );
}

export function Polaroid({
  src,
  rotate,
  className,
  imgClassName = "aspect-[5/4]",
}: {
  src: string;
  rotate: number;
  className: string;
  imgClassName?: string;
}) {
  return (
    <div
      className={`absolute bg-white p-[3.5%] pb-[9%] shadow-[0_18px_40px_-14px_rgba(0,0,0,0.55)] ${className}`}
      style={{ rotate: `${rotate}deg` }}
    >
      <img
        src={src}
        alt=""
        loading="lazy"
        decoding="async"
        draggable={false}
        className={`w-full bg-surface object-cover ${imgClassName}`}
      />
    </div>
  );
}

function Sticker({
  children,
  className,
  style,
}: {
  children: ReactNode;
  className: string;
  style?: CSSProperties;
}) {
  return (
    <span
      className={`absolute z-10 px-2 py-1 font-display text-[10px] font-black uppercase tracking-[0.08em] font-expanded shadow-[0_6px_14px_-6px_rgba(0,0,0,0.5)] ${className}`}
      style={style}
    >
      {children}
    </span>
  );
}

/* ------------------------------------------------------------- Escenas */

export function CourtScene() {
  return (
    <SceneCard bg="#2f4fa8" aspect="4/5" caption="Kast en la cancha">
      <div className="absolute -bottom-[30%] left-1/2 aspect-square w-[90%] -translate-x-1/2 rounded-full border-2 border-white/25" />
      <div className="absolute bottom-[20%] left-0 h-0.5 w-full bg-white/25" />
      <Polaroid
        src={photo("air-jordan-1-low")}
        rotate={-6}
        className="left-[9%] top-[12%] w-[74%]"
      />
      <Sticker
        className="right-[7%] top-[7%] bg-[#ffd84d] text-ink"
        style={{ rotate: "9deg" }}
      >
        Drop 26
      </Sticker>
      <div className="ks-bob absolute bottom-[4%] right-[5%] w-[42%]">
        <KastStaticIcon
          state="listening"
          size={200}
          className="h-auto w-full"
          title=""
        />
      </div>
    </SceneCard>
  );
}

export function NapScene() {
  return (
    <SceneCard bg="#f4b6c6" aspect="1/1" caption="Siesta en la caja">
      <div className="absolute bottom-[30%] left-1/2 w-[46%] -translate-x-1/2">
        <KastStaticIcon
          state="idle"
          size={200}
          className="h-auto w-full text-ink"
          title=""
        />
      </div>
      {/* Caja de zapatos */}
      <div className="absolute bottom-[8%] left-[12%] z-10 h-[36%] w-[76%] bg-[#e8743b] shadow-[0_14px_30px_-12px_rgba(0,0,0,0.45)]">
        <div className="absolute -left-[3%] -top-[14%] h-[26%] w-[106%] bg-[#c95a26]" />
        <div className="absolute bottom-[16%] left-[8%] bg-white px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-[0.12em] text-ink">
          Key Street · 42 EU
        </div>
      </div>
    </SceneCard>
  );
}

export function SizeScene() {
  return (
    <SceneCard bg="#c9e265" aspect="3/4" caption="Midiendo tu talla">
      <Polaroid
        src={photo("nike-dunk-low-retro-panda")}
        rotate={5}
        className="right-[8%] top-[9%] w-[72%]"
      />
      {/* Cinta métrica */}
      <div
        className="absolute left-[-10%] top-[56%] z-10 flex h-[11%] w-[120%] items-end justify-around bg-[#ffd84d] px-6 pb-1 font-mono text-[9px] font-semibold text-ink shadow-[0_10px_22px_-10px_rgba(0,0,0,0.5)]"
        style={{
          rotate: "-11deg",
          backgroundImage:
            "repeating-linear-gradient(90deg, rgba(17,17,17,0.85) 0 1px, transparent 1px 10px)",
          backgroundSize: "100% 35%",
          backgroundRepeat: "no-repeat",
        }}
      >
        <span>38</span>
        <span>39</span>
        <span>40</span>
        <span>41</span>
        <span>42</span>
      </div>
      <div className="ks-bob absolute bottom-[5%] left-[6%] z-10 w-[40%]">
        <KastStaticIcon
          state="thinking"
          size={200}
          className="h-auto w-full text-ink"
          title=""
        />
      </div>
    </SceneCard>
  );
}

export function SpinScene() {
  return (
    <SceneCard bg="#111111" aspect="1/1" caption="Probador 360°" dark>
      <span
        aria-hidden="true"
        className="text-outline absolute left-1/2 top-[6%] -translate-x-1/2 font-display font-expanded text-[3.2rem] font-black leading-none"
        style={{ "--outline-color": "rgba(255,255,255,0.35)" } as CSSProperties}
      >
        360°
      </span>
      <div className="ks-spin absolute left-1/2 top-[54%] aspect-square w-[74%] -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-dashed border-white/35" />
      <div className="absolute left-1/2 top-[54%] aspect-square w-[58%] -translate-x-1/2 -translate-y-1/2 overflow-hidden rounded-full bg-surface">
        <img
          src={photo("nike-air-force-1-low-07-blanco")}
          alt=""
          loading="lazy"
          decoding="async"
          draggable={false}
          className="h-full w-full scale-[1.35] object-cover"
        />
      </div>
      <div className="ks-bob absolute right-[5%] top-[30%] w-[30%]">
        <KastStaticIcon
          state="success"
          size={200}
          className="h-auto w-full"
          title=""
        />
      </div>
    </SceneCard>
  );
}

function PdfScene() {
  const sheet = (rotate: number, className: string) => (
    <div
      className={`absolute w-[52%] bg-white p-[5%] shadow-[0_14px_28px_-12px_rgba(0,0,0,0.45)] ${className}`}
      style={{ rotate: `${rotate}deg`, aspectRatio: "3/4" }}
    >
      <div className="mb-[8%] h-[6%] w-[55%] bg-ink/80" />
      <div
        className="h-[70%] w-full"
        style={{
          backgroundImage:
            "repeating-linear-gradient(180deg, rgba(17,17,17,0.18) 0 2px, transparent 2px 9px)",
        }}
      />
      <span className="absolute bottom-[6%] right-[6%] bg-[#d6322b] px-1 font-mono text-[8px] font-bold text-white">
        PDF
      </span>
    </div>
  );
  return (
    <SceneCard bg="#e8743b" aspect="4/5" caption="Kast estudia las fichas">
      {sheet(-10, "left-[10%] top-[30%]")}
      {sheet(4, "left-[30%] top-[26%]")}
      {sheet(12, "left-[40%] top-[36%] z-10")}
      <div className="ks-bob absolute left-[24%] top-[4%] w-[40%]">
        <KastStaticIcon
          state="thinking"
          size={200}
          className="h-auto w-full text-ink"
          title=""
        />
      </div>
    </SceneCard>
  );
}

export function ChatScene() {
  return (
    <SceneCard bg="#1f3a2e" aspect="3/4" caption="Pedidos por WhatsApp" dark>
      <Polaroid
        src={photo("adidas-samba-og-blanco-negro")}
        rotate={-7}
        className="left-[8%] top-[8%] w-[56%]"
      />
      <div className="absolute right-[8%] top-[42%] z-10 max-w-[64%] bg-white px-3 py-2 font-sans text-[11px] font-medium leading-snug text-ink shadow-lg">
        ¿Tienen la Samba en 42?
      </div>
      <div className="absolute bottom-[16%] left-[30%] z-10 max-w-[64%] bg-[#e5ecd8] px-3 py-2 font-sans text-[11px] font-medium leading-snug text-ink shadow-lg">
        ¡Claro! Te la separo ya mismo.
      </div>
      <div className="ks-bob absolute bottom-[12%] left-[5%] w-[24%]">
        <KastStaticIcon
          state="speaking"
          size={200}
          className="h-auto w-full"
          title=""
        />
      </div>
    </SceneCard>
  );
}

function Poster({
  slug,
  brand,
  bg,
  aspect,
  ink = "#111111",
  rotate = -4,
}: {
  slug: string;
  brand: string;
  bg: string;
  aspect: Aspect;
  ink?: string;
  rotate?: number;
}) {
  return (
    <SceneCard bg={bg} aspect={aspect} caption={brand}>
      <span
        aria-hidden="true"
        className="absolute left-[6%] top-[5%] font-display font-expanded text-[2.6rem] font-black uppercase leading-[0.85]"
        style={{ color: ink }}
      >
        {brand.split(" ")[0]}
      </span>
      <Polaroid
        src={photo(slug)}
        rotate={rotate}
        className="bottom-[14%] left-[10%] w-[80%]"
      />
    </SceneCard>
  );
}

/* ------------------------------------------------------------- Columnas */

const COLUMNS: ReactNode[][] = [
  [
    <CourtScene key="court" />,
    <Poster
      key="samba"
      slug="adidas-samba-og-blanco-negro"
      brand="Samba"
      bg="#ffd84d"
      aspect="3/4"
    />,
    <PdfScene key="pdf" />,
    <Poster
      key="nb"
      slug="new-balance-550"
      brand="NB 550"
      bg="#9ec5ff"
      aspect="1/1"
      rotate={3}
    />,
  ],
  [
    <NapScene key="nap" />,
    <Poster
      key="aj4"
      slug="air-jordan-4"
      brand="Jordan"
      bg="#ff6b4a"
      aspect="4/5"
      ink="#fff4ec"
      rotate={4}
    />,
    <SpinScene key="spin" />,
    <Poster
      key="campus"
      slug="adidas-campus-00s"
      brand="Campus"
      bg="#c9b6ff"
      aspect="3/4"
    />,
  ],
  [
    <SizeScene key="size" />,
    <Poster
      key="stan"
      slug="adidas-stan-smith"
      brand="Stan"
      bg="#7fd1ae"
      aspect="1/1"
      rotate={-2}
    />,
    <ChatScene key="chat" />,
    <Poster
      key="chuck"
      slug="converse-chuck-taylor-all-star-clasico"
      brand="Chuck"
      bg="#ffe9d6"
      aspect="4/5"
      ink="#d6322b"
      rotate={5}
    />,
  ],
];

const SPEEDS = ["52s", "64s", "58s"];

function MarqueeColumn({
  items,
  index,
}: {
  items: ReactNode[];
  index: number;
}) {
  const reverse = index % 2 === 1;
  return (
    <div
      className={`relative overflow-hidden ${index === 2 ? "hidden xl:block" : ""}`}
    >
      <div
        className={`ks-marquee-y flex flex-col ${reverse ? "ks-marquee-reverse" : ""}`}
        style={{ "--ks-marquee-duration": SPEEDS[index] } as CSSProperties}
      >
        <div className="flex flex-col gap-3 pb-3">{items}</div>
        {/* Copia para el bucle continuo */}
        <div className="flex flex-col gap-3 pb-3" aria-hidden="true" inert>
          {items}
        </div>
      </div>
    </div>
  );
}

/** Vitrina vertical en movimiento continuo (escritorio). */
export function KastShowcase() {
  return (
    <div
      className="absolute inset-0 grid grid-cols-2 gap-3 px-3 xl:grid-cols-3"
      aria-hidden="true"
    >
      {COLUMNS.map((items, i) => (
        <MarqueeColumn key={i} items={items} index={i} />
      ))}
    </div>
  );
}

/** Franja horizontal en movimiento continuo (móvil). */
export function KastStrip() {
  const items = [
    <CourtScene key="court" />,
    <NapScene key="nap" />,
    <SizeScene key="size" />,
    <SpinScene key="spin" />,
    <ChatScene key="chat" />,
    <PdfScene key="pdf" />,
  ].map((node, i) => (
    <div key={i} className="w-36 shrink-0">
      {node}
    </div>
  ));
  return (
    <div className="relative overflow-hidden" aria-hidden="true">
      <div
        className="ks-marquee-x flex w-max"
        style={{ "--ks-marquee-duration": "40s" } as CSSProperties}
      >
        <div className="flex items-end gap-2.5 pr-2.5">{items}</div>
        <div className="flex items-end gap-2.5 pr-2.5" inert>
          {items}
        </div>
      </div>
    </div>
  );
}
