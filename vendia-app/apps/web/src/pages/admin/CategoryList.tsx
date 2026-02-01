import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CategoryList = () => {
  const { t } = useTranslation();
  const { categories, fetchCategories, deleteCategory, loading, error } = useCategoryStore();
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (error) {
        setAlertMessage({ type: 'danger', text: error });
    }
  }, [error]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('categories.alerts.delete_confirm'))) return;
    try {
      await deleteCategory(id);
      setAlertMessage({ type: 'success', text: t('categories.alerts.delete_success') });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      // Error is handled by store
    }
  };

  if (loading && categories.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">{t('categories.title')}</h1>
        <button
          onClick={() => navigate('/categories/create')}
          className="btn btn-success"
        >
          {t('categories.create')}
        </button>
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
                <th className="p-3 border-bottom-2">{t('categories.table.id')}</th>
                <th className="p-3 border-bottom-2">{t('categories.table.name')}</th>
                <th className="p-3 border-bottom-2">{t('categories.table.description')}</th>
                <th className="p-3 border-bottom-2">{t('categories.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {categories.map((category) => (
                <tr key={category.id}>
                  <td className="p-3">{category.id}</td>
                  <td className="p-3">{category.name}</td>
                  <td className="p-3">{category.description || '-'}</td>
                  <td className="p-3">
                    <button
                      onClick={() => navigate(`/categories/${category.id}/edit`)}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      {t('actions.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      {t('actions.delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted">{t('common.no_data')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
