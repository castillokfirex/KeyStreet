import { cleanup, render, screen } from "@testing-library/react";
import { domAnimation, LazyMotion } from "motion/react";
import { afterEach, describe, expect, it } from "vitest";
import { KastLogo } from "../KastLogo";
import { KastMascot, type KastMascotState } from "../KastMascot";
import { KastStaticIcon } from "../KastStaticIcon";

describe("KastLogo & KastMascot", () => {
  afterEach(cleanup);

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

  it("idle se dibuja dormido (ojos cerrados + Zzz) y listening despierto (ojos abiertos)", () => {
    const { unmount } = render(
      <LazyMotion features={domAnimation}>
        <KastMascot state="idle" title="Kast dormido" />
      </LazyMotion>,
    );
    const sleeping = screen.getByRole("img", { name: "Kast dormido" });
    expect(sleeping.querySelectorAll("ellipse.fill-ink")).toHaveLength(0);
    expect(sleeping.textContent).toContain("Z");
    unmount();

    render(
      <LazyMotion features={domAnimation}>
        <KastMascot state="listening" title="Kast despierto" />
      </LazyMotion>,
    );
    const awake = screen.getByRole("img", { name: "Kast despierto" });
    expect(awake.querySelectorAll("ellipse.fill-ink")).toHaveLength(2);
    cleanup();
  });

  it("muestra la etiqueta de estado con showStatus", () => {
    const labels: [KastMascotState, string][] = [
      ["idle", "Descansando"],
      ["listening", "Te escucho"],
      ["thinking", "Pensando…"],
      ["speaking", "Respondiendo"],
    ];
    for (const [state, label] of labels) {
      const { unmount } = render(
        <LazyMotion features={domAnimation}>
          <KastMascot state={state} showStatus title={`Kast ${state}`} />
        </LazyMotion>,
      );
      expect(screen.getByText(label)).toBeInTheDocument();
      unmount();
    }
  });

  it("KastStaticIcon (sin motion) conserva rol, nombre y estado", () => {
    render(<KastStaticIcon state="error" title="Kast estático" />);
    expect(screen.getByRole("img", { name: "Kast estático" })).toHaveAttribute(
      "data-kast-state",
      "error",
    );
    cleanup();
  });
});
