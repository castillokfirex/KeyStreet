import { ChevronDown } from "lucide-react";
import { useState, type ReactNode } from "react";

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

  return (
    <div className="divide-y divide-line border-t border-b border-line">
      {items.map((item) => {
        const isOpen = openId === item.id;
        return (
          <div key={item.id}>
            <button
              type="button"
              aria-expanded={isOpen}
              onClick={() => setOpenId(isOpen ? null : item.id)}
              className="flex w-full items-center justify-between py-3.5 text-left text-sm font-semibold text-navy hover:text-forest transition-colors cursor-pointer"
            >
              <span>{item.title}</span>
              <ChevronDown
                className={`h-4 w-4 text-muted transition-transform duration-200 ${isOpen ? "rotate-180" : ""}`}
                aria-hidden="true"
              />
            </button>
            {isOpen && (
              <div className="pb-4 text-xs leading-relaxed text-muted">
                {item.content}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
