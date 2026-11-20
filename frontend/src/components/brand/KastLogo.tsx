import { useId } from "react";

export type KastLogoProps = {
  variant: "isotype" | "wordmark";
  size?: number;
  className?: string;
  title?: string;
  showMark?: boolean;
};

/**
 * Identidad visual dual de Key Street x Kast:
 * - "isotype": silueta geométrica continua del koala (catálogo, móvil, favicon, marcas de agua)
 * - "wordmark": logotipo tipográfico editorial "KEY STREET" con notch de llave (detalle de producto)
 */
export function KastLogo({
  variant,
  size = 28,
  className = "",
  title = "Key Street x Kast",
  showMark = true,
}: KastLogoProps) {
  const titleId = useId();

  if (variant === "isotype") {
    return (
      <svg
        width={size}
        height={size}
        viewBox="0 0 64 64"
        fill="none"
        role="img"
        aria-labelledby={titleId}
        className={`shrink-0 ${className}`.trim()}
      >
        <title id={titleId}>{title}</title>
        {/* Trazo continuo estilo Matisse de orejas y cabeza geométrica del koala Kast */}
        <path
          d="M21 28 C14 28 11 22 14 16 C17 11 24 13 26 19 C30 17.5 34 17.5 38 19 C40 13 47 11 50 16 C53 22 50 28 43 28 C46.5 33 45.5 41 39 45 C35 47.5 29 47.5 25 45 C18.5 41 17.5 33 21 28 Z"
          stroke="currentColor"
          strokeWidth="2.4"
          strokeLinecap="round"
          strokeLinejoin="round"
          vectorEffect="non-scaling-stroke"
        />
        <ellipse cx="32" cy="34.5" rx="3.4" ry="4.4" fill="currentColor" />
        <circle cx="24.5" cy="29.5" r="1.8" fill="currentColor" />
        <circle cx="39.5" cy="29.5" r="1.8" fill="currentColor" />
      </svg>
    );
  }

  return (
    <span
      role="img"
      aria-label={title}
      className={`inline-flex items-center gap-2.5 select-none ${className}`.trim()}
    >
      {showMark && (
        <svg
          width={size}
          height={size}
          viewBox="0 0 40 40"
          fill="none"
          aria-hidden="true"
          className="shrink-0"
        >
          <rect x="2" y="2" width="36" height="36" rx="9" fill="currentColor" />
          {/* K geométrica con notch de llave */}
          <path
            d="M13 11 V29 M26 11 L16 20 L26 29 M16 20 H21"
            stroke="#FFFFFF"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="29" cy="20" r="1.8" fill="#DDF3E6" />
        </svg>
      )}
      <span className="font-display text-sm sm:text-base font-bold uppercase tracking-[0.32em] leading-none">
        KEY STREET
      </span>
    </span>
  );
}
