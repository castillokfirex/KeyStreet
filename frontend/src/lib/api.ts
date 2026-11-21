import { useAuthStore } from "@/stores/auth";
import type { AuthResponse, ProblemDetailPayload } from "./types";

export const TENANT_SLUG = import.meta.env.VITE_TENANT_SLUG || "key-street";
export const API_BASE = (import.meta.env.VITE_API_BASE_URL || "/api").replace(
  /\/$/,
  "",
);

export class ProblemError extends Error {
  status: number;
  detail: string;
  errorCode?: string;
  payload: ProblemDetailPayload;

  constructor(status: number, payload: ProblemDetailPayload) {
    const msg =
      payload.detail || payload.title || `Error HTTP ${status} del servidor`;
    super(msg);
    this.name = "ProblemError";
    this.status = status;
    this.detail = msg;
    this.errorCode = payload.errorCode;
    this.payload = payload;
  }
}

let refreshPromise: Promise<string | null> | null = null;

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise;
  refreshPromise = (async () => {
    try {
      const res = await fetch(`${API_BASE}/v1/auth/refresh`, {
        method: "POST",
        credentials: "include",
        headers: {
          "X-Tenant-Slug": TENANT_SLUG,
        },
      });
      if (!res.ok) {
        useAuthStore.getState().clearSession();
        return null;
      }
      const data = (await res.json()) as AuthResponse;
      if (data.accessToken && data.user) {
        useAuthStore.getState().setSession(data.accessToken, data.user);
        return data.accessToken;
      }
      if (data.accessToken) {
        useAuthStore.getState().setAccessToken(data.accessToken);
        return data.accessToken;
      }
      return null;
    } catch {
      useAuthStore.getState().markBootstrapped();
      return null;
    } finally {
      refreshPromise = null;
    }
  })();
  return refreshPromise;
}

async function parseError(res: Response): Promise<ProblemError> {
  try {
    const body = (await res.json()) as ProblemDetailPayload;
    return new ProblemError(res.status, body);
  } catch {
    return new ProblemError(res.status, {
      status: res.status,
      detail: res.statusText || `HTTP ${res.status}`,
    });
  }
}

export async function apiFetch<T>(
  path: string,
  init: RequestInit = {},
  _retry = true,
): Promise<T> {
  const token = useAuthStore.getState().accessToken;
  const headers = new Headers(init.headers);
  headers.set("X-Tenant-Slug", TENANT_SLUG);
  if (token && !headers.has("Authorization")) {
    headers.set("Authorization", `Bearer ${token}`);
  }
  if (
    init.body &&
    typeof init.body === "string" &&
    !headers.has("Content-Type")
  ) {
    headers.set("Content-Type", "application/json");
  }

  const url = path.startsWith("http") ? path : `${API_BASE}${path}`;
  const res = await fetch(url, {
    ...init,
    credentials: "include",
    headers,
  });

  if (
    res.status === 401 &&
    _retry &&
    !path.includes("/auth/login") &&
    !path.includes("/auth/refresh")
  ) {
    const refreshed = await refreshAccessToken();
    if (refreshed) {
      return apiFetch<T>(path, init, false);
    }
  }

  if (!res.ok) {
    throw await parseError(res);
  }

  if (res.status === 204) {
    return undefined as T;
  }
  return (await res.json()) as T;
}
