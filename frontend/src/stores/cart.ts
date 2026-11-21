import { create } from "zustand";
import { persist } from "zustand/middleware";

export interface CartItem {
  variantId: string;
  productId: string;
  slug: string;
  name: string;
  brand: string;
  sku: string;
  sizeEu: number;
  originalPriceCop: number;
  finalPriceCop: number;
  discountPercent: number;
  hasDiscount: boolean;
  quantity: number;
}

interface CartState {
  items: CartItem[];
  wishlist: string[];
  bagOpen: boolean;
  setBagOpen: (open: boolean) => void;
  addItem: (item: Omit<CartItem, "quantity">, quantity?: number) => void;
  updateQty: (variantId: string, quantity: number) => void;
  removeItem: (variantId: string) => void;
  clearCart: () => void;
  toggleWishlist: (productId: string) => void;
}

export const useCartStore = create<CartState>()(
  persist(
    (set) => ({
      items: [],
      wishlist: [],
      bagOpen: false,
      setBagOpen: (bagOpen) => set({ bagOpen }),
      addItem: (item, quantity = 1) =>
        set((state) => {
          const idx = state.items.findIndex((i) => i.variantId === item.variantId);
          if (idx >= 0) {
            const updated = [...state.items];
            updated[idx] = {
              ...updated[idx],
              quantity: Math.min(10, updated[idx].quantity + quantity),
            };
            return { items: updated };
          }
          return { items: [...state.items, { ...item, quantity }] };
        }),
      updateQty: (variantId, quantity) =>
        set((state) => {
          if (quantity <= 0) {
            return { items: state.items.filter((i) => i.variantId !== variantId) };
          }
          return {
            items: state.items.map((i) =>
              i.variantId === variantId
                ? { ...i, quantity: Math.min(10, quantity) }
                : i,
            ),
          };
        }),
      removeItem: (variantId) =>
        set((state) => ({
          items: state.items.filter((i) => i.variantId !== variantId),
        })),
      clearCart: () => set({ items: [] }),
      toggleWishlist: (productId) =>
        set((state) => ({
          wishlist: state.wishlist.includes(productId)
            ? state.wishlist.filter((id) => id !== productId)
            : [...state.wishlist, productId],
        })),
    }),
    {
      name: "keystreet-cart-v1",
      partialize: (state) => ({ items: state.items, wishlist: state.wishlist }),
    },
  ),
);
