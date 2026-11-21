import type { ReactNode } from "react";

export type BadgeTone = "forest" | "navy" | "mint" | "neutral" | "danger";

const TONE_CLASSES: Record<BadgeTone, string> = {
  forest: "bg-forest text-white",
  navy: "bg-navy text-white",
  mint: "bg-mint text-forest",
  neutral: "bg-canvas text-navy border border-line",
  danger: "bg-red-50 text-red-700 border border-red-200",
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
        "inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 font-display text-[10px] font-bold uppercase tracking-[0.14em]",
        TONE_CLASSES[tone],
        className,
      ].join(" ")}
    >
      {children}
    </span>
  );
}
