import React, { useEffect, useState } from 'react';
import { useCategoryStore } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';

export const EditCategory = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, fetchCategories, updateCategory, loading } = useCategoryStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadCategory = async () => {
      if (categories.length === 0) {
        await fetchCategories();
      }
      setInitialLoading(false);
    };
    loadCategory();
  }, [fetchCategories, categories.length]);

  useEffect(() => {
    if (!initialLoading && id) {
      const category = categories.find(c => c.id === parseInt(id));
      if (category) {
        setName(category.name);
        setDescription(category.description || '');
      } else {
        setError('Category not found');
      }
    }
  }, [initialLoading, id, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id) return;

    try {
      await updateCategory(parseInt(id), { name, description });
      navigate('/categories', { state: { success: 'Category updated successfully!' } });
    } catch (err: any) {
      setError(err.message || 'Failed to update category');
    }
  };

  if (initialLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">Edit Category</h1>
      
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
              <label className="form-label fw-bold">Description</label>
              <textarea 
                className="form-control" 
                rows={3}
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
              />
            </div>

            <div className="d-flex justify-content-between">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/categories')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Category'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
