import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../components/ConfirmModal';

export const CategoryList = () => {
  const { t } = useTranslation();
  const { categories, fetchCategories, deleteCategory, loading, error } = useCategoryStore();
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const [confirmCategoryId, setConfirmCategoryId] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    if (error) {
        setAlertMessage({ type: 'danger', text: error });
    }
  }, [error]);

  const handleDelete = (id: number) => {
    setConfirmCategoryId(id);
  };

  if (loading && categories.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <ConfirmModal
        open={confirmCategoryId !== null}
        title={t('common.confirm_title', 'ยืนยัน')}
        message={t('categories.alerts.delete_confirm')}
        confirmLabel={t('actions.delete', 'ลบ')}
        cancelLabel={t('common.cancel', 'ยกเลิก')}
        busy={confirmBusy}
        onCancel={() => setConfirmCategoryId(null)}
        onConfirm={async () => {
          if (confirmCategoryId === null) return;
          setConfirmBusy(true);
          try {
            await deleteCategory(confirmCategoryId);
            setAlertMessage({ type: 'success', text: t('categories.alerts.delete_success') });
            setTimeout(() => setAlertMessage(null), 3000);
          } finally {
            setConfirmBusy(false);
            setConfirmCategoryId(null);
          }
        }}
      />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">{t('categories.title')}</h1>
        <button
          onClick={() => navigate('/categories/create')}
          className="btn btn-success"
        >
          {t('categories.create')}
        </button>
      </div>

      {alertMessage && alertMessage.type === 'danger' && (
        <div
          className={`alert alert-${alertMessage.type} alert-dismissible fade show`}
          role="alert"
        >
          {alertMessage.text}
          <button
            type="button"
            className="btn-close"
            onClick={() => setAlertMessage(null)}
          ></button>
        </div>
      )}
      {alertMessage && alertMessage.type === 'success' && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-body text-center p-4">
                <div className="text-success mb-3" style={{ fontSize: '3rem' }}>
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <h5 className="mb-2">
                  {t('common.success_title', 'สำเร็จ')}
                </h5>
                <p className="mb-0">{alertMessage.text}</p>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setAlertMessage(null)}
                >
                  {t('common.ok', 'ตกลง')}
                </button>
              </div>
            </div>
          </div>
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
