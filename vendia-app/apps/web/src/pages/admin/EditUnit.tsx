import React, { useEffect, useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const EditUnit = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { units, fetchUnits, updateUnit, loading } = useAuxStore();
  
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (units.length === 0) {
        await fetchUnits();
      }
      setInitialLoading(false);
    };
    loadData();
  }, [fetchUnits, units.length]);

  useEffect(() => {
    if (!initialLoading && id) {
      const unit = units.find(u => u.id === parseInt(id));
      if (unit) {
        setName(unit.name);
        setShortName(unit.short_name);
      } else {
        setError(t('units.alerts.not_found'));
      }
    }
  }, [initialLoading, id, units]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id) return;

    try {
      await updateUnit(parseInt(id), name, shortName);
      navigate('/units', { state: { success: t('units.alerts.update_success') } });
    } catch (err: any) {
      setError(err.message || t('units.alerts.update_error'));
    }
  };

  if (initialLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">{t('units.edit_title')}</h1>
      
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
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? t('units.form.updating') : t('units.form.submit_update')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
