import { create } from 'zustand';
import { api } from './api';

export interface Brand {
  id: number;
  name: string;
  image?: string;
}

export interface Unit {
  id: number;
  name: string;
  short_name: string;
}

export interface Warehouse {
  id: number;
  name: string;
  address?: string;
  phone?: string;
  email?: string;
}

export interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

interface AuxState {
  brands: Brand[];
  brandPagination: PaginationMeta | null;
  units: Unit[];
  warehouses: Warehouse[];
  loading: boolean;
  error: string | null;
  fetchBrands: (page?: number) => Promise<void>;
  fetchUnits: () => Promise<void>;
  fetchWarehouses: () => Promise<void>;
  createBrand: (name: string, image?: File) => Promise<void>;
  updateBrand: (id: number, name: string, image?: File) => Promise<void>;
  deleteBrand: (id: number) => Promise<void>;
  createUnit: (name: string, short_name: string) => Promise<void>;
  updateUnit: (id: number, name: string, short_name: string) => Promise<void>;
  deleteUnit: (id: number) => Promise<void>;
  createWarehouse: (name: string, address?: string, phone?: string, email?: string) => Promise<void>;
  updateWarehouse: (id: number, name: string, address?: string, phone?: string, email?: string) => Promise<void>;
  deleteWarehouse: (id: number) => Promise<void>;
}

export const useAuxStore = create<AuxState>((set, get) => ({
  brands: [],
  brandPagination: null,
  units: [],
  warehouses: [],
  loading: false,
  error: null,
  fetchBrands: async (page = 1) => {
    try {
      const response = await api.get('/brands', { params: { page } });
      if (response.data.data && response.data.current_page) {
        set({ 
            brands: response.data.data,
            brandPagination: {
                current_page: response.data.current_page,
                from: response.data.from,
                last_page: response.data.last_page,
                per_page: response.data.per_page,
                to: response.data.to,
                total: response.data.total
            }
        });
      } else {
        set({ brands: response.data, brandPagination: null });
      }
    } catch (error) {
      console.error('Failed to fetch brands', error);
    }
  },
  createBrand: async (name, image) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (image) formData.append('image', image);
      await api.post('/brands', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await get().fetchBrands();
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to create brand' });
      throw error;
    }
  },
  updateBrand: async (id, name, image) => {
    set({ loading: true, error: null });
    try {
      const formData = new FormData();
      formData.append('name', name);
      if (image) formData.append('image', image);
      formData.append('_method', 'PUT');
      await api.post(`/brands/${id}`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      await get().fetchBrands(get().brandPagination?.current_page || 1);
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to update brand' });
      throw error;
    }
  },
  deleteBrand: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/brands/${id}`);
      await get().fetchBrands(get().brandPagination?.current_page || 1);
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to delete brand' });
      throw error;
    }
  },
  fetchUnits: async () => {
    try {
      const response = await api.get('/units');
      set({ units: response.data });
    } catch (error) {
      console.error('Failed to fetch units', error);
    }
  },
  createUnit: async (name, short_name) => {
    set({ loading: true, error: null });
    try {
      await api.post('/units', { name, short_name });
      await get().fetchUnits();
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to create unit' });
      throw error;
    }
  },
  updateUnit: async (id, name, short_name) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/units/${id}`, { name, short_name });
      await get().fetchUnits();
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to update unit' });
      throw error;
    }
  },
  deleteUnit: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/units/${id}`);
      set(state => ({ units: state.units.filter(u => u.id !== id), loading: false }));
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to delete unit' });
      throw error;
    }
  },
  fetchWarehouses: async () => {
    try {
      const response = await api.get('/warehouses');
      set({ warehouses: response.data });
    } catch (error) {
      console.error('Failed to fetch warehouses', error);
    }
  },
  createWarehouse: async (name, address, phone, email) => {
    set({ loading: true, error: null });
    try {
      await api.post('/warehouses', { name, address, phone, email });
      await get().fetchWarehouses();
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to create warehouse' });
      throw error;
    }
  },
  updateWarehouse: async (id, name, address, phone, email) => {
    set({ loading: true, error: null });
    try {
      await api.put(`/warehouses/${id}`, { name, address, phone, email });
      await get().fetchWarehouses();
      set({ loading: false });
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to update warehouse' });
      throw error;
    }
  },
  deleteWarehouse: async (id) => {
    set({ loading: true, error: null });
    try {
      await api.delete(`/warehouses/${id}`);
      set(state => ({ warehouses: state.warehouses.filter(w => w.id !== id), loading: false }));
    } catch (error: any) {
      set({ loading: false, error: error.message || 'Failed to delete warehouse' });
      throw error;
    }
  },
}));
