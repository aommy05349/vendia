import { create } from 'zustand';
import { api } from './api';

export interface Category {
  id: number;
  name: string;
  description?: string;
  created_at?: string;
  updated_at?: string;
}

interface CategoryState {
  categories: Category[];
  loading: boolean;
  error: string | null;
  fetchCategories: () => Promise<void>;
  createCategory: (data: Partial<Category>) => Promise<Category>;
  updateCategory: (id: number, data: Partial<Category>) => Promise<Category>;
  deleteCategory: (id: number) => Promise<void>;
}

export const useCategoryStore = create<CategoryState>((set) => ({
  categories: [],
  loading: false,
  error: null,
  fetchCategories: async () => {
    set({ loading: true, error: null });
    try {
      const response = await api.get('/categories');
      set({ categories: response.data, loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to fetch categories' });
    }
  },
  createCategory: async (data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.post('/categories', data);
      set((state) => ({
        categories: [...state.categories, response.data],
        loading: false,
      }));
      return response.data;
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to create category' });
      throw error;
    }
  },
  updateCategory: async (id, data) => {
    set({ loading: true, error: null });
    try {
      const response = await api.put(`/categories/${id}`, data);
      set((state) => ({
        categories: state.categories.map((c) => (c.id === id ? response.data : c)),
        loading: false,
      }));
      return response.data;
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to update category' });
      throw error;
    }
  },
  deleteCategory: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/categories/${id}`);
      set((state) => ({
        categories: state.categories.filter((c) => c.id !== id),
        loading: false,
      }));
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to delete category' });
      throw error;
    }
  },
}));
