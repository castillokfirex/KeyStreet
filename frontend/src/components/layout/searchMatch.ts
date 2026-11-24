import type { ProductSummaryDto } from "@/lib/types";

export const MAX_SUGGESTIONS = 3;

/** Minúsculas, sin tildes ni signos: "Air Force 1 '07" → "air force 1 07". */
export function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

const words = (text: string) => normalize(text).split(" ").filter(Boolean);

/** Iniciales de cada palabra; los números van completos ("air force 1" → "af1"). */
function acronym(list: string[]): string {
  return list.map((w) => (/^\d+$/.test(w) ? w : w[0])).join("");
}

/**
 * Puntaje de coincidencia de un par con la búsqueda (0 = no coincide).
 * Acepta nombre, marca, código de modelo y siglas: "af1", "aj4", "nb 550", "ctas".
 */
export function scoreProduct(product: ProductSummaryDto, query: string): number {
  const q = normalize(query);
  if (!q) return 0;
  const qCompact = q.replace(/ /g, "");
  const qTokens = q.split(" ");

  const core = product.name.replace(/\(.*?\)/g, " ");
  const coreWords = words(core);
  const brandWords = words(product.brand);
  const modelWords = coreWords.filter((w) => !brandWords.includes(w));
  const code = normalize(product.modelCode ?? "").replace(/ /g, "");
  const allWords = [...words(product.name), ...brandWords, ...words(product.colorway ?? "")];

  let score = 0;
  if (code && code === qCompact) score = Math.max(score, 100);
  else if (code && qCompact.length >= 2 && code.startsWith(qCompact)) score = Math.max(score, 80);

  if (qCompact.length >= 2) {
    if (acronym(modelWords).startsWith(qCompact)) score = Math.max(score, 90);
    if (acronym(coreWords).startsWith(qCompact)) score = Math.max(score, 85);
  }

  // Cada palabra buscada es el inicio de alguna palabra del par
  if (qTokens.every((t) => allWords.some((w) => w.startsWith(t)))) {
    const firstHit = coreWords.findIndex((w) => w.startsWith(qTokens[0]));
    score = Math.max(score, 70 - Math.max(0, firstHit));
  }

  if (qCompact.length >= 3 && coreWords.join("").includes(qCompact)) score = Math.max(score, 50);
  return score;
}

/** Hasta tres pares que coinciden, del más al menos relevante. */
export function searchProducts(
  products: ProductSummaryDto[],
  query: string,
  limit = MAX_SUGGESTIONS,
): ProductSummaryDto[] {
  return products
    .map((p) => ({ p, s: scoreProduct(p, query) }))
    .filter((x) => x.s > 0)
    .sort((a, b) => b.s - a.s)
    .slice(0, limit)
    .map((x) => x.p);
}
