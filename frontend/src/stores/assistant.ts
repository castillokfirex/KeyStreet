import { create } from "zustand";
import type { KastMascotState } from "@/components/brand/KastMascot";

export interface CitationItem {
  n: number;
  documentId: string;
  documentTitle: string;
  pageNumber: number;
  pageEnd: number;
  sectionTitle?: string | null;
  snippet: string;
  chunkId: string;
}

export interface ChatTurn {
  id: string;
  role: "user" | "assistant";
  content: string;
  status?: "ANSWERED" | "NO_EVIDENCE" | "REJECTED" | "ERROR";
  citations?: CitationItem[];
  latencyMs?: number;
}

interface AssistantState {
  open: boolean;
  mascotState: KastMascotState;
  productSlug: string | null;
  productName: string | null;
  prefillQuestion: string | null;
  sessionId: string;
  turns: ChatTurn[];
  openDrawer: (opts?: { prefill?: string }) => void;
  closeDrawer: () => void;
  setProductContext: (slug: string | null, name: string | null) => void;
  clearPrefill: () => void;
  setMascotState: (state: KastMascotState) => void;
  addTurn: (turn: ChatTurn) => void;
  clearHistory: () => void;
}

function makeSessionId(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `ks-${Date.now()}`;
}

export const useAssistantStore = create<AssistantState>()((set) => ({
  open: false,
  mascotState: "idle",
  productSlug: null,
  productName: null,
  prefillQuestion: null,
  sessionId: makeSessionId(),
  turns: [],
  openDrawer: (opts) =>
    set({
      open: true,
      prefillQuestion: opts?.prefill ?? null,
    }),
  closeDrawer: () => set({ open: false, mascotState: "idle" }),
  setProductContext: (productSlug, productName) =>
    set({ productSlug, productName }),
  clearPrefill: () => set({ prefillQuestion: null }),
  setMascotState: (mascotState) => set({ mascotState }),
  addTurn: (turn) => set((state) => ({ turns: [...state.turns, turn] })),
  clearHistory: () => set({ turns: [], sessionId: makeSessionId() }),
}));
