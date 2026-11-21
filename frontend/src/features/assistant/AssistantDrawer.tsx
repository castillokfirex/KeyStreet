import { Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { KastMascot, type KastMascotState } from "@/components/brand/KastMascot";
import { MotionScope } from "@/components/motion/MotionScope";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { useAssistantStore } from "@/stores/assistant";
import { ChatMessage } from "./ChatMessage";
import { useAssistant } from "./useAssistant";

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
        className="flex h-full flex-col justify-between"
        onPointerDown={markActivity}
        onKeyDown={markActivity}
      >
        <div className="flex justify-center border-b border-line py-4">
          <KastMascot state={displayState} size={88} showStatus title="Kast" />
        </div>

        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {turns.length === 0 ? (
            <div className="space-y-5">
              <div className="text-xs leading-relaxed text-ink">
                <p className="font-semibold">Hola, soy Kast, el koala experto de Key Street.</p>
                <p className="mt-1 text-muted">
                  Pregúntame sobre hormas, tallas EU, materiales o políticas de envío.
                  Cada respuesta cita las guías PDF verificadas de la tienda.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-display text-[10px] font-semibold uppercase tracking-nav text-muted">
                  Sugerencias rápidas
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => mutate(s)}
                      className="rounded-sm border border-line px-3 py-2 text-left text-xs text-ink hover:border-ink transition-colors cursor-pointer"
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <>
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={clearHistory}
                  className="inline-flex items-center gap-1 font-display text-[10px] uppercase tracking-label text-muted hover:text-ink cursor-pointer"
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
            <div className="flex items-center gap-2 text-xs text-muted">
              <span className="inline-flex gap-1" aria-hidden="true">
                {[0, 1, 2].map((i) => (
                  <span
                    key={i}
                    className="h-1.5 w-1.5 rounded-full bg-gray motion-safe:animate-pulse"
                    style={{ animationDelay: `${i * 150}ms` }}
                  />
                ))}
              </span>
              <span>Kast está consultando los documentos...</span>
            </div>
          )}
          <div ref={endRef} />
        </div>

        <div className="border-t border-line bg-canvas p-4 space-y-2">
          <form onSubmit={handleSubmit} className="flex items-center gap-2">
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
              placeholder="Pregunta sobre tallas, materiales..."
              aria-label="Escribe tu pregunta para Kast"
              className="h-11 flex-1 border-b border-line bg-transparent px-1 text-sm text-ink placeholder:text-muted focus:border-ink focus:outline-none"
            />
            <Button
              type="submit"
              variant="navy"
              size="md"
              disabled={isPending || effectiveInput.trim().length < 3}
              aria-label="Enviar pregunta a Kast"
              className="w-11 px-0"
            >
              <Send className="h-4 w-4" strokeWidth={1.5} aria-hidden="true" />
            </Button>
          </form>
          <p className="text-[10px] text-muted text-center">
            Respuestas basadas en documentos de la tienda. Sin invención de datos.
          </p>
        </div>
      </div>
      </Drawer>
    </MotionScope>
  );
}
