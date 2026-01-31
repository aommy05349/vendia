import { create } from 'zustand';
import { api } from './api';

export interface Product {
  id: number;
  name: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  category_id?: number;
  category?: {
    id: number;
    name: string;
  };
}

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  createProduct: (data: Omit<Product, 'id'>) => Promise<void>;
  updateProduct: (id: number, data: Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
}

export const useProductStore = create<ProductState>((set) => ({
  products: [],
  loading: false,
  error: null,
  fetchProducts: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/products');
      set({ products: response.data, loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to fetch products' });
    }
  },
  createProduct: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/products', data);
      set((state) => ({
        products: [...state.products, response.data],
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to create product' });
      throw error;
    }
  },
  updateProduct: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/products/${id}`, data);
      set((state) => ({
        products: state.products.map((p) => (p.id === id ? response.data : p)),
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to update product' });
      throw error;
    }
  },
  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/products/${id}`);
      set((state) => ({
        products: state.products.filter((p) => p.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to delete product' });
      throw error;
    }
  },
}));
