import { AlertCircle, Info } from "lucide-react";
import { KastMascot } from "@/components/brand/KastMascot";
import type { ChatTurn } from "@/stores/assistant";
import { CitationChip } from "./CitationChip";

export function ChatMessage({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-navy px-4 py-2.5 text-xs leading-relaxed text-white">
          {turn.content}
        </div>
      </div>
    );
  }

  const isNoEvidence = turn.status === "NO_EVIDENCE";
  const isError = turn.status === "ERROR" || turn.status === "REJECTED";

  return (
    <div className="flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0">
        <KastMascot
          state={isError ? "error" : "idle"}
          size={28}
          title="Kast"
        />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div
          className={[
            "rounded-2xl rounded-tl-sm border px-4 py-3 text-xs leading-relaxed",
            isError
              ? "border-red-200 bg-red-50 text-red-900"
              : isNoEvidence
                ? "border-amber-200 bg-amber-50/70 text-navy"
                : "border-line bg-surface text-navy",
          ].join(" ")}
        >
          {isNoEvidence && (
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-amber-900">
              <Info className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>Sin evidencia directa en documentos</span>
            </div>
          )}
          {isError && (
            <div className="mb-1.5 flex items-center gap-1.5 text-[11px] font-bold text-red-800">
              <AlertCircle className="h-3.5 w-3.5 shrink-0" aria-hidden="true" />
              <span>No pudimos completar la consulta</span>
            </div>
          )}
          <p className="whitespace-pre-line">{turn.content}</p>
        </div>

        {turn.citations && turn.citations.length > 0 && (
          <div className="space-y-1.5" data-testid="citation-list">
            <p className="font-display text-[9px] font-bold uppercase tracking-[0.16em] text-muted">
              Fuentes verificadas ({turn.citations.length})
            </p>
            {turn.citations.map((c) => (
              <CitationChip key={`${c.chunkId}-${c.n}`} citation={c} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
