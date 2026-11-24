import { Minus, Plus } from "lucide-react";
import { useId, useState, type ReactNode } from "react";

export interface AccordionItem {
  id: string;
  title: string;
  content: ReactNode;
}

export function Accordion({
  items,
  defaultOpenId,
}: {
  items: AccordionItem[];
  defaultOpenId?: string;
}) {
  const [openId, setOpenId] = useState<string | null>(defaultOpenId ?? null);
  const baseId = useId();

  return (
    <div className="divide-y divide-line border-t border-b border-line">
      {items.map((item) => {
        const isOpen = openId === item.id;
        const panelId = `${baseId}-${item.id}`;
        return (
          <div key={item.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              aria-controls={panelId}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex min-h-12 w-full items-center justify-between text-left font-display text-[10px] font-semibold uppercase tracking-nav text-ink hover:opacity-70 transition-opacity cursor-pointer"
            >
              <span>{item.title}</span>
              {isOpen ? (
                <Minus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              ) : (
                <Plus className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
              )}
            </button>
            {isOpen && (
              <div id={panelId} className="pb-5 text-xs leading-relaxed text-muted">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
