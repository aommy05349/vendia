import React, { useState, useEffect } from 'react';
import { api } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { CustomerLocations } from '../../components/CustomerLocations';
import { useTranslation } from 'react-i18next';
import { MessageModal } from '../../components/MessageModal';

export const EditCustomer = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [isCompany, setIsCompany] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    contact_name: '',
    email: '',
    phone: '',
    company_name: '',
    tax_id: '',
    address: '',
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  
  // Orders State
  const [orders, setOrders] = useState<any[]>([]);
  const [ordersLoading, setOrdersLoading] = useState(false);
  const [ordersPage, setOrdersPage] = useState(1);
  const [ordersTotalPages, setOrdersTotalPages] = useState(1);

  useEffect(() => {
    fetchCustomer();
    fetchOrders(1);
  }, [id]);

  const fetchOrders = async (pageNo: number) => {
    setOrdersLoading(true);
    try {
      const response = await api.get(`/orders?customer_id=${id}&page=${pageNo}`);
      setOrders(response.data.data);
      setOrdersTotalPages(response.data.last_page);
      setOrdersPage(pageNo);
    } catch (err) {
      console.error('Failed to fetch orders', err);
    } finally {
      setOrdersLoading(false);
    }
  };

  const fetchCustomer = async () => {
    try {
      const response = await api.get(`/customers/${id}`);
      const user = response.data;
      setIsCompany(Boolean(user.is_company) || (Boolean(user.company_name) && (!user.first_name && !user.last_name)));
      const email = typeof user.email === 'string' ? user.email.trim() : '';
      const emailForForm = email && (email.startsWith('cust_') || email.endsWith('@vendia.local') || email.endsWith('@example.com')) ? '' : email;
      setFormData({
        first_name: user.first_name,
        last_name: user.last_name,
        contact_name: user.contact_name || '',
        email: emailForForm,
        phone: user.phone || '',
        company_name: user.company_name || '',
        tax_id: user.tax_id || '',
        address: user.address || '',
      });
    } catch (err) {
      console.error(err);
      setError(t('customers.fetch_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const companyName = formData.company_name.trim();
      const contactName = formData.contact_name.trim();
      const email = formData.email.trim();
      const phone = formData.phone.trim();
      const taxId = formData.tax_id.trim();
      const address = formData.address.trim();

      const payload = {
        is_company: isCompany,
        company_name: companyName === '' ? null : companyName,
        contact_name: contactName === '' ? null : contactName,
        first_name: isCompany ? '' : formData.first_name.trim(),
        last_name: isCompany ? '' : formData.last_name.trim(),
        name: (isCompany ? formData.company_name : `${formData.first_name} ${formData.last_name}`).trim(),
        email: email === '' ? null : email,
        phone: phone === '' ? null : phone,
        tax_id: taxId === '' ? null : taxId,
        address: address === '' ? null : address,
      };
      await api.put(`/customers/${id}`, payload);
      navigate('/customers', { state: { success: t('customers.update_success') } });
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join('\n');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || t('customers.update_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '90%' }}>
      <MessageModal
        open={error !== ''}
        type="danger"
        title={t('common.error_title', 'ไม่สำเร็จ')}
        message={error}
        okLabel={t('common.ok', 'ตกลง')}
        onClose={() => setError('')}
      />
      <h1 className="mb-4">{t('customers.edit_title')}</h1>
      
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
        <div className="mb-3">
          <div className="form-check form-switch d-flex align-items-center gap-2">
            <input
              className="form-check-input"
              type="checkbox"
              checked={isCompany}
              onChange={(e) => setIsCompany(e.target.checked)}
              id="editCustomerIsCompany"
              style={{ width: '3.25rem', height: '1.75rem' }}
            />
            <label className="form-check-label fw-bold fs-5" htmlFor="editCustomerIsCompany">
              {t('customers.is_company', 'เป็นบริษัท')}
            </label>
          </div>
        </div>

        {isCompany && (
          <div className="mb-3">
            <label className="form-label fw-bold">{t('customers.company')} <span className="text-danger">*</span></label>
            <input
              type="text"
              name="company_name"
              className="form-control"
              value={formData.company_name}
              onChange={handleChange}
              required
            />
          </div>
        )}

        {isCompany && (
          <div className="mb-3">
            <label className="form-label fw-bold">{t('customers.locations.contact_person', 'ผู้ติดต่อ (ถ้ามี)')}</label>
            <input
              type="text"
              name="contact_name"
              className="form-control"
              value={formData.contact_name}
              onChange={handleChange}
              placeholder={t('print.customer.attention', 'ผู้ติดต่อ / Attention')}
            />
          </div>
        )}

        {!isCompany && (
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-bold">{t('customers.first_name')}</label>
              <input
                type="text"
                name="first_name"
                className="form-control"
                value={formData.first_name}
                onChange={handleChange}
                required
              />
            </div>
            <div className="col-md-6">
              <label className="form-label fw-bold">{t('customers.last_name')}</label>
              <input
                type="text"
                name="last_name"
                className="form-control"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-bold">{t('customers.email')}</label>
            <input 
              type="email" 
              name="email" 
              className="form-control"
              value={formData.email} 
              onChange={handleChange} 
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-bold">{t('customers.phone')}</label>
            <input 
              type="text" 
              name="phone" 
              className="form-control"
              value={formData.phone} 
              onChange={handleChange} 
            />
          </div>
        </div>

        {!isCompany && (
          <div className="mb-3">
            <label className="form-label fw-bold">{t('customers.company')}</label>
            <input 
              type="text" 
              name="company_name" 
              className="form-control"
              value={formData.company_name} 
              onChange={handleChange} 
            />
          </div>
        )}

        <div className="mb-3">
          <label className="form-label fw-bold">{t('customers.tax_id')}</label>
          <input 
            type="text" 
            name="tax_id" 
            className="form-control"
            value={formData.tax_id} 
            onChange={handleChange} 
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">{t('customers.address')}</label>
          <textarea 
            name="address" 
            className="form-control"
            rows={3}
            value={formData.address} 
            onChange={handleChange} 
          />
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/customers')}
          >
            {t('common.cancel')}
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? t('customers.update_btn') : t('customers.update_btn')}
          </button>
        </div>
      </form>

      <div className="mt-5">
        <CustomerLocations customerId={id!} />
      </div>

      <div className="mt-5 mb-5">
        <h3 className="mb-3">{t('customers.order_history')}</h3>
        <div className="card shadow-sm">
          <div className="table-responsive">
            <table className="table table-hover mb-0 align-middle">
              <thead className="table-light">
                <tr>
                  <th className="p-3">{t('orders.id')}</th>
                  <th className="p-3">{t('orders.date')}</th>
                  <th className="p-3">{t('orders.status')}</th>
                  <th className="p-3 text-end">{t('orders.total')}</th>
                  <th className="p-3 text-center">{t('orders.items')}</th>
                </tr>
              </thead>
              <tbody>
                {ordersLoading ? (
                  <tr>
                    <td colSpan={5} className="text-center p-4">
                      <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    </td>
                  </tr>
                ) : orders.length > 0 ? (
                  orders.map((order) => (
                    <tr key={order.id}>
                      <td className="p-3">#{order.id}</td>
                      <td className="p-3">
                        {new Date(order.created_at).toLocaleDateString()}
                        <div className="small text-muted">
                          {new Date(order.created_at).toLocaleTimeString()}
                        </div>
                      </td>
                      <td className="p-3">
                        <span className={`badge bg-${
                          order.status === 'completed' ? 'success' :
                          order.status === 'pending' ? 'warning' :
                          order.status === 'cancelled' ? 'danger' :
                          'secondary'
                        }`}>
                          {t(`status.${order.status}`) || order.status}
                        </span>
                      </td>
                      <td className="p-3 text-end fw-bold">
                        {Number(order.total).toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </td>
                      <td className="p-3 text-center">
                        {order.items?.length || 0}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={5} className="text-center p-4 text-muted">
                      {t('customers.no_orders')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          
          {ordersTotalPages > 1 && (
            <div className="card-footer bg-white py-3">
              <nav aria-label="Order navigation">
                <ul className="pagination justify-content-center mb-0">
                  <li className={`page-item ${ordersPage === 1 ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => fetchOrders(Math.max(ordersPage - 1, 1))}
                      disabled={ordersPage === 1}
                    >
                      {t('common.previous')}
                    </button>
                  </li>
                  {[...Array(ordersTotalPages)].map((_, i) => (
                    <li key={i + 1} className={`page-item ${ordersPage === i + 1 ? 'active' : ''}`}>
                      <button 
                        className="page-link" 
                        onClick={() => fetchOrders(i + 1)}
                      >
                        {i + 1}
                      </button>
                    </li>
                  ))}
                  <li className={`page-item ${ordersPage === ordersTotalPages ? 'disabled' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => fetchOrders(Math.min(ordersPage + 1, ordersTotalPages))}
                      disabled={ordersPage === ordersTotalPages}
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
    </div>
  );
};
