import { ChevronDown, FileText } from "lucide-react";
import { useState } from "react";
import type { CitationItem } from "@/stores/assistant";

export function CitationChip({ citation }: { citation: CitationItem }) {
  const [expanded, setExpanded] = useState(false);

  const pageLabel =
    citation.pageEnd > citation.pageNumber
      ? `págs. ${citation.pageNumber}-${citation.pageEnd}`
      : `pág. ${citation.pageNumber}`;

  return (
    <div className="rounded-sm border border-line bg-canvas text-left">
      <button
        type="button"
        aria-expanded={expanded}
        onClick={() => setExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between gap-2 px-3 py-1.5 text-[11px] font-semibold text-forest hover:bg-surface/70 cursor-pointer"
      >
        <span className="inline-flex items-center gap-1.5 truncate">
          <FileText className="h-3 w-3 shrink-0" aria-hidden="true" />
          <span className="truncate">
            [{citation.n}] {citation.documentTitle} · {pageLabel}
            {citation.sectionTitle ? ` · ${citation.sectionTitle}` : ""}
          </span>
        </span>
        <ChevronDown
          className={`h-3.5 w-3.5 shrink-0 transition-transform ${expanded ? "rotate-180" : ""}`}
          aria-hidden="true"
        />
      </button>

      {expanded && citation.snippet && (
        <div className="border-t border-line px-3 py-2 text-[11px] leading-relaxed text-muted bg-surface/50">
          “{citation.snippet}”
        </div>
      )}
    </div>
  );
}
