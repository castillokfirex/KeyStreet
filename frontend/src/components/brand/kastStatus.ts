import type { KastMascotState } from "./KastMascot";

/** Etiqueta visible de cada estado de Kast. */
export const KAST_STATUS_LABEL: Record<KastMascotState, string> = {
  idle: "Descansando",
  listening: "Te escucho",
  thinking: "Pensando…",
  speaking: "Respondiendo",
  success: "¡Listo!",
  error: "Algo salió mal",
};

/** Color del punto de estado (tokens @theme). */
export const KAST_STATUS_DOT: Record<KastMascotState, string> = {
  idle: "bg-gray",
  listening: "bg-kast-awake",
  thinking: "bg-kast-thinking",
  speaking: "bg-kast-awake",
  success: "bg-sale-text",
  error: "bg-kast-error",
};

/** Posiciones de los ojos en el viewBox compartido (-8 -16 216 216). */
export const KAST_EYES = [
  { x: 72, y: 106 },
  { x: 128, y: 106 },
] as const;

export const KAST_VIEWBOX = "-8 -16 216 216";
