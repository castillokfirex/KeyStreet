import { Check } from "lucide-react";
import type { ReactNode } from "react";
import type { Swatch } from "../garments";

/** Etiqueta de sección del panel del probador. */
export function SectionLabel({
  children,
  aside,
}: {
  children: ReactNode;
  aside?: ReactNode;
}) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between gap-2">
      <h3 className="font-mono text-[10px] font-medium uppercase tracking-[0.16em] text-ink">
        {children}
      </h3>
      {aside && (
        <span className="truncate text-[11px] text-muted">{aside}</span>
      )}
    </div>
  );
}

/** Botón de opción (estado con aria-pressed). */
export function OptionChip({
  active,
  onClick,
  children,
  label,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
  label?: string;
}) {
  return (
    <button
      type="button"
      aria-pressed={active}
      aria-label={label}
      onClick={onClick}
      className={`h-9 cursor-pointer border px-3 text-xs font-medium transition-colors duration-200 ${
        active
          ? "border-ink bg-ink text-canvas"
          : "border-line bg-white/70 text-ink hover:border-ink"
      }`}
    >
      {children}
    </button>
  );
}

/** Fila de colores como grupo de radio accesible. */
export function SwatchRow({
  swatches,
  value,
  onChange,
  label,
}: {
  swatches: Swatch[];
  value: string;
  onChange: (hex: string) => void;
  label: string;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {swatches.map((sw) => {
        const selected = sw.hex.toLowerCase() === value.toLowerCase();
        const light = parseInt(sw.hex.slice(1, 3), 16) > 200;
        return (
          <button
            key={sw.hex}
            type="button"
            role="radio"
            aria-checked={selected}
            aria-label={sw.name}
            title={sw.name}
            onClick={() => onChange(sw.hex)}
            className={`flex h-8 w-8 cursor-pointer items-center justify-center rounded-full border transition-transform duration-200 hover:scale-110 ${
              selected ? "ring-2 ring-ink ring-offset-2 ring-offset-canvas" : ""
            } ${light ? "border-line" : "border-transparent"}`}
            style={{ backgroundColor: sw.hex }}
          >
            {selected && (
              <Check
                className={`h-3.5 w-3.5 ${light ? "text-ink" : "text-white"}`}
                strokeWidth={2.5}
                aria-hidden="true"
              />
            )}
          </button>
        );
      })}
    </div>
  );
}
