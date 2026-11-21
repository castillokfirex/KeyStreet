import { Send, Trash2 } from "lucide-react";
import { useEffect, useRef, useState, type FormEvent } from "react";
import { KastMascot } from "@/components/brand/KastMascot";
import { MotionScope } from "@/components/motion/MotionScope";
import { Button } from "@/components/ui/Button";
import { Drawer } from "@/components/ui/Drawer";
import { useAssistantStore } from "@/stores/assistant";
import { ChatMessage } from "./ChatMessage";
import { useAssistant } from "./useAssistant";

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
  const endRef = useRef<HTMLDivElement>(null);
  const { mutate, isPending } = useAssistant();

  const effectiveInput = prefillQuestion !== null ? prefillQuestion : input;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [turns.length, isPending]);

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
        headerExtra={<KastMascot state={mascotState} size={34} title="Kast" />}
      >
      <div className="flex h-full flex-col justify-between">
        <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
          {turns.length === 0 ? (
            <div className="space-y-4">
              <div className="rounded-2xl border border-line bg-surface/75 p-4 text-xs leading-relaxed text-navy">
                <p className="font-bold">¡Hola! Soy Kast, el koala experto de Key Street.</p>
                <p className="mt-1 text-muted">
                  Pregúntame sobre hormas, tallas EU, materiales o políticas de envío.
                  Cada respuesta cita las guías PDF verificadas de la tienda.
                </p>
              </div>

              <div className="space-y-2">
                <p className="font-display text-[10px] font-bold uppercase tracking-[0.16em] text-muted">
                  Sugerencias rápidas
                </p>
                <div className="flex flex-wrap gap-2">
                  {suggestions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => mutate(s)}
                      className="rounded-xl border border-line bg-canvas px-3 py-2 text-left text-xs font-medium text-navy hover:border-forest cursor-pointer"
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
                  className="inline-flex items-center gap-1 text-[11px] text-muted hover:text-navy cursor-pointer"
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
              <KastMascot state="thinking" size={24} title="Pensando" />
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
              className="h-11 flex-1 rounded-xl border border-line bg-surface px-3.5 text-xs text-navy placeholder:text-muted focus:border-navy focus:outline-none"
            />
            <Button
              type="submit"
              variant="forest"
              size="md"
              disabled={isPending || effectiveInput.trim().length < 3}
              aria-label="Enviar pregunta a Kast"
            >
              <Send className="h-4 w-4" aria-hidden="true" />
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
