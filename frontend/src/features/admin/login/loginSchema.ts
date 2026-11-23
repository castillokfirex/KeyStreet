import { z } from "zod";
import { ProblemError } from "@/lib/api";

/** Intentos fallidos seguidos antes de bloquear el botón un momento. */
export const MAX_FAILED_ATTEMPTS = 5;
export const LOCKOUT_SECONDS = 30;

/**
 * Validación del inicio de sesión. En login solo se exige que haya datos con
 * forma válida: las reglas de complejidad de contraseña no se revelan aquí.
 */
export const loginSchema = z.object({
  email: z
    .string()
    .trim()
    .min(1, "Escribe tu correo electrónico.")
    .max(254, "El correo es demasiado largo.")
    .pipe(z.email("Revisa el formato del correo: nombre@dominio.com")),
  password: z
    .string()
    .min(1, "Escribe tu contraseña.")
    .max(128, "La contraseña supera los 128 caracteres."),
});

export type LoginValues = z.infer<typeof loginSchema>;

export type LoginErrorKind =
  "credentials" | "forbidden" | "rate-limit" | "network" | "server";

export interface LoginFailure {
  kind: LoginErrorKind;
  message: string;
}

/** Traduce el error del API a un mensaje claro que no revela si el correo existe. */
export function describeLoginError(err: unknown): LoginFailure {
  if (err instanceof ProblemError) {
    if (err.status === 400 || err.status === 401 || err.status === 404) {
      return {
        kind: "credentials",
        message: "Correo o contraseña incorrectos.",
      };
    }
    if (err.status === 403) {
      return {
        kind: "forbidden",
        message: "Esta cuenta no tiene acceso al panel administrativo.",
      };
    }
    if (err.status === 429) {
      return {
        kind: "rate-limit",
        message:
          "Demasiados intentos. Espera un momento antes de volver a intentarlo.",
      };
    }
    if (err.status >= 500) {
      return {
        kind: "server",
        message:
          "El servidor no respondió bien. Intenta de nuevo en unos segundos.",
      };
    }
    return { kind: "server", message: err.detail };
  }
  if (err instanceof TypeError) {
    return {
      kind: "network",
      message:
        "Sin conexión con el servidor. Revisa tu red e inténtalo otra vez.",
    };
  }
  return {
    kind: "server",
    message: "No pudimos iniciar sesión. Inténtalo de nuevo.",
  };
}
