import { ArrowUpRight, Layers, Leaf, RefreshCw, Ruler, Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { EucalyptusBranch } from "@/components/brand/EucalyptusBranch";
import {
  KastMascot,
  KastStatusLabel,
  type KastMascotState,
} from "@/components/brand/KastMascot";
import { MotionScope } from "@/components/motion/MotionScope";
import { Drawer } from "@/components/ui/Drawer";
import { useAssistantStore } from "@/stores/assistant";
import { ChatMessage } from "./ChatMessage";
import { useAssistant } from "./useAssistant";

const SUGGESTION_ICONS = [Ruler, RefreshCw, Layers];

/** Tras este tiempo sin actividad con el chat abierto, Kast vuelve a dormir. */
const DOZE_AFTER_MS = 60_000;
/** Pausa breve al abrir para que se vea la transición dormido → despierto. */
const WAKE_DELAY_MS = 300;

export function AssistantDrawer() {
  const open = useAssistantStore((s) => s.open);
  const closeDrawer = useAssistantStore((s) => s.closeDrawer);
  const mascotState = useAssistantStore((s) => s.mascotState);
  const setMascotState = useAssistantStore((s) => s.setMascotState);
  const productName = useAssistantStore((s) => s.productName);
  const prefillQuestion = useAssistantStore((s) => s.prefillQuestion);
  const clearPrefill = useAssistantStore((s) => s.clearPrefill);
  const turns = useAssistantStore((s) => s.turns);
  const clearHistory = useAssistantStore((s) => s.clearHistory);

  const [input, setInput] = useState("");
  const [dozing, setDozing] = useState(true);
  const [activity, setActivity] = useState(0);
  const endRef = useRef<HTMLDivElement>(null);
  const { mutate, isPending } = useAssistant();

  const effectiveInput = prefillQuestion !== null ? prefillQuestion : input;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, isPending]);

  // Despierta al abrir
  useEffect(() => {
    const timer = setTimeout(() => setDozing(false), WAKE_DELAY_MS);
    return () => clearTimeout(timer);
  }, []);

  // Se duerme tras 60 s sin actividad (solo cuando no hay petición en curso)
  useEffect(() => {
    if (!open || mascotState !== "idle") return;
    const timer = setTimeout(() => setDozing(true), DOZE_AFTER_MS);
    return () => clearTimeout(timer);
  }, [open, mascotState, activity]);

  const markActivity = () => {
    setDozing(false);
    setActivity((n) => n + 1);
  };

  /*
   * Presentación: el store usa "idle" = sin petición en curso. Con el chat
   * abierto y actividad reciente, Kast se muestra despierto ("listening").
   * El store y useAssistant no cambian.
   */
  const displayState: KastMascotState =
    mascotState === "idle" && !dozing ? "listening" : mascotState;

  const suggestions = productName
    ? [
        `¿El ${productName} tiene horma estrecha o normal?`,
        `¿Cómo cuidar los materiales de ${productName}?`,
      ]
    : [
        "¿El Adidas Samba OG tiene horma estrecha o normal?",
        "¿Cuántos días hay para cambios por talla?",
        "¿Qué materiales tiene el Nike Air Force 1?",
      ];

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const trimmed = effectiveInput.trim();
    if (trimmed.length < 3 || isPending) return;
    if (prefillQuestion !== null) clearPrefill();
    setInput("");
    mutate(trimmed);
  };

  return (
    <MotionScope>
      <Drawer
        open={open}
        onClose={closeDrawer}
        variant="sheet"
        title="Kast · Asistente IA"
        subtitle={
          productName
            ? `Contexto activo: ${productName}`
            : "Guías de tallas, horma y materiales"
        }
      >
      <div
        className="relative flex h-full flex-col justify-between overflow-hidden"
        onPointerDown={markActivity}
        onKeyDown={markActivity}
      >
        {/* Entorno de Kast: eucalipto que se mece al fondo */}
        <EucalyptusBranch className="ks-sway pointer-events-none absolute -right-10 bottom-24 w-40 opacity-25" />

        {/* Cabecera viva de Kast */}
        <div className="relative shrink-0 overflow-hidden border-b border-line bg-gradient-to-b from-mint via-mint/50 to-canvas px-5 pb-4 pt-5">
          <EucalyptusBranch className="ks-sway pointer-events-none absolute -left-6 -top-8 w-24 -rotate-[150deg] opacity-80" />
          <EucalyptusBranch className="ks-sway-slow pointer-events-none absolute -right-4 -top-10 w-28 rotate-[160deg] opacity-70" />
          <div className="relative flex flex-col items-center">
            <div className="rounded-full bg-white/70 p-2 shadow-[0_12px_30px_-16px_rgb(31_58_46/0.6)] ring-1 ring-white">
              <KastMascot state={displayState} size={84} title="Kast" />
            </div>
            <div className="mt-2">
              <KastStatusLabel state={displayState} />
            </div>
          </div>
        </div>

        <div className="relative flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {turns.length === 0 ? (
            <div className="space-y-6">
              <div className="ks-slide-in" style={{ animationDelay: "120ms" }}>
                <p className="inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-[0.16em] text-sale-text">
                  <Leaf className="h-3.5 w-3.5" aria-hidden="true" />
                  Kast · koala experto
                </p>
                <h3 className="mt-2 font-display font-expanded text-2xl font-extrabold uppercase leading-[0.95] tracking-[-0.02em] text-ink">
                  ¡Hola! ¿En qué
                  <br />
                  <span className="text-forest">te ayudo hoy?</span>
                </h3>
                <p className="mt-3 text-sm leading-relaxed text-muted">
                  Pregúntame por hormas, tallas EU, materiales o envíos. Respondo con las guías
                  verificadas de la tienda.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-muted">
                  Prueba con
                </p>
                <ul className="space-y-2">
                  {suggestions.map((s, i) => {
                    const Icon = SUGGESTION_ICONS[i % SUGGESTION_ICONS.length];
                    return (
                      <li key={s} className="ks-slide-in" style={{ animationDelay: `${220 + i * 80}ms` }}>
                        <button
                          type="button"
                          onClick={() => mutate(s)}
                          className="group flex w-full cursor-pointer items-center gap-3 rounded-[14px] border border-line bg-white/80 px-3 py-2.5 text-left text-xs text-ink shadow-[0_8px_20px_-16px_rgb(17_17_17/0.5)] transition-all duration-300 hover:-translate-y-0.5 hover:border-forest/40 hover:bg-white"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-mint text-forest transition-transform duration-300 group-hover:-rotate-6 group-hover:scale-110">
                            <Icon className="h-4 w-4" strokeWidth={1.75} aria-hidden="true" />
                          </span>
                          <span className="flex-1">{s}</span>
                          <ArrowUpRight
                            className="h-4 w-4 text-gray transition-all duration-300 group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-forest"
                            aria-hidden="true"
                          />
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearHistory}
                  className="inline-flex cursor-pointer items-center gap-1 font-mono text-[10px] uppercase tracking-[0.12em] text-muted hover:text-ink"
                >
                  <Trash2 className="h-3 w-3" aria-hidden="true" />
                  <span>Nueva conversación</span>
                </button>
              </div>
              {turns.map((turn) => (
                <ChatMessage key={turn.id} turn={turn} />
              ))}
            </>
          )}

          {isPending && (
            <div className="ks-slide-in flex items-center gap-2.5">
              <span
                className="inline-flex items-center gap-1 rounded-[14px] rounded-tl-sm bg-white px-3.5 py-3 shadow-[0_8px_20px_-16px_rgb(17_17_17/0.5)]"
                aria-hidden="true"
              >
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-2 w-2 rounded-full bg-sale motion-safe:animate-bounce"
                    style={{ animationDelay: `${i * 140}ms` }}
                  />
                ))}
              </span>
              <span className="text-xs text-muted">Kast está buscando en las guías…</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="relative shrink-0 space-y-2 border-t border-line bg-canvas/95 p-4 backdrop-blur-sm">
          <form
            onSubmit={handleSubmit}
            className="flex items-center gap-2 rounded-full border border-line bg-white py-1.5 pl-4 pr-1.5 shadow-[0_10px_24px_-18px_rgb(17_17_17/0.5)] transition-[border-color,box-shadow] focus-within:border-forest/50 focus-within:ring-4 focus-within:ring-mint"
          >
            <input
              type="text"
              value={effectiveInput}
              minLength={3}
              maxLength={1000}
              onFocus={() => setMascotState("listening")}
              onBlur={() => {
                if (!isPending) setMascotState("idle");
              }}
              onChange={(e) => {
                if (prefillQuestion !== null) clearPrefill();
                setInput(e.target.value);
              }}
              placeholder="Pregúntale a Kast…"
              aria-label="Escribe tu pregunta para Kast"
              className="h-10 min-w-0 flex-1 bg-transparent text-sm text-ink placeholder:text-gray focus:outline-none"
            />
            <button
              type="submit"
              disabled={isPending || effectiveInput.trim().length < 3}
              aria-label="Enviar pregunta a Kast"
              className="group flex h-10 w-10 shrink-0 cursor-pointer items-center justify-center rounded-full bg-forest text-white transition-all duration-300 hover:scale-105 hover:bg-forest-hover disabled:cursor-not-allowed disabled:bg-line disabled:text-gray disabled:hover:scale-100"
            >
              <Send
                className="h-4 w-4 transition-transform duration-300 group-enabled:group-hover:-rotate-12"
                strokeWidth={1.75}
                aria-hidden="true"
              />
            </button>
          </form>
          <p className="text-center font-mono text-[9px] uppercase tracking-[0.12em] text-gray">
            Respuestas con fuentes de la tienda · sin inventar datos
          </p>
        </div>
      </div>
      </Drawer>
    </MotionScope>
  );
}
