import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_OUTFIT,
  type BottomGarment,
  type Outfit,
  type SockStyle,
  type TopGarment,
} from "@/features/fitting/garments";

interface FittingOutfitState {
  outfit: Outfit;
  setTop: (patch: Partial<{ type: TopGarment; color: string }>) => void;
  setBottom: (patch: Partial<{ type: BottomGarment; color: string }>) => void;
  setSocks: (patch: Partial<{ type: SockStyle; color: string }>) => void;
  applyPreset: (outfit: Outfit) => void;
}

/** Ropa del probador: cada prenda tiene su propio tipo y color (se recuerda entre productos). */
export const useFittingOutfitStore = create<FittingOutfitState>()(
  persist(
    (set) => ({
      outfit: DEFAULT_OUTFIT,
      setTop: (patch) =>
        set((s) => ({
          outfit: { ...s.outfit, top: { ...s.outfit.top, ...patch } },
        })),
      setBottom: (patch) =>
        set((s) => ({
          outfit: { ...s.outfit, bottom: { ...s.outfit.bottom, ...patch } },
        })),
      setSocks: (patch) =>
        set((s) => ({
          outfit: { ...s.outfit, socks: { ...s.outfit.socks, ...patch } },
        })),
      applyPreset: (outfit) =>
        set({
          outfit: {
            top: { ...outfit.top },
            bottom: { ...outfit.bottom },
            socks: { ...outfit.socks },
          },
        }),
    }),
    { name: "keystreet-fitting-outfit-v1" },
  ),
);
