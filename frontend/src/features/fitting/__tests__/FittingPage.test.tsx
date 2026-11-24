import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  cleanup,
  fireEvent,
  render,
  screen,
  within,
} from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router";
import { Group, Mesh, MeshStandardMaterial } from "three";
import { afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { queryKeys } from "@/lib/queries";
import type { ProductDetailDto } from "@/lib/types";
import { useCartStore } from "@/stores/cart";
import { useFitProfileStore } from "@/stores/fitProfile";
import { useFittingOutfitStore } from "@/stores/fittingOutfit";
import { computeMannequinScale } from "../bodyParams";
import { FittingPage } from "../FittingPage";
import { DEFAULT_OUTFIT, OUTFIT_PRESETS } from "../garments";
import { syncAvatarSceneGraph } from "../Mannequin";

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

  it("la escena carga, no incluye zoom al rostro y cambia a los pies", async () => {
    renderPage();
    expect(
      screen.queryByRole("button", { name: "Vista retrato" }),
    ).not.toBeInTheDocument();
    expect(screen.queryByText("Rostro")).not.toBeInTheDocument();
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

  it("permite personalizar piel, cabello, barba y silueta hombre/mujer", () => {
    renderPage();
    const skinGroup = screen.getByRole("radiogroup", { name: "Tono de piel" });
    fireEvent.click(within(skinGroup).getByRole("radio", { name: "Canela" }));
    expect(useFitProfileStore.getState().skinTone).toBe("#B2754B");

    fireEvent.click(screen.getByRole("button", { name: "Ondulado" }));
    expect(useFitProfileStore.getState().hairStyle).toBe("ondulado");

    const hairGroup = screen.getByRole("radiogroup", { name: "Color de cabello" });
    fireEvent.click(within(hairGroup).getByRole("radio", { name: "Cobrizo" }));
    expect(useFitProfileStore.getState().hairColor).toBe("#8C3B23");

    fireEvent.click(screen.getByRole("button", { name: "Completa" }));
    expect(useFitProfileStore.getState().facialHair).toBe("completa");

    // Al cambiar a Mujer se oculta la sección de barba y se restablece a "ninguno"
    fireEvent.click(screen.getByRole("button", { name: "Mujer" }));
    expect(useFitProfileStore.getState().bodyStyle).toBe("femenino");
    expect(useFitProfileStore.getState().facialHair).toBe("ninguno");
    expect(screen.queryByRole("button", { name: "Completa" })).not.toBeInTheDocument();
  });

  it("mantiene visibles las submallas multi-material de ropa y aplica colores en el avatar 3D", () => {
    const root = new Group();
    const lower = new Group();
    lower.name = "LowerBody";
    const upper = new Group();
    upper.name = "UpperBody";
    const head = new Group();
    head.name = "HeadGroup";
    root.add(lower, upper, head);

    const matTop = new MeshStandardMaterial({ name: "Mat_Top" });
    const matSkin = new MeshStandardMaterial({ name: "Mat_Skin" });
    const matBottom = new MeshStandardMaterial({ name: "Mat_Bottom" });

    const makeMultiPrimPart = (
      partName: string,
      mats: MeshStandardMaterial[],
    ) => {
      const grp = new Group();
      grp.name = partName;
      mats.forEach((mat, i) => {
        const sub = new Mesh(undefined, mat);
        sub.name = `${partName}_${i + 1}`;
        grp.add(sub);
      });
      return grp;
    };

    const topCamiseta = makeMultiPrimPart("Top_camiseta", [matTop, matSkin]);
    const topOversize = makeMultiPrimPart("Top_oversize", [matTop, matSkin]);
    const topCamisa = makeMultiPrimPart("Top_camisa", [matTop, matSkin]);
    upper.add(topCamiseta, topOversize, topCamisa);

    const bottomJean = makeMultiPrimPart("Bottom_jean", [matBottom]);
    const bottomPantaloneta = makeMultiPrimPart("Bottom_pantaloneta", [
      matBottom,
      matSkin,
    ]);
    lower.add(bottomJean, bottomPantaloneta);

    const scale = computeMannequinScale({
      heightCm: 175,
      build: "media",
      usualSizeEu: 40,
      ratios: null,
    });

    syncAvatarSceneGraph(root, {
      bodyStyle: "masculino",
      skinTone: "#B2754B",
      hairStyle: "corto",
      hairColor: "#181616",
      facialHair: "ninguno",
      scale,
      outfit: {
        top: { type: "oversize", color: "#D6CBB8" },
        bottom: { type: "pantaloneta", color: "#161616" },
        socks: { type: "tobilleras", color: "#F7F7F5" },
      },
      meta: { hipY: 0.98, neckY: 1.43 },
    });

    expect(topCamiseta.visible).toBe(false);
    expect(topOversize.visible).toBe(true);
    expect(topOversize.children[0].visible).toBe(true);
    expect(topOversize.children[1].visible).toBe(true);

    expect(bottomJean.visible).toBe(false);
    expect(bottomPantaloneta.visible).toBe(true);
    expect(bottomPantaloneta.children[0].visible).toBe(true);
    expect(bottomPantaloneta.children[1].visible).toBe(true);

    expect(`#${matTop.color.getHexString()}`).toBe("#d6cbb8");
    expect(`#${matBottom.color.getHexString()}`).toBe("#161616");
    expect(`#${matSkin.color.getHexString()}`).toBe("#b2754b");
  });
});
