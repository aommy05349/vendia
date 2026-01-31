import React, { useState, useEffect } from 'react';
import { useProductStore, useCategoryStore } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';

export const EditProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, fetchProducts, updateProduct, loading } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [sku, setSku] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        products.length === 0 ? fetchProducts() : Promise.resolve(),
        categories.length === 0 ? fetchCategories() : Promise.resolve()
      ]);
      setInitialLoading(false);
    };
    loadData();
  }, [fetchProducts, fetchCategories, products.length, categories.length]);

  useEffect(() => {
    if (!initialLoading && id) {
      const product = products.find(p => p.id === parseInt(id));
      if (product) {
        setName(product.name);
        setDescription(product.description || '');
        setPrice(product.price.toString());
        setStock(product.stock.toString());
        setSku(product.sku);
        setCategoryId(product.category_id ? product.category_id.toString() : '');
      } else {
        setError('Product not found');
      }
    }
  }, [initialLoading, id, products]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id) return;

    try {
      await updateProduct(parseInt(id), { 
        name, 
        description, 
        price: parseFloat(price), 
        stock: parseInt(stock), 
        sku,
        category_id: categoryId ? parseInt(categoryId) : undefined 
      });
      navigate('/products', { state: { success: 'Product updated successfully!' } });
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    }
  };

  if (initialLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">Edit Product</h1>
      
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
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? 'Updating...' : 'Update Product'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
