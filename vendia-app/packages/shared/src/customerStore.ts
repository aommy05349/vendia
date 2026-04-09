import { create } from 'zustand';
import { api } from './api';
import { Customer, PaginationMeta } from './types';

interface CustomerState {
  customers: Customer[];
  loading: boolean;
  pagination: PaginationMeta | null;
  fetchCustomers: (params?: { page?: number; search?: string; per_page?: number; has_available_order_for_appointment?: boolean }) => Promise<void>;
  createCustomer: (data: Partial<Customer>) => Promise<Customer>;
}

export const useCustomerStore = create<CustomerState>((set) => ({
  customers: [],
  loading: false,
  pagination: null,
  fetchCustomers: async (params = {}) => {
    set({ loading: true });
    try {
      const response = await api.get('/customers', { params });
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
      const response = await api.post('/customers', data);
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
