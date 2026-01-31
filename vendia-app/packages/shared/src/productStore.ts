import { create } from 'zustand';
import { api } from './api';

export interface ProductImage {
  id: number;
  product_id: number;
  image_path: string;
}

export interface Product {
  id: number;
  name: string;
  slug?: string;
  description: string;
  price: number;
  stock: number;
  sku: string;
  category_id?: number;
  warehouse_id?: number;
  brand_id?: number;
  unit_id?: number;
  barcode_symbology?: string;
  barcode?: string;
  product_type?: 'single' | 'variable';
  tax_type?: 'exclusive' | 'inclusive';
  tax_amount?: number;
  discount_type?: 'fixed' | 'percentage';
  discount_value?: number;
  quantity_alert?: number;
  category?: {
    id: number;
    name: string;
  };
  brand?: {
    id: number;
    name: string;
  };
  unit?: {
    id: number;
    name: string;
  };
  warehouse?: {
    id: number;
    name: string;
  };
  images?: ProductImage[];
}

interface ProductState {
  products: Product[];
  loading: boolean;
  error: string | null;
  fetchProducts: () => Promise<void>;
  createProduct: (data: FormData) => Promise<void>; // Changed to FormData for file upload
  updateProduct: (id: number, data: FormData | Partial<Product>) => Promise<void>; // Changed to FormData
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
      const response = await api.post('/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
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
      // If data is FormData, use post with _method=PUT for Laravel to handle file uploads
      let response;
      if (data instanceof FormData) {
        data.append('_method', 'PUT');
        response = await api.post(`/products/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        response = await api.put(`/products/${id}`, data);
      }
      
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
