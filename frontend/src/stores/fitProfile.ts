import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  DEFAULT_APPEARANCE,
  type BodyStyle,
  type FacialHair,
  type HairStyle,
} from "@/features/fitting/avatarAppearance";

export type BodyBuild = "delgada" | "media" | "atletica" | "robusta";

export interface AnatomicalRatios {
  shoulderToHeight: number;
  hipToHeight: number;
  torsoToLeg: number;
}

export interface FitProfileState {
  heightCm: number;
  build: BodyBuild;
  usualSizeEu: number;
  ratios: AnatomicalRatios | null;
  source: "manual" | "photo";
  bodyStyle: BodyStyle;
  skinTone: string;
  hairStyle: HairStyle;
  hairColor: string;
  facialHair: FacialHair;
  setManualProfile: (profile: {
    heightCm: number;
    build: BodyBuild;
    usualSizeEu: number;
  }) => void;
  setPhotoProfile: (profile: {
    heightCm: number;
    build: BodyBuild;
    usualSizeEu: number;
    ratios: AnatomicalRatios;
    skinTone?: string;
    hairColor?: string;
  }) => void;
  /** Ajusta medidas o apariencia sueltas conservando las proporciones de la foto. */
  patchProfile: (
    patch: Partial<{
      heightCm: number;
      build: BodyBuild;
      usualSizeEu: number;
      bodyStyle: BodyStyle;
      skinTone: string;
      hairStyle: HairStyle;
      hairColor: string;
      facialHair: FacialHair;
    }>,
  ) => void;
  resetProfile: () => void;
}

export const useFitProfileStore = create<FitProfileState>()(
  persist(
    (set) => ({
      heightCm: 175,
      build: "media",
      usualSizeEu: 40,
      ratios: null,
      source: "manual",
      ...DEFAULT_APPEARANCE,
      setManualProfile: (profile) =>
        set({ ...profile, ratios: null, source: "manual" }),
      setPhotoProfile: (profile) =>
        set((state) => ({
          heightCm: profile.heightCm,
          build: profile.build,
          usualSizeEu: profile.usualSizeEu,
          ratios: profile.ratios,
          skinTone: profile.skinTone ?? state.skinTone,
          hairColor: profile.hairColor ?? state.hairColor,
          source: "photo",
        })),
      patchProfile: (patch) =>
        set((state) => ({
          ...patch,
          facialHair:
            patch.bodyStyle === "femenino" && patch.facialHair === undefined
              ? "ninguno"
              : (patch.facialHair ?? state.facialHair),
        })),
      resetProfile: () =>
        set({
          heightCm: 175,
          build: "media",
          usualSizeEu: 40,
          ratios: null,
          source: "manual",
          ...DEFAULT_APPEARANCE,
        }),
    }),
    {
      name: "keystreet-fit-profile-v1",
    },
  ),
);
