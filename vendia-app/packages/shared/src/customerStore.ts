import { create } from 'zustand';
import { api } from './api';
import { User } from './store';
import { PaginationMeta } from './types';

interface CustomerState {
  customers: User[];
  loading: boolean;
  pagination: PaginationMeta | null;
  fetchCustomers: (params?: { page?: number; search?: string; per_page?: number }) => Promise<void>;
  createCustomer: (data: Partial<User>) => Promise<User>;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  loading: false,
  pagination: null,
  fetchCustomers: async (params = {}) => {
    set({ loading: true });
    try {
      const response = await api.get('/users', { 
        params: { 
          role: 'customer', 
          ...params 
        } 
      });
      set({ 
        customers: response.data.data,
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
    } catch (error) {
      console.error('Failed to fetch customers', error);
      set({ loading: false });
    }
  },
  createCustomer: async (data) => {
    set({ loading: true });
    try {
      // Ensure role is customer
      const payload = { ...data, role: 'customer' };
      // Generate dummy username/email if not provided for quick customer creation
      if (!payload.username) payload.username = `cust_${Date.now()}`;
      if (!payload.email) payload.email = `cust_${Date.now()}@example.com`;
      if (!payload.first_name) payload.first_name = data.name?.split(' ')[0] || 'Unknown';
      if (!payload.last_name) payload.last_name = data.name?.split(' ').slice(1).join(' ') || 'Customer';

      const response = await api.post('/users', payload);
      set((state) => ({ 
        customers: [response.data, ...state.customers],
        loading: false 
      }));
      return response.data;
    } catch (error) {
      set({ loading: false });
      throw error;
    }
  }
}));
