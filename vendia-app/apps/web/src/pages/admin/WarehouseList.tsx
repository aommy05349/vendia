import React, { useEffect, useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';

export const WarehouseList = () => {
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
    if (!window.confirm('Are you sure you want to delete this warehouse?')) return;
    try {
      await deleteWarehouse(id);
      setAlertMessage({ type: 'success', text: 'Warehouse deleted successfully' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      // Error is handled by store
    }
  };

  if (loading && warehouses.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">Warehouse Management</h1>
        <button
          onClick={() => navigate('/warehouses/create')}
          className="btn btn-success"
        >
          Create New Warehouse
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
                <th className="p-3 border-bottom-2">ID</th>
                <th className="p-3 border-bottom-2">Name</th>
                <th className="p-3 border-bottom-2">Address</th>
                <th className="p-3 border-bottom-2">Phone</th>
                <th className="p-3 border-bottom-2">Email</th>
                <th className="p-3 border-bottom-2">Actions</th>
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
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(warehouse.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {warehouses.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-muted">No warehouses found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
