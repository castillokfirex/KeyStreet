import {
  act,
  cleanup,
  fireEvent,
  render,
  screen,
} from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { cartImageFor, useCartStore, type CartItem } from "@/stores/cart";
import { BagDrawer } from "../BagDrawer";

vi.mock("../useWhatsappCheckout", () => ({
  useWhatsappCheckout: () => ({ checkout: vi.fn(), loading: false }),
}));

function item(overrides: Partial<CartItem> = {}): CartItem {
  return {
    variantId: "v-1",
    productId: "p-1",
    slug: "air-force-1",
    name: "Nike Air Force 1",
    brand: "Nike",
    sku: "AF1-42",
    sizeEu: 42,
    originalPriceCop: 500000,
    finalPriceCop: 450000,
    discountPercent: 10,
    hasDiscount: true,
    quantity: 1,
    image: "/assets/products/air-force-1/air-force-1-1.480.webp",
    ...overrides,
  };
}

function renderBag(items: CartItem[]) {
  useCartStore.setState({ items, bagOpen: true });
  return render(
    <MemoryRouter>
      <BagDrawer />
    </MemoryRouter>,
  );
}

beforeEach(() => {
  useCartStore.setState({ items: [], bagOpen: false });
});
afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

describe("cartImageFor", () => {
  it("usa la miniatura de 480 px y nada si no hay foto", () => {
    expect(
      cartImageFor({ basePath: "/a/", files: ["x-1.960.webp"], ready: true }),
    ).toBe("/a/x-1.480.webp");
    expect(
      cartImageFor({ basePath: "/a/", files: [], ready: false }),
    ).toBeUndefined();
  });
});

describe("BagDrawer", () => {
  it("vacía: Kast avisa y ofrece ir al catálogo", () => {
    renderBag([]);
    expect(screen.getByText("¡Tu bolsa está vacía!")).toBeInTheDocument();
    expect(
      screen.getByRole("link", { name: /ir al catálogo/i }),
    ).toHaveAttribute("href", "/catalogo");
  });

  it("muestra talla, precio, total y el contador", () => {
    renderBag([
      item({ quantity: 2 }),
      item({
        variantId: "v-2",
        name: "Samba",
        hasDiscount: false,
        discountPercent: 0,
        finalPriceCop: 300000,
        originalPriceCop: 300000,
      }),
    ]);
    expect(screen.getAllByText(/Talla: 42 EU/)).toHaveLength(2);
    expect(screen.getByLabelText("3 artículos")).toBeInTheDocument();
    expect(screen.getByText("$1.200.000 COP")).toBeInTheDocument();
  });

  it("la caneca quita el producto tras la animación", () => {
    vi.useFakeTimers();
    renderBag([item(), item({ variantId: "v-2", name: "Samba" })]);
    fireEvent.click(
      screen.getByRole("button", { name: "Eliminar Samba de la bolsa" }),
    );
    expect(useCartStore.getState().items).toHaveLength(2);
    act(() => {
      vi.advanceTimersByTime(400);
    });
    expect(useCartStore.getState().items.map((i) => i.variantId)).toEqual([
      "v-1",
    ]);
  });

  it("no baja de 1 unidad con el botón menos", () => {
    renderBag([item()]);
    expect(
      screen.getByRole("button", { name: "Disminuir cantidad" }),
    ).toBeDisabled();
    fireEvent.click(screen.getByRole("button", { name: "Aumentar cantidad" }));
    expect(useCartStore.getState().items[0].quantity).toBe(2);
  });
});
