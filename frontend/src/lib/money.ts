const copFormatter = new Intl.NumberFormat("es-CO", {
  maximumFractionDigits: 0,
  useGrouping: true,
});

export function formatCop(amount: number): string {
  const safe = Number.isFinite(amount) ? Math.round(amount) : 0;
  return `$${copFormatter.format(safe)} COP`;
}
