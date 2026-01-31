import React, { useEffect, useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';

export const BrandList = () => {
  const { brands, fetchBrands, deleteBrand, loading, error } = useAuxStore();
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchBrands();
  }, []);

  useEffect(() => {
    if (error) {
        setAlertMessage({ type: 'danger', text: error });
    }
  }, [error]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this brand?')) return;
    try {
      await deleteBrand(id);
      setAlertMessage({ type: 'success', text: 'Brand deleted successfully' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      // Error is handled by store
    }
  };

  if (loading && brands.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">Brand Management</h1>
        <button
          onClick={() => navigate('/brands/create')}
          className="btn btn-success"
        >
          Create New Brand
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
                <th className="p-3 border-bottom-2">Image</th>
                <th className="p-3 border-bottom-2">Name</th>
                <th className="p-3 border-bottom-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {brands.map((brand) => (
                <tr key={brand.id}>
                  <td className="p-3">{brand.id}</td>
                  <td className="p-3">
                    {brand.image ? (
                      <img 
                        src={brand.image.startsWith('http') ? brand.image : `${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${brand.image}`} 
                        alt={brand.name} 
                        style={{ width: '40px', height: '40px', objectFit: 'cover', borderRadius: '4px' }} 
                      />
                    ) : (
                      <span className="text-muted">No Image</span>
                    )}
                  </td>
                  <td className="p-3">{brand.name}</td>
                  <td className="p-3">
                    <button
                      onClick={() => navigate(`/brands/${brand.id}/edit`)}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(brand.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {brands.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted">No brands found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
