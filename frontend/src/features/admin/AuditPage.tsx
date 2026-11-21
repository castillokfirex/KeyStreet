import { useQuery } from "@tanstack/react-query";
import { Badge } from "@/components/ui/Badge";
import { adminApi, queryKeys } from "@/lib/queries";

export function AuditPage() {
  const { data, isLoading } = useQuery({
    queryKey: queryKeys.adminAudit,
    queryFn: () => adminApi.getRagAudit(0, 30),
  });

  const rows = data?.items ?? [];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-2xl font-bold uppercase tracking-tight text-navy">
          Auditoría del Asistente RAG
        </h1>
        <p className="mt-1 text-xs text-muted">
          Trazabilidad de preguntas, citas entregadas, modelos y latencias por tenant.
        </p>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line bg-canvas">
        <table className="w-full text-left text-xs">
          <thead className="border-b border-line bg-surface/70 font-display text-[10px] font-bold uppercase tracking-[0.14em] text-muted">
            <tr>
              <th className="px-4 py-3">Fecha</th>
              <th className="px-4 py-3">Pregunta</th>
              <th className="px-4 py-3">Estado</th>
              <th className="px-4 py-3">Citas</th>
              <th className="px-4 py-3">Modelo Chat</th>
              <th className="px-4 py-3">Latencia</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line">
            {isLoading ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Cargando auditoría...
                </td>
              </tr>
            ) : rows.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-muted">
                  Sin consultas registradas todavía.
                </td>
              </tr>
            ) : (
              rows.map((r) => (
                <tr key={r.id}>
                  <td className="px-4 py-3 text-muted whitespace-nowrap">
                    {new Date(r.createdAt).toLocaleString("es-CO")}
                  </td>
                  <td className="px-4 py-3 font-medium text-navy max-w-md">
                    {r.question}
                  </td>
                  <td className="px-4 py-3">
                    <Badge tone={r.status === "ANSWERED" ? "mint" : "neutral"}>
                      {r.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 font-bold text-navy">
                    {r.citations?.length ?? 0}
                  </td>
                  <td className="px-4 py-3 font-mono text-[11px] text-muted">
                    {r.chatModel || "—"}
                  </td>
                  <td className="px-4 py-3 text-navy">{r.latencyMs} ms</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
