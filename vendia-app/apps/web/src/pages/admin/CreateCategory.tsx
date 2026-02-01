import React, { useState } from 'react';
import { useCategoryStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CreateCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createCategory, loading } = useCategoryStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createCategory({ name, description });
      navigate('/categories', { state: { success: t('categories.alerts.create_success') } });
    } catch (err: any) {
      setError(err.message || t('categories.alerts.create_error'));
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">{t('categories.create_title')}</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold">{t('categories.form.name')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('categories.form.description')}</label>
              <textarea 
                className="form-control" 
                rows={3}
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
              />
            </div>

            <div className="d-flex justify-content-between">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/categories')}
              >
                {t('common.cancel')}
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? t('categories.form.submitting') : t('categories.form.submit_create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
