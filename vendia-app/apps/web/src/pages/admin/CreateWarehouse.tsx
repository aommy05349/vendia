import React, { useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CreateWarehouse = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createWarehouse, loading } = useAuxStore();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createWarehouse(name, address, phone, email);
      navigate('/warehouses', { state: { success: t('warehouses.alerts.create_success') } });
    } catch (err: any) {
      setError(err.message || t('warehouses.alerts.create_error'));
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">{t('warehouses.create_title')}</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold">{t('warehouses.form.name')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('warehouses.form.address')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('warehouses.form.phone')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('warehouses.form.email')}</label>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div className="d-flex justify-content-between">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/warehouses')}
              >
                {t('warehouses.form.cancel')}
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? t('warehouses.form.submitting') : t('warehouses.form.submit_create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
