import React, { useEffect, useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../components/ConfirmModal';
import { MessageModal } from '../../components/MessageModal';

export const BrandList = () => {
  const { t } = useTranslation();
  const { brands, fetchBrands, deleteBrand, loading, error, brandPagination } = useAuxStore();
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const [confirmBrandId, setConfirmBrandId] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBrands(1);
  }, []);

  const handlePageChange = (page: number) => {
    fetchBrands(page);
  };

  useEffect(() => {
    if (error) {
        setAlertMessage({ type: 'danger', text: error });
    }
  }, [error]);

  const handleDelete = (id: number) => {
    setConfirmBrandId(id);
  };

  if (loading && brands.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <MessageModal
        open={alertMessage !== null}
        type={alertMessage?.type || 'danger'}
        title={
          alertMessage?.type === 'success'
            ? t('common.success_title', 'สำเร็จ')
            : t('common.error_title', 'ไม่สำเร็จ')
        }
        message={alertMessage?.text || ''}
        okLabel={t('common.ok', 'ตกลง')}
        onClose={() => setAlertMessage(null)}
      />
      <ConfirmModal
        open={confirmBrandId !== null}
        title={t('common.confirm_title', 'ยืนยัน')}
        message={t('brands.alerts.delete_confirm')}
        confirmLabel={t('actions.delete', 'ลบ')}
        cancelLabel={t('common.cancel', 'ยกเลิก')}
        busy={confirmBusy}
        onCancel={() => setConfirmBrandId(null)}
        onConfirm={async () => {
          if (confirmBrandId === null) return;
          setConfirmBusy(true);
          try {
            await deleteBrand(confirmBrandId);
            setAlertMessage({ type: 'success', text: t('brands.alerts.delete_success') });
            setTimeout(() => setAlertMessage(null), 3000);
          } finally {
            setConfirmBusy(false);
            setConfirmBrandId(null);
          }
        }}
      />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">{t('brands.title')}</h1>
        <button
          onClick={() => navigate('/brands/create')}
          className="btn btn-success"
        >
          {t('brands.create_title')}
        </button>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="p-3 border-bottom-2">{t('brands.table.id')}</th>
                <th className="p-3 border-bottom-2">{t('brands.table.image')}</th>
                <th className="p-3 border-bottom-2">{t('brands.table.name')}</th>
                <th className="p-3 border-bottom-2">{t('brands.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id}>
                  <td className="p-3">{brand.id}</td>
                  <td className="p-3">
                    {brand.image ? (
                      <img 
                        src={brand.image.startsWith('http') ? brand.image : `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${brand.image}`} 
                        alt={brand.name} 
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} 
                      />
                    ) : (
                      <span className="text-muted">{t('brands.form.no_image')}</span>
                    )}
                  </td>
                  <td className="p-3">{brand.name}</td>
                  <td className="p-3">
                    <button
                      onClick={() => navigate(`/brands/${brand.id}/edit`)}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      {t('actions.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(brand.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      {t('actions.delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted">{t('brands.alerts.no_brands')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        {brandPagination && (
          <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
            <div className="text-muted small">
              {t('common.page_of', { current: brandPagination.current_page, total: brandPagination.last_page })}
            </div>
            <nav>
              <ul className="pagination pagination-sm mb-0">
                <li className={`page-item ${brandPagination.current_page === 1 ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(brandPagination.current_page - 1)}
                    disabled={brandPagination.current_page === 1}
                  >
                    {t('common.previous')}
                  </button>
                </li>
                {[...Array(brandPagination.last_page)].map((_, index) => {
                  const page = index + 1;
                  // Show current page, first page, last page, and pages around current
                  if (
                    page === 1 ||
                    page === brandPagination.last_page ||
                    (page >= brandPagination.current_page - 1 && page <= brandPagination.current_page + 1)
                  ) {
                    return (
                      <li key={page} className={`page-item ${brandPagination.current_page === page ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => handlePageChange(page)}>
                          {page}
                        </button>
                      </li>
                    );
                  }
                  // Show ellipsis
                  if (
                    page === brandPagination.current_page - 2 ||
                    page === brandPagination.current_page + 2
                  ) {
                    return <li key={page} className="page-item disabled"><span className="page-link">...</span></li>;
                  }
                  return null;
                })}
                <li className={`page-item ${brandPagination.current_page === brandPagination.last_page ? 'disabled' : ''}`}>
                  <button
                    className="page-link"
                    onClick={() => handlePageChange(brandPagination.current_page + 1)}
                    disabled={brandPagination.current_page === brandPagination.last_page}
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
  );
};
