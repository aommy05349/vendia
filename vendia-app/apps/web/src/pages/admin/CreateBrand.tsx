import React, { useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CreateBrand = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createBrand, loading } = useAuxStore();
  
  const [name, setName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [error, setError] = useState('');

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createBrand(name, image || undefined);
      navigate('/brands', { state: { success: t('brands.alerts.create_success') } });
    } catch (err: any) {
      setError(err.message || t('brands.alerts.create_error'));
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">{t('brands.create_title')}</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold">{t('brands.form.name')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('brands.form.image')}</label>
              <input 
                type="file" 
                className="form-control" 
                accept="image/*"
                onChange={handleImageChange}
              />
            </div>

            <div className="d-flex justify-content-between">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/brands')}
              >
                {t('brands.form.cancel')}
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? t('brands.form.submitting') : t('brands.form.submit_create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
