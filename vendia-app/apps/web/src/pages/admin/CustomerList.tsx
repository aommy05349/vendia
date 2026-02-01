import React, { useEffect, useState } from 'react';
import { api } from '@vendia/shared';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  phone?: string;
  company_name?: string;
  tax_id?: string;
}

export const CustomerList = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchCustomers(page);
    if (location.state?.success) {
      setAlertMessage({ type: 'success', text: location.state.success });
      window.history.replaceState({}, document.title);
      setTimeout(() => setAlertMessage(null), 3000);
    }
  }, [location, search, page]);

  useEffect(() => {
    setPage(1);
  }, [search]);

  const fetchCustomers = async (pageNo: number) => {
    try {
      const response = await api.get(`/users?role=customer&search=${search}&page=${pageNo}`);
      setCustomers(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setAlertMessage({ type: 'danger', text: t('customers.fetch_failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('customers.delete_confirm'))) return;
    try {
      await api.delete(`/users/${id}`);
      setAlertMessage({ type: 'success', text: t('customers.delete_success') });
      fetchCustomers(page);
    } catch (error) {
      console.error('Failed to delete customer:', error);
      setAlertMessage({ type: 'danger', text: t('customers.delete_failed') });
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">{t('customers.management_title')}</h1>
        <button
          onClick={() => navigate('/customers/create')}
          className="btn btn-success"
        >
          {t('customers.create_new')}
        </button>
      </div>

      <div className="mb-4">
        <input
          type="text"
          className="form-control"
          placeholder={t('customers.search_placeholder')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {alertMessage && (
        <div className={`alert alert-${alertMessage.type} alert-dismissible fade show`} role="alert">
          {alertMessage.text}
          <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
        </div>
      )}

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="p-3 border-bottom-2">{t('customers.fields.id')}</th>
                <th className="p-3 border-bottom-2">{t('customers.fields.name')}</th>
                <th className="p-3 border-bottom-2">{t('customers.company')}</th>
                <th className="p-3 border-bottom-2">{t('customers.phone')}</th>
                <th className="p-3 border-bottom-2">{t('customers.email')}</th>
                <th className="p-3 border-bottom-2">{t('customers.tax_id')}</th>
                <th className="p-3 border-bottom-2 text-end">{t('customers.fields.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {customers.length > 0 ? (
                customers.map((customer) => (
                  <tr 
                    key={customer.id} 
                    onClick={() => navigate(`/customers/${customer.id}/edit`)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td className="p-3">{customer.id}</td>
                    <td className="p-3">
                      <div className="fw-bold">{customer.first_name} {customer.last_name}</div>
                      <div className="text-muted small">@{customer.username}</div>
                    </td>
                    <td className="p-3">{customer.company_name || '-'}</td>
                    <td className="p-3">{customer.phone || '-'}</td>
                    <td className="p-3">{customer.email}</td>
                    <td className="p-3">{customer.tax_id || '-'}</td>
                    <td className="p-3 text-end">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          navigate(`/customers/${customer.id}/edit`);
                        }}
                        className="btn btn-sm btn-outline-primary me-2"
                      >
                        {t('actions.edit')}
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleDelete(customer.id);
                        }}
                        className="btn btn-sm btn-outline-danger"
                      >
                        {t('actions.delete')}
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center p-4 text-muted">
                    {t('customers.no_customers')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white py-3">
            <nav aria-label="Page navigation">
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    {t('common.previous')}
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
                ))}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    {t('common.next')}
                  </button>
                </li>
              </ul>
            </nav>
          </div>
        )}
      </div>
    </div>
  );
};
