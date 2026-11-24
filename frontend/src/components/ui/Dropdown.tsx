import { Check, ChevronDown } from "lucide-react";
import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export interface DropdownOption {
  value: string;
  label: string;
  /** Dato secundario a la derecha (p. ej. cantidad de pares). */
  meta?: string;
}

/**
 * Menú desplegable propio (listbox accesible) para reemplazar el <select>
 * nativo: teclado completo, cierre al hacer clic fuera y estilo de la marca.
 */
export function Dropdown({
  label,
  ariaLabel,
  value,
  options,
  onChange,
  align = "left",
  prefix,
}: {
  /** Texto del botón cuando no hay selección. */
  label: string;
  ariaLabel: string;
  value: string;
  options: DropdownOption[];
  onChange: (value: string) => void;
  align?: "left" | "right";
  /** Texto fijo antes del valor (p. ej. "Ordenar"). */
  prefix?: string;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(0);
  const rootRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", at: 0 });

  const selectedIndex = options.findIndex((o) => o.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : undefined;
  const hasValue = Boolean(selected && selected.value !== "");

  const openList = (index = Math.max(0, selectedIndex)) => {
    setActiveIndex(index);
    setOpen(true);
  };

  const close = (refocus = true) => {
    setOpen(false);
    if (refocus) buttonRef.current?.focus();
  };

  const choose = (index: number) => {
    const option = options[index];
    if (!option) return;
    onChange(option.value);
    close();
  };

  // Foco a la lista al abrir y cierre al hacer clic fuera
  useEffect(() => {
    if (!open) return;
    listRef.current?.focus();
    const onPointer = (e: PointerEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointer);
    return () => document.removeEventListener("pointerdown", onPointer);
  }, [open]);

  // Mantiene visible la opción activa al navegar con teclado
  useEffect(() => {
    if (!open) return;
    const el = listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`);
    el?.scrollIntoView?.({ block: "nearest" });
  }, [open, activeIndex]);

  const onButtonKey = (e: KeyboardEvent<HTMLButtonElement>) => {
    if (e.key === "ArrowDown" || e.key === "ArrowUp") {
      e.preventDefault();
      openList(e.key === "ArrowUp" ? options.length - 1 : Math.max(0, selectedIndex));
    }
  };

  const onListKey = (e: KeyboardEvent<HTMLUListElement>) => {
    const last = options.length - 1;
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(last, i + 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(0, i - 1));
        break;
      case "Home":
        e.preventDefault();
        setActiveIndex(0);
        break;
      case "End":
        e.preventDefault();
        setActiveIndex(last);
        break;
      case "Enter":
      case " ":
        e.preventDefault();
        choose(activeIndex);
        break;
      case "Escape":
        e.preventDefault();
        close();
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (e.key.length === 1 && /\S/.test(e.key)) {
          // Búsqueda por letras: "ni" salta a "Nike"
          const now = e.timeStamp;
          const t = typeahead.current;
          t.text = now - t.at > 700 ? e.key.toLowerCase() : t.text + e.key.toLowerCase();
          t.at = now;
          const found = options.findIndex((o) => o.label.toLowerCase().startsWith(t.text));
          if (found >= 0) setActiveIndex(found);
        }
    }
  };

  return (
    <div ref={rootRef} className="relative">
      <button
        ref={buttonRef}
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={open ? listId : undefined}
        aria-label={`${ariaLabel}${hasValue ? `: ${selected?.label}` : ""}`}
        onClick={() => (open ? close(false) : openList())}
        onKeyDown={onButtonKey}
        className={`group inline-flex h-10 cursor-pointer items-center gap-1.5 border-b font-display text-[10px] font-semibold uppercase tracking-nav transition-colors ${
          open || hasValue ? "border-ink text-ink" : "border-transparent text-ink hover:border-ink/40"
        }`}
      >
        {prefix && <span className="text-muted">{prefix}</span>}
        <span className="max-w-[11rem] truncate">{hasValue || prefix ? selected?.label : label}</span>
        {hasValue && !prefix && <span aria-hidden="true" className="h-1.5 w-1.5 rounded-full bg-sale" />}
        <ChevronDown
          className={`h-3.5 w-3.5 text-muted transition-transform duration-300 ease-editorial ${open ? "rotate-180" : ""}`}
          strokeWidth={1.5}
          aria-hidden="true"
        />
      </button>

      {open && (
        <ul
          ref={listRef}
          id={listId}
          role="listbox"
          tabIndex={-1}
          aria-label={ariaLabel}
          aria-activedescendant={`${id}-opt-${activeIndex}`}
          onKeyDown={onListKey}
          className={`ks-dropdown-in absolute top-full z-40 mt-2 max-h-[26rem] min-w-[15rem] overflow-y-auto border border-line bg-canvas py-1.5 shadow-[0_22px_48px_-24px_rgb(17_17_17/0.45)] focus:outline-none ${
            align === "right" ? "right-0 origin-top-right" : "left-0 origin-top-left"
          }`}
        >
          {options.map((option, i) => {
            const isSelected = option.value === value;
            const isActive = i === activeIndex;
            return (
              <li
                key={option.value || "__all"}
                id={`${id}-opt-${i}`}
                data-index={i}
                role="option"
                aria-selected={isSelected}
                onPointerEnter={() => setActiveIndex(i)}
                onClick={() => choose(i)}
                className={`mx-1.5 flex h-10 cursor-pointer items-center gap-3 px-3 text-xs transition-colors ${
                  isActive ? "bg-surface" : ""
                } ${isSelected ? "font-semibold text-ink" : "text-ink/80"}`}
              >
                <span className="flex h-4 w-4 shrink-0 items-center justify-center">
                  {isSelected && <Check className="h-3.5 w-3.5 text-forest" strokeWidth={2.25} aria-hidden="true" />}
                </span>
                <span className="flex-1 truncate">{option.label}</span>
                {option.meta && (
                  <span className="bg-surface px-1.5 py-0.5 font-mono text-[10px] text-muted">{option.meta}</span>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
