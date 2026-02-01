import React, { useEffect, useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const UnitList = () => {
  const { t } = useTranslation();
  const { units, fetchUnits, deleteUnit, loading, error } = useAuxStore();
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchUnits();
  }, []);

  useEffect(() => {
    if (error) {
        setAlertMessage({ type: 'danger', text: error });
    }
  }, [error]);

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('units.alerts.delete_confirm'))) return;
    try {
      await deleteUnit(id);
      setAlertMessage({ type: 'success', text: t('units.alerts.delete_success') });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      // Error is handled by store
    }
  };

  if (loading && units.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">{t('units.title')}</h1>
        <button
          onClick={() => navigate('/units/create')}
          className="btn btn-success"
        >
          {t('units.create_title')}
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
                <th className="p-3 border-bottom-2">{t('units.table.id')}</th>
                <th className="p-3 border-bottom-2">{t('units.table.name')}</th>
                <th className="p-3 border-bottom-2">{t('units.table.short_name')}</th>
                <th className="p-3 border-bottom-2">{t('units.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {units.map((unit) => (
                <tr key={unit.id}>
                  <td className="p-3">{unit.id}</td>
                  <td className="p-3">{unit.name}</td>
                  <td className="p-3">{unit.short_name}</td>
                  <td className="p-3">
                    <button
                      onClick={() => navigate(`/units/${unit.id}/edit`)}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      {t('actions.edit')}
                    </button>
                    <button
                      onClick={() => handleDelete(unit.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      {t('actions.delete')}
                    </button>
                  </td>
                </tr>
              ))}
              {units.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted">{t('units.alerts.no_units')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
