import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const EditCategory = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, fetchCategories, updateCategory, loading } = useCategoryStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadCategory = async () => {
      if (categories.length === 0) {
        await fetchCategories();
      }
      setInitialLoading(false);
    };
    loadCategory();
  }, [fetchCategories, categories.length]);

  useEffect(() => {
    if (!initialLoading && id) {
      const category = categories.find(c => c.id === parseInt(id));
      if (category) {
        setName(category.name);
        setDescription(category.description || '');
      } else {
        setError(t('categories.alerts.not_found'));
      }
    }
  }, [initialLoading, id, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id) return;

    try {
      await updateCategory(parseInt(id), { name, description });
      navigate('/categories', { state: { success: t('categories.alerts.update_success') } });
    } catch (err: any) {
      setError(err.message || t('categories.alerts.update_error'));
    }
  };

  if (initialLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">{t('categories.edit_title')}</h1>
      
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
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? t('categories.form.updating') : t('categories.form.submit_update')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
