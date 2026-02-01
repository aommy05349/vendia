import React, { useEffect, useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const WarehouseList = () => {
  const { t } = useTranslation();
  const { warehouses, fetchWarehouses, deleteWarehouse, loading, error } = useAuxStore();
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchWarehouses();
  }, []);

  useEffect(() => {
    if (error) {
        setAlertMessage({ type: 'danger', text: error });
    }
  }, [error]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('warehouses.alerts.delete_confirm'))) return;
    try {
      await deleteWarehouse(id);
      setAlertMessage({ type: 'success', text: t('warehouses.alerts.delete_success') });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      // Error is handled by store
    }
  };

  if (loading && warehouses.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">{t('warehouses.title')}</h1>
        <button
          onClick={() => navigate('/warehouses/create')}
          className="btn btn-success"
        >
          {t('warehouses.create_title')}
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
