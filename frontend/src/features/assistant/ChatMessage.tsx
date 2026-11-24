import { AlertCircle, Info } from "lucide-react";
import { KastStaticIcon } from "@/components/brand/KastStaticIcon";
import type { ChatTurn } from "@/stores/assistant";
import { CitationChip } from "./CitationChip";

export function ChatMessage({ turn }: { turn: ChatTurn }) {
  if (turn.role === "user") {
    return (
      <div className="ks-slide-in flex justify-end">
        <div className="max-w-[85%] rounded-[18px] rounded-br-sm bg-forest px-4 py-2.5 text-sm leading-relaxed text-white shadow-[0_10px_24px_-18px_rgb(31_58_46/0.8)]">
          {turn.content}
        </div>
      </div>
    );
  }

  const isNoEvidence = turn.status === "NO_EVIDENCE";
  const isError = turn.status === "ERROR" || turn.status === "REJECTED";

  return (
    <div className="ks-slide-in flex items-start gap-2.5">
      <div className="mt-0.5 shrink-0 rounded-full bg-mint p-1">
        <KastStaticIcon state={isError ? "error" : "speaking"} size={26} title="Kast" />
      </div>

      <div className="min-w-0 flex-1 space-y-2">
        <div
          className={[
            "rounded-[18px] rounded-tl-sm border px-4 py-3 text-sm leading-relaxed shadow-[0_10px_24px_-20px_rgb(17_17_17/0.6)]",
            isError
              ? "border-red-200 bg-red-50 text-red-900"
              : isNoEvidence
                ? "border-amber-200 bg-amber-50/70 text-navy"
                : "border-line bg-white text-ink",
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
            <p className="font-display text-[9px] font-semibold uppercase tracking-nav text-muted">
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
