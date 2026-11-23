import { Link, useSearchParams } from "react-router";
import { KastLogo } from "@/components/brand/KastLogo";

/** Chips de colección: bloque de color con texto blanco (sin pedir imágenes). */
const CHIPS = [
  // Running, básquet y tenis: siluetas de origen deportivo
  { label: "Deportivos", param: ["tags", "running,basquet,tenis"], tone: "bg-[#2f4fa8]" },
  { label: "Skate", param: ["tags", "skate"], tone: "bg-forest" },
  { label: "Clásicos", param: ["tags", "clasico"], tone: "bg-ink" },
  // Pares de línea limpia y materiales premium para outfits más formales
  { label: "Elegantes", param: ["tags", "premium,minimalista,limpio"], tone: "bg-[#5c1f2a]" },
] as const;

/** Nombre legible de una colección a partir del parámetro `tags`. */
export function collectionLabel(tags: string): string {
  return CHIPS.find((c) => c.param[0] === "tags" && c.param[1] === tags)?.label ?? tags;
}

export function CollectionChips() {
  const [searchParams] = useSearchParams();

  return (
    <nav aria-label="Colecciones destacadas">
      <ul className="no-scrollbar flex gap-[var(--ks-grid-gap)] overflow-x-auto">
        {CHIPS.map(({ label, param: [key, value], tone }) => {
          const active = searchParams.get(key) === value;
          return (
            <li key={label}>
              <Link
                to={`/catalogo?${key}=${encodeURIComponent(value)}`}
                aria-current={active ? "page" : undefined}
                className={`group relative block aspect-[4/3] w-[7.25rem] overflow-hidden md:w-[8.25rem] ${tone} ${active ? "outline outline-1 outline-offset-2 outline-ink" : ""}`}
              >
                <span
                  aria-hidden="true"
                  className="absolute -right-4 -top-3 w-20 text-canvas/15 transition-transform duration-500 group-hover:scale-105"
                >
                  <KastLogo variant="isotype" size={80} className="h-auto w-full" title={label} />
                </span>
                <span className="absolute bottom-2 left-2 font-display text-[10px] font-semibold uppercase tracking-nav text-canvas">
                  {label}
                </span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
