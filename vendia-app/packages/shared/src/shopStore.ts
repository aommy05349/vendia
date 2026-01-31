import { create } from 'zustand';
import { api } from './api';

export interface Shop {
  id: number;
  name: string;
  company_name?: string;
  bank_details?: string;
  address?: string;
  phone?: string;
  tax_id?: string;
  email?: string;
  website?: string;
  footer_text?: string;
  remarks?: string;
  logo_path?: string;
}

interface ShopState {
  shop: Shop | null;
  loading: boolean;
  fetchShop: () => Promise<void>;
  updateShop: (data: FormData) => Promise<void>;
}

export const useShopStore = create<ShopState>((set) => ({
  shop: null,
  loading: false,
  fetchShop: async () => {
    set({ loading: true });
    try {
      const response = await api.get('/shop');
      set({ shop: response.data });
    } catch (error) {
      console.error('Failed to fetch shop settings:', error);
    } finally {
      set({ loading: false });
    }
  },
  updateShop: async (data: FormData) => {
    set({ loading: true });
    try {
      const response = await api.post('/shop', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
      set({ shop: response.data.shop });
    } finally {
      set({ loading: false });
    }
  }
}));
