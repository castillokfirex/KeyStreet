import { useCatalogViewStore, type CatalogDensity } from "@/stores/catalogView";

const OPTIONS: CatalogDensity[] = [2, 3, 4];

/** "VER" 2 / 3 / 4 columnas. Oculto en móvil (siempre 2); la opción 4 solo en desktop. */
export function DensityToggle() {
  const density = useCatalogViewStore((s) => s.density);
  const setDensity = useCatalogViewStore((s) => s.setDensity);

  return (
    <div
      role="group"
      aria-label="Columnas de la rejilla"
      className="hidden items-center gap-1 md:flex"
    >
      <span
        aria-hidden="true"
        className="mr-2 font-display text-[10px] font-semibold uppercase tracking-nav text-muted"
      >
        Ver
      </span>
      {OPTIONS.map((option) => (
        <button
          key={option}
          type="button"
          aria-pressed={density === option}
          aria-label={`${option} columnas`}
          onClick={() => setDensity(option)}
          className={[
            "h-10 w-10 items-center justify-center transition-colors cursor-pointer",
            option === 4 ? "hidden lg:inline-flex" : "inline-flex",
            density === option ? "text-ink" : "text-gray hover:text-ink",
          ].join(" ")}
        >
          <span aria-hidden="true" className="flex h-3 gap-0.5">
            {Array.from({ length: option }, (_, i) => (
              <span key={i} className="w-1 bg-current" />
            ))}
          </span>
        </button>
      ))}
    </div>
  );
}
