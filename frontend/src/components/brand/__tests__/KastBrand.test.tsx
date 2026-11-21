import { render, screen } from "@testing-library/react";
import { domAnimation, LazyMotion } from "motion/react";
import { describe, expect, it } from "vitest";
import { KastLogo } from "../KastLogo";
import { KastMascot, type KastMascotState } from "../KastMascot";

describe("KastLogo & KastMascot", () => {
  it("renders both variants of KastLogo with accessible roles", () => {
    render(
      <>
        <KastLogo variant="isotype" title="Koala Kast" />
        <KastLogo variant="wordmark" title="Key Street Editorial" />
      </>,
    );
    expect(screen.getByRole("img", { name: "Koala Kast" })).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "Key Street Editorial" })).toBeInTheDocument();
    expect(screen.getByText("KEY STREET")).toBeInTheDocument();
  });

  it("renders all 6 KastMascot states safely inside LazyMotion", () => {
    const states: KastMascotState[] = [
      "idle",
      "listening",
      "thinking",
      "speaking",
      "success",
      "error",
    ];
    for (const state of states) {
      const { unmount } = render(
        <LazyMotion features={domAnimation}>
          <KastMascot state={state} title={`Kast ${state}`} />
        </LazyMotion>,
      );
      const svg = screen.getByRole("img", { name: `Kast ${state}` });
      expect(svg).toHaveAttribute("data-kast-state", state);
      unmount();
    }
  });
});
