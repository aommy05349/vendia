import React, { useState } from 'react';
import { api } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CreateCustomer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '', // Generated or same as email
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    company_name: '',
    tax_id: '',
    address: '',
    role: 'customer',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      // Auto-generate username from email if not provided (though we are not showing username field)
      // Actually, let's use email as username for customers to simplify
      const dataToSubmit = {
        ...formData,
        username: formData.email, // Use email as username
        password: 'password', // Default password (user can reset later if needed, or we don't use it for customers)
      };

      await api.post('/users', dataToSubmit);

      navigate('/customers', { state: { success: t('customers.create_success') } });
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join('\n');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || t('customers.create_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '90%' }}>
      <h1 className="mb-4">{t('customers.create_title')}</h1>
      {error && <div className="alert alert-danger" style={{ whiteSpace: 'pre-wrap' }}>{error}</div>}
      
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
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
              required 
            />
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-bold">{t('customers.email')} <span className="text-danger">*</span></label>
            <input 
              type="email" 
              name="email" 
              className="form-control"
              value={formData.email} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-bold">{t('customers.phone')} <span className="text-danger">*</span></label>
            <input 
              type="text" 
              name="phone" 
              className="form-control"
              value={formData.phone} 
              onChange={handleChange} 
              required
            />
          </div>
        </div>

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
            {loading ? t('common.creating') : t('customers.create_btn')}
          </button>
        </div>
      </form>
    </div>
  );
};
