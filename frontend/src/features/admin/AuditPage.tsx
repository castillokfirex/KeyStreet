import { useQuery } from "@tanstack/react-query";
import { ChevronDown, FileText } from "lucide-react";
import { Fragment, useState } from "react";
import { adminApi, queryKeys } from "@/lib/queries";
import type { RagAuditEntryDto } from "@/lib/types";
import { CARD, PageHeader, SkeletonRows, StatGrid, StatusPill, TABLE, THEAD, timeAgo, type PillTone } from "./ui";

const STATUS: Record<string, { tone: PillTone; label: string; help: string }> = {
  ANSWERED: { tone: "good", label: "Respondida", help: "Kast respondió con citas verificadas." },
  NO_EVIDENCE: {
    tone: "warn",
    label: "Sin evidencia",
    help: "No había información en los documentos: Kast no inventó una respuesta. Conviene subir una guía sobre el tema.",
  },
  REJECTED: { tone: "bad", label: "Rechazada", help: "La pregunta intentó saltarse las reglas del asistente y se bloqueó." },
  ERROR: { tone: "bad", label: "Error", help: "Falló la consulta al servicio de IA." },
};

const statusOf = (s: string) => STATUS[s] ?? { tone: "neutral" as PillTone, label: s, help: "" };

export function formatLatency(ms: number) {
  return ms < 1000 ? `${ms} ms` : `${(ms / 1000).toFixed(1).replace(".", ",")} s`;
}

function median(values: number[]) {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : Math.round((sorted[mid - 1] + sorted[mid]) / 2);
}

function AuditRow({ row, open, onToggle }: { row: RagAuditEntryDto; open: boolean; onToggle: () => void }) {
  const status = statusOf(row.status);
  const detailId = `audit-detail-${row.id}`;
  return (
    <Fragment>
      <tr className={`transition-colors duration-150 ${open ? "bg-surface/60" : "hover:bg-surface/50"}`}>
        <td className="whitespace-nowrap px-4 py-3.5 text-muted" title={new Date(row.createdAt).toLocaleString("es-CO")}>
          {timeAgo(row.createdAt)}
        </td>
        <td className="max-w-md px-4 py-3.5">
          <button
            type="button"
            onClick={onToggle}
            aria-expanded={open}
            aria-controls={detailId}
            className="group flex w-full cursor-pointer items-start gap-2 text-left"
          >
            <ChevronDown
              className={`mt-0.5 h-3.5 w-3.5 shrink-0 text-muted transition-transform duration-200 ease-out ${open ? "rotate-180" : ""}`}
              aria-hidden="true"
            />
            <span className="text-[13px] font-medium text-ink group-hover:underline group-hover:underline-offset-2">
              {row.question}
            </span>
          </button>
        </td>
        <td className="px-4 py-3.5">
          <StatusPill tone={status.tone}>{status.label}</StatusPill>
        </td>
        <td className="px-4 py-3.5 font-semibold tabular-nums text-ink">{row.citations?.length ?? 0}</td>
        <td className="px-4 py-3.5 font-mono text-[11px] text-muted">{row.chatModel || "—"}</td>
        <td className="whitespace-nowrap px-4 py-3.5 tabular-nums text-ink">{formatLatency(row.latencyMs)}</td>
      </tr>
      <tr aria-hidden={!open}>
        <td colSpan={6} className="p-0">
          {/* Altura animada con grid 0fr → 1fr: sin medir en JS */}
          <div
            id={detailId}
            className={`grid transition-[grid-template-rows] duration-200 ease-out ${open ? "grid-rows-[1fr]" : "grid-rows-[0fr]"}`}
          >
            <div className="min-h-0 overflow-hidden">
              <div className="space-y-3 border-t border-line bg-surface/40 px-4 py-4 sm:pl-12">
                {status.help && <p className="text-xs text-muted">{status.help}</p>}
                {row.citations?.length ? (
                  <ul className="grid gap-2 md:grid-cols-2">
                    {row.citations.map((c) => (
                      <li key={c.chunkId} className="border border-line bg-canvas p-3">
                        <p className="flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.1em] text-forest">
                          <FileText className="h-3 w-3" aria-hidden="true" />[{c.n}] {c.documentTitle} · pág. {c.pageNumber}
                          {c.sectionTitle ? ` · ${c.sectionTitle}` : ""}
                        </p>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink">“{c.snippet}”</p>
                      </li>
                    ))}
                  </ul>
                ) : null}
                <p className="font-mono text-[10px] text-gray">
                  {row.productSlug ? `Producto: ${row.productSlug} · ` : ""}Canal: {row.channel}
                  {row.embeddingModel ? ` · Embeddings: ${row.embeddingModel}` : ""}
                </p>
              </div>
            </div>
          </div>
        </td>
      </tr>
    </Fragment>
  );
}

export function AuditPage() {
  const [openId, setOpenId] = useState<string | null>(null);
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminAudit,
    queryFn: () => adminApi.getRagAudit(0, 30),
  });

  const rows = data?.items ?? [];
  const answered = rows.filter((r) => r.status === "ANSWERED").length;
  const noEvidence = rows.filter((r) => r.status === "NO_EVIDENCE").length;
  const rejected = rows.filter((r) => r.status === "REJECTED").length;
  const answeredRate = rows.length ? Math.round((answered / rows.length) * 100) : 0;
  const latency = median(rows.filter((r) => r.status === "ANSWERED").map((r) => r.latencyMs));

  return (
    <div className="space-y-6">
      <PageHeader
        eyebrow="Trazabilidad de Kast"
        title="Auditoría del asistente"
        description="Cada pregunta que recibe Kast, con su estado, las citas que entregó y cuánto tardó. Abre una fila para ver las fuentes."
      />

      <StatGrid
        stats={[
          { label: "Consultas", value: isLoading ? "—" : rows.length },
          {
            label: "Respondidas",
            value: isLoading ? "—" : `${answeredRate}%`,
            tone: "good",
            hint: `${answered} con citas`,
          },
          {
            label: "Sin evidencia",
            value: isLoading ? "—" : noEvidence,
            tone: noEvidence ? "warn" : "default",
            hint: noEvidence ? "temas para documentar" : undefined,
          },
          {
            label: "Latencia mediana",
            value: isLoading ? "—" : formatLatency(latency),
            hint: rejected ? `${rejected} bloqueada${rejected > 1 ? "s" : ""}` : undefined,
          },
        ]}
      />

      <div className={CARD}>
        <table className={TABLE}>
          <thead className={THEAD}>
            <tr>
              <th className="px-4 py-3">Cuándo</th>
              <th className="px-4 py-3">Pregunta</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Citas</th>
              <th className="px-4 py-3">Modelo</th>
              <th className="px-4 py-3">Latencia</th>
            </tr>
          </thead>
          <tbody>
            {isLoading ? (
              <SkeletonRows cols={6} />
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-12 text-center">
                  <p className="font-display text-sm font-bold uppercase text-ink">Aún no hay consultas</p>
                  <p className="mt-1 text-xs text-muted">Cuando un cliente le pregunte a Kast, aparecerá aquí.</p>
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <AuditRow
                  key={r.id}
                  row={r}
                  open={openId === r.id}
                  onToggle={() => setOpenId((id) => (id === r.id ? null : r.id))}
                />
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
