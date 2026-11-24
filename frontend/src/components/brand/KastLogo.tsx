import { useId } from "react";

export type KastLogoProps = {
  variant: "isotype" | "wordmark";
  size?: number;
  className?: string;
  title?: string;
  /** Solo wordmark: antepone el isotipo mini */
  showMark?: boolean;
};

const STROKE = 3.2;

/**
 * Silueta lineal de la cabeza de Kast: orejas grandes, cara redonda,
 * nariz ovalada y ojos punto. Trazo uniforme sin relleno (currentColor).
 * Las orejas se recortan con una máscara para que su trazo no cruce la cara.
 * Legible de 24 a 64 px.
 */
function KastSilhouette({
  size,
  className,
  title,
  decorative = false,
}: {
  size: number;
  className?: string;
  title?: string;
  decorative?: boolean;
}) {
  const uid = useId().replace(/[^a-zA-Z0-9_-]/g, "");
  const titleId = `kast-title-${uid}`;
  const maskId = `kast-mask-${uid}`;

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      fill="none"
      role={decorative ? undefined : "img"}
      aria-labelledby={decorative ? undefined : titleId}
      aria-hidden={decorative || undefined}
      focusable="false"
      className={`shrink-0 ${className ?? ""}`.trim()}
    >
      {!decorative && <title id={titleId}>{title}</title>}
      <defs>
        <mask id={maskId} maskUnits="userSpaceOnUse">
          <rect width="64" height="64" fill="white" />
          <circle cx="32" cy="37" r="20" fill="black" />
        </mask>
      </defs>
      <g
        stroke="currentColor"
        strokeWidth={STROKE}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <g mask={`url(#${maskId})`}>
          <circle cx="14" cy="19.5" r="10.5" />
          <circle cx="50" cy="19.5" r="10.5" />
          <path d="M10 22.5a5.5 5.5 0 0 1 6.5-7" />
          <path d="M54 22.5a5.5 5.5 0 0 0-6.5-7" />
        </g>
        <circle cx="32" cy="37" r="20" />
        <ellipse cx="32" cy="41" rx="5.2" ry="7" />
      </g>
      <circle cx="23.5" cy="34" r="2" fill="currentColor" />
      <circle cx="40.5" cy="34" r="2" fill="currentColor" />
    </svg>
  );
}

/**
 * Identidad visual dual de Key Street x Kast:
 * - "isotype": silueta lineal del koala (header, móvil, favicon, marcas de agua)
 * - "wordmark": "KEY STREET" en Archivo expandido extra grueso
 */
export function KastLogo({
  variant,
  size = 28,
  className = "",
  title = "Key Street x Kast",
  showMark = false,
}: KastLogoProps) {
  if (variant === "isotype") {
    return <KastSilhouette size={size} className={className} title={title} />;
  }

  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-flex items-center gap-2.5 select-none ${className}`.trim()}
    >
      {showMark && <KastSilhouette size={size} decorative />}
      <span className="inline-flex items-center gap-[0.35em] whitespace-nowrap font-display font-expanded text-[14px] font-black uppercase leading-none tracking-[0.02em] sm:text-[17px]">
        <span>KEY</span>
        <span>STREET</span>
      </span>
    </span>
  );
}
