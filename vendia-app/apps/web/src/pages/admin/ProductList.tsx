import React, { useEffect, useState } from 'react';
import { useProductStore, useCategoryStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';

export const ProductList = () => {
  const { products, pagination, fetchProducts, deleteProduct, loading, error } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const navigate = useNavigate();

  // Filter and Sort State
  const [currentPage, setCurrentPage] = useState(1);
  const [selectedCategory, setSelectedCategory] = useState<string>('');
  const [sortBy, setSortBy] = useState<string>('created_at');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    fetchProducts({
      page: currentPage,
      category_id: selectedCategory,
      sort_by: sortBy,
      sort_order: sortOrder
    });
    fetchCategories();
  }, [currentPage, selectedCategory, sortBy, sortOrder]);

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

  const handlePageChange = (newPage: number) => {
    if (pagination && newPage >= 1 && newPage <= pagination.last_page) {
        setCurrentPage(newPage);
    }
  };

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

      {/* Filters and Sort Toolbar */}
      <div className="card shadow-sm border-0 mb-4">
        <div className="card-body">
            <div className="row g-3">
                <div className="col-md-4">
                    <label className="form-label">Category</label>
                    <select 
                        className="form-select" 
                        value={selectedCategory} 
                        onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">All Categories</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="col-md-4">
                    <label className="form-label">Sort By</label>
                    <select 
                        className="form-select" 
                        value={`${sortBy}-${sortOrder}`} 
                        onChange={(e) => { 
                            const [field, order] = e.target.value.split('-'); 
                            setSortBy(field); 
                            setSortOrder(order as 'asc' | 'desc'); 
                            setCurrentPage(1);
                        }}
                    >
                        <option value="created_at-desc">Newest First</option>
                        <option value="created_at-asc">Oldest First</option>
                        <option value="name-asc">Name (A-Z)</option>
                        <option value="name-desc">Name (Z-A)</option>
                        <option value="price-asc">Price (Low to High)</option>
                        <option value="price-desc">Price (High to Low)</option>
                        <option value="stock-asc">Stock (Low to High)</option>
                        <option value="stock-desc">Stock (High to Low)</option>
                    </select>
                </div>
            </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          {loading && products.length === 0 ? (
            <div className="text-center p-5">
                <div className="spinner-border text-primary" role="status"></div>
            </div>
          ) : (
            <>
              <div className="table-responsive">
                <table className="table table-hover mb-0">
                    <thead className="table-light">
                    <tr>
                        <th className="p-3 border-bottom-2">Name</th>
                        <th className="p-3 border-bottom-2">Price</th>
                        <th className="p-3 border-bottom-2">Stock</th>
                        <th className="p-3 border-bottom-2">Category</th>
                        <th className="p-3 border-bottom-2">SKU</th>
                        <th className="p-3 border-bottom-2">Type</th>
                        <th className="p-3 border-bottom-2">Actions</th>
                    </tr>
                    </thead>
                    <tbody>
                    {products.length > 0 ? products.map((product) => (
                        <tr key={product.id}>
                        <td className="p-3">
                            <div className="fw-bold">{product.name}</div>
                            <div className="small text-muted text-truncate" style={{ maxWidth: '200px' }}>{product.description}</div>
                        </td>
                        <td className="p-3">฿{product.price}</td>
                        <td className="p-3">
                            <span className={`badge ${product.stock > 0 ? 'bg-success' : 'bg-danger'}`}>
                            {product.stock}
                            </span>
                        </td>
                        <td className="p-3">{product.category?.name || getCategoryName(product.category_id)}</td>
                        <td className="p-3">{product.sku}</td>
                        <td className="p-3">
                            {product.product_type === 'bundle' ? (
                                <span className="badge bg-info text-dark">Bundle</span>
                            ) : product.product_type === 'variable' ? (
                                <span className="badge bg-warning text-dark">Variable</span>
                            ) : (
                                <span className="badge bg-light text-dark border">Single</span>
                            )}
                        </td>
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
                    )) : (
                        <tr>
                            <td colSpan={6} className="text-center p-5 text-muted">No products found</td>
                        </tr>
                    )}
                    </tbody>
                </table>
              </div>
              
              {/* Pagination */}
              {pagination && pagination.total > 0 && (
                <div className="d-flex justify-content-between align-items-center p-3 border-top">
                    <div className="text-muted small">
                        Showing {pagination.from} to {pagination.to} of {pagination.total} results
                    </div>
                    <nav aria-label="Page navigation">
                        <ul className="pagination mb-0">
                            <li className={`page-item ${pagination.current_page === 1 ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => handlePageChange(pagination.current_page - 1)}>Previous</button>
                            </li>
                            {[...Array(pagination.last_page)].map((_, i) => {
                                const page = i + 1;
                                // Show first, last, current, and surrounding pages
                                if (
                                    page === 1 || 
                                    page === pagination.last_page || 
                                    (page >= pagination.current_page - 1 && page <= pagination.current_page + 1)
                                ) {
                                    return (
                                        <li key={page} className={`page-item ${pagination.current_page === page ? 'active' : ''}`}>
                                            <button className="page-link" onClick={() => handlePageChange(page)}>{page}</button>
                                        </li>
                                    );
                                } else if (
                                    page === pagination.current_page - 2 || 
                                    page === pagination.current_page + 2
                                ) {
                                    return <li key={page} className="page-item disabled"><span className="page-link">...</span></li>;
                                }
                                return null;
                            })}
                            <li className={`page-item ${pagination.current_page === pagination.last_page ? 'disabled' : ''}`}>
                                <button className="page-link" onClick={() => handlePageChange(pagination.current_page + 1)}>Next</button>
                            </li>
                        </ul>
                    </nav>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};
