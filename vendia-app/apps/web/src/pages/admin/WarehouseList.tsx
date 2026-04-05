import React, { useEffect, useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../components/ConfirmModal';

export const WarehouseList = () => {
  const { t } = useTranslation();
  const { warehouses, fetchWarehouses, deleteWarehouse, loading, error } = useAuxStore();
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const [confirmWarehouseId, setConfirmWarehouseId] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (error) {
        setAlertMessage({ type: 'danger', text: error });
    }
  }, [error]);

  const handleDelete = (id: number) => {
    setConfirmWarehouseId(id);
  };

  if (loading && warehouses.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <ConfirmModal
        open={confirmWarehouseId !== null}
        title={t('common.confirm_title', 'ยืนยัน')}
        message={t('warehouses.alerts.delete_confirm')}
        confirmLabel={t('actions.delete', 'ลบ')}
        cancelLabel={t('common.cancel', 'ยกเลิก')}
        busy={confirmBusy}
        onCancel={() => setConfirmWarehouseId(null)}
        onConfirm={async () => {
          if (confirmWarehouseId === null) return;
          setConfirmBusy(true);
          try {
            await deleteWarehouse(confirmWarehouseId);
            setAlertMessage({ type: 'success', text: t('warehouses.alerts.delete_success') });
            setTimeout(() => setAlertMessage(null), 3000);
          } finally {
            setConfirmBusy(false);
            setConfirmWarehouseId(null);
          }
        }}
      />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">{t('warehouses.title')}</h1>
        <button
          onClick={() => navigate('/warehouses/create')}
          className="btn btn-success"
        >
          {t('warehouses.create_title')}
        </button>
      </div>

      {alertMessage && alertMessage.type === 'danger' && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-body text-center p-4">
                <div className="text-danger mb-3" style={{ fontSize: '3rem' }}>
                  <i className="bi bi-x-circle-fill"></i>
                </div>
                <h5 className="mb-2">
                  {t('common.error_title', 'ไม่สำเร็จ')}
                </h5>
                <p className="mb-0">{alertMessage.text}</p>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={() => setAlertMessage(null)}
                >
                  {t('common.ok', 'ตกลง')}
                </button>
              </div>
            </div>
          </div>
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
                <th className="p-3 border-bottom-2">{t('warehouses.table.id')}</th>
                <th className="p-3 border-bottom-2">{t('warehouses.table.name')}</th>
                <th className="p-3 border-bottom-2">{t('warehouses.table.address')}</th>
                <th className="p-3 border-bottom-2">{t('warehouses.table.phone')}</th>
                <th className="p-3 border-bottom-2">{t('warehouses.table.email')}</th>
                <th className="p-3 border-bottom-2">{t('warehouses.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {warehouses.map((warehouse) => (
                <tr key={warehouse.id}>
                  <td className="p-3">{warehouse.id}</td>
                  <td className="p-3">{warehouse.name}</td>
                  <td className="p-3">{warehouse.address || '-'}</td>
                  <td className="p-3">{warehouse.phone || '-'}</td>
                  <td className="p-3">{warehouse.email || '-'}</td>
                  <td className="p-3">
                    <button
                      onClick={() => navigate(`/warehouses/${warehouse.id}/edit`)}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      {t('actions.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(warehouse.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      {t('actions.delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {warehouses.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-muted">{t('warehouses.alerts.no_warehouses')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
