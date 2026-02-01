import React, { useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CreateUnit = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createUnit, loading } = useAuxStore();
  
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createUnit(name, shortName);
      navigate('/units', { state: { success: t('units.alerts.create_success') } });
    } catch (err: any) {
      setError(err.message || t('units.alerts.create_error'));
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">{t('units.create_title')}</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold">{t('units.form.name')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('units.form.short_name')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={shortName} 
                onChange={(e) => setShortName(e.target.value)} 
                required
              />
            </div>

            <div className="d-flex justify-content-between">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/units')}
              >
                {t('units.form.cancel')}
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? t('units.form.submitting') : t('units.form.submit_create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
