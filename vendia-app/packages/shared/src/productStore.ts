import { create } from 'zustand';
import { api } from './api';

export interface ProductImage {
  id: number;
  product_id: number;
  image_path: string;
}

export interface BundleItem extends Product {
  pivot: {
    parent_id: number;
    child_id: number;
    quantity: number;
  };
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
  product_type?: 'single' | 'variable' | 'bundle' | 'service';
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
  bundle_items?: BundleItem[];
}

export interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

export interface ProductQueryParams {
  page?: number;
  per_page?: number;
  category_id?: number | string;
  sort_by?: string;
  sort_order?: 'asc' | 'desc';
  search?: string;
}

interface ProductState {
  products: Product[];
  pagination: PaginationMeta | null;
  loading: boolean;
  error: string | null;
  fetchProducts: (params?: ProductQueryParams) => Promise<void>;
  createProduct: (data: FormData) => Promise<void>;
  updateProduct: (id: number, data: FormData | Partial<Product>) => Promise<void>;
  deleteProduct: (id: number) => Promise<void>;
}

export const useProductStore = create<ProductState>((set, get) => ({
  products: [],
  pagination: null,
  loading: false,
  error: null,
  fetchProducts: async (params = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/products', { params });
      
      // Check if response is paginated or flat array (backward compatibility)
      if (response.data.data && response.data.current_page) {
        set({ 
          products: response.data.data, 
          pagination: {
            current_page: response.data.current_page,
            from: response.data.from,
            last_page: response.data.last_page,
            per_page: response.data.per_page,
            to: response.data.to,
            total: response.data.total
          },
          loading: false 
        });
      } else {
        // Fallback for flat array if API changes haven't propagated or for other endpoints
        set({ products: response.data, pagination: null, loading: false });
      }
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to fetch products' });
    }
  },
  createProduct: async (data) => {
    set({ loading: true, error: null });
    try {
      await api.post('/products', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      // Refetch to ensure correct order and pagination
      await get().fetchProducts();
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to create product' });
      throw error;
    }
  },
  updateProduct: async (id, data) => {
    set({ loading: true, error: null });
    try {
      if (data instanceof FormData) {
        data.append('_method', 'PUT');
        await api.post(`/products/${id}`, data, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
      } else {
        await api.put(`/products/${id}`, data);
      }
      // Refetch to update list
      await get().fetchProducts();
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to update product' });
      throw error;
    }
  },
  deleteProduct: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/products/${id}`);
      // Refetch to update list
      await get().fetchProducts();
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to delete product' });
      throw error;
    }
  },
}));
