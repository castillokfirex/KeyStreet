import { create } from "zustand";

export interface AuthUser {
  id: string;
  email: string;
  fullName: string;
  role: "ADMIN_TENANT" | "CUSTOMER";
  tenantId: string;
}

interface AuthState {
  accessToken: string | null;
  user: AuthUser | null;
  bootstrapped: boolean;
  setSession: (accessToken: string, user: AuthUser) => void;
  setAccessToken: (accessToken: string) => void;
  clearSession: () => void;
  markBootstrapped: () => void;
}

export const useAuthStore = create<AuthState>()((set) => ({
  accessToken: null,
  user: null,
  bootstrapped: false,
  setSession: (accessToken, user) =>
    set({ accessToken, user, bootstrapped: true }),
  setAccessToken: (accessToken) => set({ accessToken }),
  clearSession: () => set({ accessToken: null, user: null, bootstrapped: true }),
  markBootstrapped: () => set({ bootstrapped: true }),
}));
