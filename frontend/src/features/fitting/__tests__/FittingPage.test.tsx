import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/queries";
import type { ProductDetailDto } from "@/lib/types";
import { useCartStore } from "@/stores/cart";
import { useFitProfileStore } from "@/stores/fitProfile";
import { useFittingOutfitStore } from "@/stores/fittingOutfit";
import { FittingPage } from "../FittingPage";
import { DEFAULT_OUTFIT, OUTFIT_PRESETS } from "../garments";

// La escena WebGL no corre en jsdom: se reemplaza por un marcador con sus props
vi.mock("../FittingScene", () => ({
  FittingScene: (props: { view: string; outfit: unknown }) => (
    <div
      data-testid="scene"
      data-view={props.view}
      data-outfit={JSON.stringify(props.outfit)}
    />
  ),
}));
vi.mock("@/features/cart/useWhatsappCheckout", () => ({
  useWhatsappCheckout: () => ({ checkout: vi.fn(), loading: false }),
}));

const PRODUCT = {
  id: "p1",
  slug: "air-force-1",
  name: "Nike Air Force 1",
  brand: "Nike",
  brandSlug: "nike",
  modelCode: "AF1",
  category: "SNEAKERS",
  silhouette: "LOW",
  shortDescription: "",
  originalPriceCop: 500000,
  discountPercent: 0,
  finalPriceCop: 500000,
  hasDiscount: false,
  model3dUrl: "/x.glb",
  model3dReady: false,
  images: { basePath: "/a/", files: [], aspect: "4/5", ready: false },
  materialSpecs: { fit: "TRUE_TO_SIZE" },
  styleTags: [],
  variants: [40, 41, 42].map((s) => ({
    id: `v${s}`,
    sku: `AF1-${s}`,
    sizeEu: s,
    stock: 3,
    inStock: true,
  })),
} as ProductDetailDto;

function renderPage() {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  client.setQueryData(queryKeys.product("air-force-1"), PRODUCT);
  return render(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={["/producto/air-force-1/probador"]}>
        <Routes>
          <Route path="/producto/:slug/probador" element={<FittingPage />} />
          <Route path="/producto/:slug" element={<p>Ficha</p>} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>,
  );
}

beforeAll(async () => {
  // Precarga la escena simulada para que el lazy() resuelva al instante
  await import("../FittingScene");
});

beforeEach(() => {
  useFittingOutfitStore.setState({ outfit: DEFAULT_OUTFIT });
  useFitProfileStore.getState().resetProfile();
  useCartStore.setState({ items: [], bagOpen: false });
});
afterEach(cleanup);

describe("FittingPage", () => {
  it("arranca en el paso Tú con la foto efímera", () => {
    renderPage();
    expect(screen.getByRole("tab", { name: /Tú/ })).toHaveAttribute(
      "aria-selected",
      "true",
    );
    expect(screen.getByTestId("fitting-photo-input")).toBeInTheDocument();
  });

  it("los colores de arriba y abajo son independientes", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /Ropa/ }));
    const top = screen.getByRole("radiogroup", {
      name: "Color de la parte de arriba",
    });
    const bottom = screen.getByRole("radiogroup", {
      name: "Color de la parte de abajo",
    });
    fireEvent.click(within(top).getByRole("radio", { name: "Negro" }));
    fireEvent.click(
      within(bottom).getByRole("radio", { name: "Blanco hueso" }),
    );

    const { outfit } = useFittingOutfitStore.getState();
    expect(outfit.top.color).toBe("#161616");
    expect(outfit.bottom.color).toBe("#ECE8DF");
    expect(within(top).getByRole("radio", { name: "Negro" })).toHaveAttribute(
      "aria-checked",
      "true",
    );
  });

  it("aplica una combinación completa", () => {
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /Ropa/ }));
    fireEvent.click(screen.getByRole("button", { name: "Urbano" }));
    expect(useFittingOutfitStore.getState().outfit).toEqual(
      OUTFIT_PRESETS[1].outfit,
    );
    expect(screen.getByRole("button", { name: "Urbano" })).toHaveAttribute(
      "aria-pressed",
      "true",
    );
  });

  it("la escena carga y la cámara cambia a los pies", async () => {
    renderPage();
    fireEvent.click(screen.getByRole("button", { name: "Zoom pies" }));
    expect(await screen.findByTestId("scene")).toHaveAttribute(
      "data-view",
      "feet",
    );
    expect(screen.getByTestId("fitting-room")).toHaveAttribute(
      "data-camera-mode",
      "feet",
    );
  });

  it("sugiere la talla habitual y la añade a la bolsa", () => {
    useFitProfileStore.getState().patchProfile({ usualSizeEu: 41 });
    renderPage();
    fireEvent.click(screen.getByRole("tab", { name: /Talla/ }));
    fireEvent.click(
      screen.getByRole("button", { name: /Añadir a la bolsa · talla 41/ }),
    );
    expect(useCartStore.getState().items[0]).toMatchObject({
      sizeEu: 41,
      variantId: "v41",
    });
    expect(useCartStore.getState().bagOpen).toBe(true);
  });

  it("la estatura escrita fuera de rango muestra un error", () => {
    renderPage();
    const input = screen.getByLabelText("Estatura exacta");
    fireEvent.change(input, { target: { value: "300" } });
    expect(
      screen.getByText("Usa una estatura entre 140 y 210 cm."),
    ).toBeInTheDocument();
    fireEvent.blur(input);
    expect(useFitProfileStore.getState().heightCm).toBe(210);
  });
});
