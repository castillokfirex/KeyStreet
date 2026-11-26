import type { CSSProperties, ReactNode } from "react";

/** Encabezado de cada página del panel. */
export function PageHeader({
  eyebrow,
  title,
  description,
  aside,
}: {
  eyebrow: string;
  title: string;
  description: string;
  aside?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">{eyebrow}</p>
        <h1 className="mt-1.5 font-display font-expanded text-2xl font-black uppercase leading-none tracking-[-0.02em] text-ink sm:text-[1.75rem]">
          {title}
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-muted">{description}</p>
      </div>
      {aside}
    </div>
  );
}

export interface Stat {
  label: string;
  value: ReactNode;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}

const STAT_TONE: Record<NonNullable<Stat["tone"]>, string> = {
  default: "bg-ink/25",
  good: "bg-sale",
  warn: "bg-kast-thinking",
  bad: "bg-kast-error",
};

/** Fila de cifras clave. Entrada escalonada corta (decorativa, no bloquea). */
export function StatGrid({ stats }: { stats: Stat[] }) {
  return (
    <dl className="grid grid-cols-2 gap-px overflow-hidden border border-line bg-line lg:grid-cols-4">
      {stats.map((s, i) => (
        <div
          key={s.label}
          className="ks-stat bg-canvas px-4 py-4 sm:px-5"
          style={{ animationDelay: `${[0, 40, 70, 95][i] ?? 110}ms` } as CSSProperties}
        >
          <dt className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.14em] text-muted">
            <span aria-hidden="true" className={`h-1.5 w-1.5 rounded-full ${STAT_TONE[s.tone ?? "default"]}`} />
            {s.label}
          </dt>
          <dd className="mt-2 font-display font-expanded text-2xl font-black tabular-nums text-ink">{s.value}</dd>
          {s.hint && <dd className="mt-0.5 text-[11px] text-muted">{s.hint}</dd>}
        </div>
      ))}
    </dl>
  );
}

export type PillTone = "good" | "warn" | "bad" | "busy" | "neutral";

const PILL_TONE: Record<PillTone, string> = {
  good: "bg-mint text-forest",
  warn: "bg-kast-thinking/12 text-[#8a5f10]",
  bad: "bg-kast-error/10 text-kast-error",
  busy: "bg-ink/[0.06] text-ink",
  neutral: "bg-ink/[0.06] text-muted",
};

/** Estado con punto de color; "busy" late para indicar trabajo en curso. */
export function StatusPill({ tone, children }: { tone: PillTone; children: ReactNode }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 whitespace-nowrap px-2 py-0.5 font-mono text-[10px] font-medium uppercase tracking-[0.1em] ${PILL_TONE[tone]}`}
    >
      <span aria-hidden="true" className="relative flex h-1.5 w-1.5">
        {tone === "busy" && (
          <span className="absolute inline-flex h-full w-full rounded-full bg-current opacity-50 motion-safe:animate-ping" />
        )}
        <span className="relative inline-flex h-1.5 w-1.5 rounded-full bg-current" />
      </span>
      {children}
    </span>
  );
}

/** Filas de esqueleto mientras carga una tabla. */
export function SkeletonRows({ rows = 4, cols }: { rows?: number; cols: number }) {
  return (
    <>
      {Array.from({ length: rows }, (_, r) => (
        <tr key={r} aria-hidden="true">
          {Array.from({ length: cols }, (_, c) => (
            <td key={c} className="px-4 py-4">
              <span
                className="block h-3 animate-pulse bg-surface"
                style={{ width: `${c === 0 ? 70 : 40 + ((r * 13 + c * 7) % 40)}%` }}
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}

export const TABLE = "w-full text-left text-xs";
export const THEAD =
  "border-b border-line bg-surface/60 font-mono text-[10px] font-medium uppercase tracking-[0.14em] text-muted";
export const CARD = "overflow-x-auto border border-line bg-canvas";

/** "hace 2 h" a partir de una fecha ISO. */
export function timeAgo(iso: string, now = Date.now()): string {
  const diff = Math.max(0, now - new Date(iso).getTime());
  const min = Math.round(diff / 60000);
  if (min < 1) return "ahora";
  if (min < 60) return `hace ${min} min`;
  const h = Math.round(min / 60);
  if (h < 24) return `hace ${h} h`;
  const d = Math.round(h / 24);
  return `hace ${d} d`;
}
