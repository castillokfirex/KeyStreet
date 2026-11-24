import type { ButtonHTMLAttributes, ReactNode } from "react";

interface ChipProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  active?: boolean;
  children: ReactNode;
}

export function Chip({
  active = false,
  children,
  className = "",
  type = "button",
  ...rest
}: ChipProps) {
  return (
    <button
      type={type}
      aria-pressed={active}
      className={[
        "inline-flex h-9 items-center gap-1.5 rounded-sm border px-3 font-display text-[10px] font-semibold uppercase tracking-nav transition-colors cursor-pointer",
        active
          ? "border-ink bg-ink text-canvas"
          : "border-line bg-transparent text-ink hover:border-ink",
        className,
      ].join(" ")}
      {...rest}
    >
      {children}
    </button>
  );
}
