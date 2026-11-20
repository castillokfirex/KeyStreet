export function recommendSize(
  usualSizeEu: number,
  fit?: "TRUE_TO_SIZE" | "RUNS_SMALL" | "RUNS_LARGE",
): { sizeEu: number; reason: string } {
  const safeUsual = Math.max(36, Math.min(44, Math.round(usualSizeEu)));
  if (fit === "RUNS_SMALL") {
    const rec = Math.max(36, Math.min(44, safeUsual + 1));
    return {
      sizeEu: rec,
      reason: `Horma estrecha: recomendamos talla ${rec} (+1 EU).`,
    };
  }
  if (fit === "RUNS_LARGE") {
    const rec = Math.max(36, Math.min(44, safeUsual - 1));
    return {
      sizeEu: rec,
      reason: `Horma amplia: recomendamos talla ${rec} (-1 EU).`,
    };
  }
  return {
    sizeEu: safeUsual,
    reason: `Horma fiel a tu talla habitual (${safeUsual} EU).`,
  };
}
