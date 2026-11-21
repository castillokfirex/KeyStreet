import type { ReactNode } from "react";

export type BadgeTone = "forest" | "navy" | "mint" | "neutral" | "danger";

/* Etiquetas mínimas: texto pequeño en mayúsculas, sin fondos llamativos. */
const TONE_CLASSES: Record<BadgeTone, string> = {
  forest: "text-sale-text",
  navy: "text-ink",
  mint: "bg-mint text-forest px-2",
  neutral: "text-ink",
  danger: "text-kast-error",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={[
        "inline-flex items-center gap-1 rounded-sm py-0.5 font-display text-[10px] font-semibold uppercase tracking-nav",
        TONE_CLASSES[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
