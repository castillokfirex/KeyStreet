import { useFittingOutfitStore } from "@/stores/fittingOutfit";
import {
  BOTTOM_COLORS,
  BOTTOM_GARMENT_OPTIONS,
  OUTFIT_PRESETS,
  sameOutfit,
  SOCK_COLORS,
  SOCK_OPTIONS,
  swatchName,
  TOP_COLORS,
  TOP_GARMENT_OPTIONS,
} from "../garments";
import { OptionChip, SectionLabel, SwatchRow } from "./controls";

export function OutfitStep() {
  const outfit = useFittingOutfitStore((s) => s.outfit);
  const setTop = useFittingOutfitStore((s) => s.setTop);
  const setBottom = useFittingOutfitStore((s) => s.setBottom);
  const setSocks = useFittingOutfitStore((s) => s.setSocks);
  const applyPreset = useFittingOutfitStore((s) => s.applyPreset);

  return (
    <div className="space-y-7">
      {/* Combinaciones listas */}
      <section>
        <SectionLabel>Combinaciones rápidas</SectionLabel>
        <div className="grid grid-cols-4 gap-1.5">
          {OUTFIT_PRESETS.map((p) => {
            const active = sameOutfit(outfit, p.outfit);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={active}
                onClick={() => applyPreset(p.outfit)}
                className={`group flex cursor-pointer flex-col items-center gap-1.5 border px-1 py-2.5 transition-colors ${
                  active
                    ? "border-ink bg-white"
                    : "border-line bg-white/60 hover:border-ink"
                }`}
              >
                <span
                  className="flex flex-col overflow-hidden rounded-sm border border-line transition-transform duration-300 group-hover:-translate-y-0.5"
                  aria-hidden="true"
                >
                  <span
                    className="h-3.5 w-7"
                    style={{ backgroundColor: p.outfit.top.color }}
                  />
                  <span
                    className="h-3.5 w-7"
                    style={{ backgroundColor: p.outfit.bottom.color }}
                  />
                </span>
                <span className="text-[11px] font-medium text-ink">
                  {p.label}
                </span>
              </button>
            );
          })}
        </div>
      </section>

      {/* Superior */}
      <section>
        <SectionLabel aside={swatchName(TOP_COLORS, outfit.top.color)}>
          Parte de arriba
        </SectionLabel>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {TOP_GARMENT_OPTIONS.map((o) => (
            <OptionChip
              key={o.id}
              active={outfit.top.type === o.id}
              onClick={() => setTop({ type: o.id })}
            >
              {o.label}
            </OptionChip>
          ))}
        </div>
        <SwatchRow
          swatches={TOP_COLORS}
          value={outfit.top.color}
          onChange={(color) => setTop({ color })}
          label="Color de la parte de arriba"
        />
      </section>

      {/* Inferior */}
      <section>
        <SectionLabel aside={swatchName(BOTTOM_COLORS, outfit.bottom.color)}>
          Parte de abajo
        </SectionLabel>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {BOTTOM_GARMENT_OPTIONS.map((o) => (
            <OptionChip
              key={o.id}
              active={outfit.bottom.type === o.id}
              onClick={() => setBottom({ type: o.id })}
            >
              {o.label}
            </OptionChip>
          ))}
        </div>
        <SwatchRow
          swatches={BOTTOM_COLORS}
          value={outfit.bottom.color}
          onChange={(color) => setBottom({ color })}
          label="Color de la parte de abajo"
        />
      </section>

      {/* Medias */}
      <section>
        <SectionLabel
          aside={
            outfit.socks.type === "ninguna"
              ? undefined
              : swatchName(SOCK_COLORS, outfit.socks.color)
          }
        >
          Medias
        </SectionLabel>
        <div className="mb-3 flex flex-wrap gap-1.5">
          {SOCK_OPTIONS.map((o) => (
            <OptionChip
              key={o.id}
              active={outfit.socks.type === o.id}
              onClick={() => setSocks({ type: o.id })}
            >
              {o.label}
            </OptionChip>
          ))}
        </div>
        {outfit.socks.type !== "ninguna" && (
          <SwatchRow
            swatches={SOCK_COLORS}
            value={outfit.socks.color}
            onChange={(color) => setSocks({ color })}
            label="Color de las medias"
          />
        )}
      </section>
    </div>
  );
}
