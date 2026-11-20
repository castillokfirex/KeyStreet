import { forwardRef, type ButtonHTMLAttributes } from "react";

export type ButtonVariant = "forest" | "navy" | "outline" | "ghost";
export type ButtonSize = "sm" | "md" | "lg";

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  fullWidth?: boolean;
}

const VARIANT_CLASSES: Record<ButtonVariant, string> = {
  forest:
    "bg-forest text-white hover:bg-[#1e423b] active:bg-[#112622] border border-transparent",
  navy: "bg-navy text-white hover:bg-[#1e293b] active:bg-[#090e1a] border border-transparent",
  outline:
    "bg-canvas text-navy border border-line hover:border-navy hover:bg-surface",
  ghost: "bg-transparent text-navy hover:bg-surface border border-transparent",
};

const SIZE_CLASSES: Record<ButtonSize, string> = {
  sm: "h-9 px-3.5 text-xs tracking-[0.12em]",
  md: "h-11 px-5 text-xs tracking-[0.14em]",
  lg: "h-12 px-6 text-xs sm:text-sm tracking-[0.14em]",
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
        "inline-flex items-center justify-center gap-2 rounded-xl font-display font-bold uppercase transition-colors",
        "disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer select-none",
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
