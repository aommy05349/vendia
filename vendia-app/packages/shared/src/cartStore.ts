import { create } from 'zustand';
import { Product } from './productStore';

export interface OrderItem {
  product: Product;
  quantity: number;
}

interface CartState {
  items: OrderItem[];
  addToCart: (product: Product) => void;
  removeFromCart: (productId: number) => void;
  clearCart: () => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  addToCart: (product) => {
    const items = get().items;
    const existingItem = items.find((item) => item.product.id === product.id);

    if (existingItem) {
      if (existingItem.quantity >= product.stock) return; // Cannot add more than stock
      set({
        items: items.map((item) =>
          item.product.id === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        ),
      });
    } else {
      set({ items: [...items, { product, quantity: 1 }] });
    }
  },
  removeFromCart: (productId) => {
    set({
      items: get().items.filter((item) => item.product.id !== productId),
    });
  },
  clearCart: () => set({ items: [] }),
  total: () => {
    return get().items.reduce(
      (acc, item) => acc + item.product.price * item.quantity,
      0
    );
  },
}));
