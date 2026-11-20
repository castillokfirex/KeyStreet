import { useMutation } from "@tanstack/react-query";
import { assistantApi } from "@/lib/queries";
import { ProblemError } from "@/lib/api";
import { useAssistantStore } from "@/stores/assistant";

export function useAssistant() {
  const productSlug = useAssistantStore((s) => s.productSlug);
  const sessionId = useAssistantStore((s) => s.sessionId);
  const setMascotState = useAssistantStore((s) => s.setMascotState);
  const addTurn = useAssistantStore((s) => s.addTurn);

  const mutation = useMutation({
    mutationFn: async (question: string) => {
      return assistantApi.query({
        question,
        productSlug: productSlug || undefined,
        sessionId,
      });
    },
    onMutate: (question) => {
      setMascotState("thinking");
      addTurn({
        id: `u-${Date.now()}`,
        role: "user",
        content: question,
      });
    },
    onSuccess: (res) => {
      setMascotState(res.status === "ANSWERED" ? "speaking" : "idle");
      addTurn({
        id: res.auditId || `a-${Date.now()}`,
        role: "assistant",
        content:
          res.answer ||
          "No encontré información suficiente en los documentos indexados de la tienda.",
        status: res.status,
        citations: res.citations ?? [],
        latencyMs: res.latencyMs,
      });
      setTimeout(() => {
        useAssistantStore.getState().setMascotState("idle");
      }, 1400);
    },
    onError: (err) => {
      setMascotState("error");
      const message =
        err instanceof ProblemError
          ? err.detail
          : "El asistente no pudo responder en este momento. Intenta de nuevo.";
      addTurn({
        id: `e-${Date.now()}`,
        role: "assistant",
        content: message,
        status: "ERROR",
        citations: [],
      });
    },
  });

  return mutation;
}
