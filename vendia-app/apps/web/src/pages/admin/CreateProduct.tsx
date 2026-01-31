import React, { useState, useEffect } from 'react';
import { useProductStore, useCategoryStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';

export const CreateProduct = () => {
  const navigate = useNavigate();
  const { createProduct, loading } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createProduct({ 
        name, 
        description, 
        price: parseFloat(price), 
        stock: parseInt(stock), 
        sku,
        category_id: categoryId ? parseInt(categoryId) : undefined 
      });
      navigate('/products', { state: { success: 'Product created successfully!' } });
    } catch (err: any) {
      setError(err.message || 'Failed to create product');
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">Create New Product</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="row">
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  required
                />
              </div>
              
              <div className="col-md-6 mb-3">
                <label className="form-label fw-bold">SKU</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={sku} 
                  onChange={(e) => setSku(e.target.value)} 
                  required
                />
              </div>
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

            <div className="row">
              <div className="col-md-4 mb-3">
                <label className="form-label fw-bold">Price</label>
                <div className="input-group">
                  <span className="input-group-text">$</span>
                  <input 
                    type="number" 
                    step="0.01"
                    className="form-control" 
                    value={price} 
                    onChange={(e) => setPrice(e.target.value)} 
                    required
                  />
                </div>
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label fw-bold">Stock</label>
                <input 
                  type="number" 
                  className="form-control" 
                  value={stock} 
                  onChange={(e) => setStock(e.target.value)} 
                  required
                />
              </div>

              <div className="col-md-4 mb-3">
                <label className="form-label fw-bold">Category</label>
                <select 
                  className="form-select"
                  value={categoryId}
                  onChange={(e) => setCategoryId(e.target.value)}
                >
                  <option value="">Select Category</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="d-flex justify-content-between mt-4">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/products')}
              >
                Cancel
              </button>
              <button 
                type="submit" 
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? 'Creating...' : 'Create Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
