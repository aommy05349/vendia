export interface PaginationMeta {
  current_page: number;
  from: number;
  last_page: number;
  per_page: number;
  to: number;
  total: number;
}

export interface Customer {
  id: number;
  name: string;
  first_name?: string | null;
  last_name?: string | null;
  company_name?: string | null;
  is_company?: boolean;
  contact_name?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  tax_id?: string | null;
  line_id?: string | null;
  created_at?: string;
  updated_at?: string;
}
