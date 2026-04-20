import { create } from 'zustand';
import { api } from './api';
import { PaginationMeta } from './types';

export interface ProductImage {
  id: number;
  product_id: number;
  image_path: string;
  is_cover: boolean;
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

export interface ProductQueryParams {
  page?: number;
  per_page?: number;
  category_id?: number | string;
  parent_category_id?: number | string;
  product_type?: 'single' | 'variable' | 'bundle' | 'service' | 'all' | string;
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
  deleteProductImage: (productId: number, imageId: number) => Promise<void>;
  setCoverImage: (productId: number, imageId: number) => Promise<void>;
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
      set({ error: error.response?.data?.message || 'Failed to delete product', loading: false });
      throw error;
    }
  },
  deleteProductImage: async (productId: number, imageId: number) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/products/${productId}/images/${imageId}`);
      
      // Update local state if the product is in the list
      const { products } = get();
      const updatedProducts = products.map(p => {
        if (p.id === productId && p.images) {
          return {
            ...p,
            images: p.images.filter(img => img.id !== imageId)
          };
        }
        return p;
      });
      
      set({ products: updatedProducts, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to delete product image', loading: false });
      throw error;
    }
  },
  setCoverImage: async (productId: number, imageId: number) => {
    set({ loading: true, error: null });
    try {
      await api.post(`/products/${productId}/images/${imageId}/set-cover`);
      
      // Update local state
      const { products } = get();
      const updatedProducts = products.map(p => {
        if (p.id === productId && p.images) {
          return {
            ...p,
            images: p.images.map(img => ({
              ...img,
              is_cover: img.id === imageId
            }))
          };
        }
        return p;
      });
      
      set({ products: updatedProducts, loading: false });
    } catch (error: any) {
      set({ error: error.response?.data?.message || 'Failed to set cover image', loading: false });
      throw error;
    }
  },
}));
