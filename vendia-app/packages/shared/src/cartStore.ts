import { create } from 'zustand';
import { Product } from './productStore';

export interface OrderItem {
  product: Product;
  quantity: number;
  price: number; // The actual selling price (may differ from product.price)
}

interface CartState {
  items: OrderItem[];
  addToCart: (product: Product, quantity?: number, price?: number) => void;
  removeFromCart: (productId: number) => void;
  updateQuantity: (productId: number, quantity: number) => void; // Added for flexibility
  clearCart: () => void;
  setCart: (items: OrderItem[]) => void;
  total: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  items: [],
  setCart: (items) => set({ items }),
  addToCart: (product, quantity = 1, price) => {
    const items = get().items;
    const existingItem = items.find((item) => item.product.id === product.id);
    const finalPrice = price !== undefined ? price : product.price;

    if (existingItem) {
      // For service items, ignore stock check. For others, check stock.
      if (product.product_type !== 'service' && existingItem.quantity + quantity > product.stock) {
        // Optional: Show error or notification
        return; 
      }
      
      set({
        items: items.map((item) =>
          item.product.id === product.id
            ? { 
                ...item, 
                quantity: item.quantity + quantity,
                // If a new price is provided, update it. Otherwise keep existing.
                price: price !== undefined ? price : item.price 
              }
            : item
        ),
      });
    } else {
      // Check stock for non-service items
      if (product.product_type !== 'service' && quantity > product.stock) {
        return;
      }
      set({ items: [...items, { product, quantity, price: finalPrice }] });
    }
  },
  removeFromCart: (productId) => {
    set({
      items: get().items.filter((item) => item.product.id !== productId),
    });
  },
  updateQuantity: (productId, quantity) => {
    const items = get().items;
    const item = items.find((i) => i.product.id === productId);
    if (!item) return;

    if (quantity <= 0) {
      get().removeFromCart(productId);
      return;
    }

    if (item.product.product_type !== 'service' && quantity > item.product.stock) {
      return;
    }

    set({
      items: items.map((i) =>
        i.product.id === productId ? { ...i, quantity } : i
      ),
    });
  },
  clearCart: () => set({ items: [] }),
  total: () => {
    return get().items.reduce(
      (acc, item) => acc + item.price * item.quantity,
      0
    );
  },
}));
