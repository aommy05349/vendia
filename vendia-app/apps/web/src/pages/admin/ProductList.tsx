import React, { useEffect, useState } from 'react';
import { useProductStore, useCategoryStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';

export const ProductList = () => {
  const { products, fetchProducts, deleteProduct, loading, error } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, []);

  useEffect(() => {
    if (error) {
        setAlertMessage({ type: 'danger', text: error });
    }
  }, [error]);

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this product?')) return;
    try {
      await deleteProduct(id);
      setAlertMessage({ type: 'success', text: 'Product deleted successfully' });
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (err) {
      // Error is handled by store
    }
  };

  const getCategoryName = (categoryId?: number) => {
    if (!categoryId) return '-';
    const category = categories.find(c => c.id === categoryId);
    return category ? category.name : '-';
  };

  if (loading && products.length === 0) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">Product Management</h1>
        <button
          onClick={() => navigate('/products/create')}
          className="btn btn-success"
        >
          Create New Product
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
                <th className="p-3 border-bottom-2">Name</th>
                <th className="p-3 border-bottom-2">Price</th>
                <th className="p-3 border-bottom-2">Stock</th>
                <th className="p-3 border-bottom-2">Category</th>
                <th className="p-3 border-bottom-2">SKU</th>
                <th className="p-3 border-bottom-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {products.map((product) => (
                <tr key={product.id}>
                  <td className="p-3">
                    <div className="fw-bold">{product.name}</div>
                    <div className="small text-muted text-truncate" style={{ maxWidth: '200px' }}>{product.description}</div>
                  </td>
                  <td className="p-3">${product.price}</td>
                  <td className="p-3">
                    <span className={`badge ${product.stock > 0 ? 'bg-success' : 'bg-danger'}`}>
                      {product.stock}
                    </span>
                  </td>
                  <td className="p-3">{product.category?.name || getCategoryName(product.category_id)}</td>
                  <td className="p-3">{product.sku}</td>
                  <td className="p-3">
                    <button
                      onClick={() => navigate(`/products/${product.id}/edit`)}
                      className="btn btn-sm btn-outline-primary me-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDelete(product.id)}
                      className="btn btn-sm btn-outline-danger"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              ))}
              {products.length === 0 && !loading && (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-muted">No products found</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
