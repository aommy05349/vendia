import React, { useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';

export const CreateUnit = () => {
  const navigate = useNavigate();
  const { createUnit, loading } = useAuxStore();
  
  const [name, setName] = useState('');
  const [shortName, setShortName] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createUnit(name, shortName);
      navigate('/units', { state: { success: 'Unit created successfully!' } });
    } catch (err: any) {
      setError(err.message || 'Failed to create unit');
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">Create New Unit</h1>
      
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
              <label className="form-label fw-bold">Short Name</label>
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
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Unit'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
