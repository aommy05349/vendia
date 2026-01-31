import React, { useEffect, useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';

export const EditWarehouse = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { warehouses, fetchWarehouses, updateWarehouse, loading } = useAuxStore();
  
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (warehouses.length === 0) {
        await fetchWarehouses();
      }
      setInitialLoading(false);
    };
    loadData();
  }, [fetchWarehouses, warehouses.length]);

  useEffect(() => {
    if (!initialLoading && id) {
      const warehouse = warehouses.find(w => w.id === parseInt(id));
      if (warehouse) {
        setName(warehouse.name);
        setAddress(warehouse.address || '');
        setPhone(warehouse.phone || '');
        setEmail(warehouse.email || '');
      } else {
        setError('Warehouse not found');
      }
    }
  }, [initialLoading, id, warehouses]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id) return;

    try {
      await updateWarehouse(parseInt(id), name, address, phone, email);
      navigate('/warehouses', { state: { success: 'Warehouse updated successfully!' } });
    } catch (err: any) {
      setError(err.message || 'Failed to update warehouse');
    }
  };

  if (initialLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">Edit Warehouse</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold">Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Address</label>
              <input 
                type="text" 
                className="form-control" 
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Phone</label>
              <input 
                type="text" 
                className="form-control" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Email</label>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div className="d-flex justify-content-between">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/warehouses')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Warehouse'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
