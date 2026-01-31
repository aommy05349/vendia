import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';

export const CategoryList = () => {
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
    if (!window.confirm('Are you sure you want to delete this category?')) return;
    try {
      await deleteCategory(id);
      setAlertMessage({ type: 'success', text: 'Category deleted successfully' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      // Error is handled by store
    }
  };

  if (loading && categories.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">Category Management</h1>
        <button
          onClick={() => navigate('/categories/create')}
          className="btn btn-success"
        >
          Create New Category
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
                <th className="p-3 border-bottom-2">Description</th>
                <th className="p-3 border-bottom-2">Actions</th>
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
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(category.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {categories.length === 0 && !loading && (
                <tr>
                  <td colSpan={4} className="text-center p-4 text-muted">No categories found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
