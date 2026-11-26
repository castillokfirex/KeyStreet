import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "forest" | "navy" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

/* Estética editorial: esquinas rectas, mayúsculas con tracking, sin sombras. */
const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  forest:
    "bg-forest text-canvas hover:bg-forest-hover border border-transparent",
  navy: "bg-ink text-canvas hover:bg-forest border border-transparent",
  outline:
    "bg-transparent text-ink border border-ink hover:bg-ink hover:text-canvas",
  ghost: "bg-transparent text-ink hover:bg-surface border border-transparent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-4 text-[10px] tracking-nav",
  md: "h-11 px-5 text-[11px] tracking-nav",
  lg: "h-12 px-6 text-[11px] tracking-nav",
};

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "navy",
      size = "md",
      fullWidth = false,
      className = "",
      type = "button",
      disabled,
      children,
      ...rest
    },
    ref,
  ) => (
    <button
      ref={ref}
      type={type}
      disabled={disabled}
      className={[
        "inline-flex items-center justify-center gap-2 rounded-sm font-display font-semibold uppercase transition-[color,background-color,border-color,transform] duration-150 ease-out",
        // Respuesta al presionar: el botón "escucha" al usuario
        "active:scale-[0.97] disabled:active:scale-100 disabled:opacity-45 disabled:cursor-not-allowed cursor-pointer select-none",
        VARIANT_CLASSES[variant],
        SIZE_CLASSES[size],
        fullWidth ? "w-full" : "",
        className,
      ]
        .filter(Boolean)
        .join(" ")}
      {...rest}
    >
      {children}
    </button>
  ),
);

Button.displayName = "Button";
