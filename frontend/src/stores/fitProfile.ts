import { create } from "zustand";
import { persist } from "zustand/middleware";

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
  }) => void;
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
      setManualProfile: (profile) =>
        set({ ...profile, ratios: null, source: "manual" }),
      setPhotoProfile: (profile) =>
        set({ ...profile, source: "photo" }),
      resetProfile: () =>
        set({
          heightCm: 175,
          build: "media",
          usualSizeEu: 40,
          ratios: null,
          source: "manual",
        }),
    }),
    {
      name: "keystreet-fit-profile-v1",
    },
  ),
);
