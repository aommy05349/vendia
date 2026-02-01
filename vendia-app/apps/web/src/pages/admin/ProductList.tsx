import React, { useEffect, useState } from 'react';
import { useProductStore, useCategoryStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const ProductList = () => {
  const { t } = useTranslation();
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
    if (!window.confirm(t('products.alerts.delete_confirm'))) return;
    try {
      await deleteProduct(id);
      setAlertMessage({ type: 'success', text: t('products.alerts.delete_success') });
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
        <h1 className="h3">{t('products.title')}</h1>
        <button
          onClick={() => navigate('/products/create')}
          className="btn btn-success"
        >
          {t('products.list.create_button')}
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
                    <label className="form-label">{t('products.list.filter.category')}</label>
                    <select 
                        className="form-select" 
                        value={selectedCategory} 
                        onChange={(e) => { setSelectedCategory(e.target.value); setCurrentPage(1); }}
                    >
                        <option value="">{t('products.list.filter.all_categories')}</option>
                        {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div className="col-md-4">
                    <label className="form-label">{t('products.list.filter.sort_by')}</label>
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
                        <option value="created_at-desc">{t('products.list.filter.sort_options.newest')}</option>
                        <option value="created_at-asc">{t('products.list.filter.sort_options.oldest')}</option>
                        <option value="name-asc">{t('products.list.filter.sort_options.name_az')}</option>
                        <option value="name-desc">{t('products.list.filter.sort_options.name_za')}</option>
                        <option value="price-asc">{t('products.list.filter.sort_options.price_low_high')}</option>
                        <option value="price-desc">{t('products.list.filter.sort_options.price_high_low')}</option>
                        <option value="stock-asc">{t('products.list.filter.sort_options.stock_low_high')}</option>
                        <option value="stock-desc">{t('products.list.filter.sort_options.stock_high_low')}</option>
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
                        <th className="p-3 border-bottom-2">{t('products.list.table.name')}</th>
                        <th className="p-3 border-bottom-2">{t('products.list.table.price')}</th>
                        <th className="p-3 border-bottom-2">{t('products.list.table.stock')}</th>
                        <th className="p-3 border-bottom-2">{t('products.list.table.category')}</th>
                        <th className="p-3 border-bottom-2">{t('products.list.table.sku')}</th>
                        <th className="p-3 border-bottom-2">{t('products.list.table.value')}</th>
                        <th className="p-3 border-bottom-2">{t('products.list.table.type')}</th>
                        <th className="p-3 border-bottom-2">{t('products.list.table.actions')}</th>
                    </tr>
                    </thead>
                    <tbody>
                    {products.length > 0 ? products.map((product) => (
                        <tr key={product.id}>
                        <td className="p-3">
                            <div className="fw-bold">{product.name}</div>
                            <div className="small text-muted text-truncate" style={{ maxWidth: '200px' }}>{product.description}</div>
                        </td>
                        <td className="p-3">฿{Number(product.price).toLocaleString()}</td>
                        <td className="p-3">
                            {product.product_type === 'service' ? (
                                <span className="text-muted">-</span>
                            ) : (
                                <div className="d-flex flex-column">
                                    <span className={`badge ${
                                        product.stock <= 0 ? 'bg-danger' : 
                                        product.stock <= (product.quantity_alert || 5) ? 'bg-warning text-dark' : 
                                        'bg-success'
                                    }`}>
                                        {product.stock} {product.unit?.name || ''}
                                    </span>
                                    {product.stock <= (product.quantity_alert || 5) && product.stock > 0 && (
                                        <small className="text-danger mt-1" style={{ fontSize: '0.7em' }}>{t('products.list.table.low_stock')}</small>
                                    )}
                                </div>
                            )}
                        </td>
                        <td className="p-3">{product.category?.name || getCategoryName(product.category_id)}</td>
                        <td className="p-3">{product.sku}</td>
                        <td className="p-3">
                            {product.product_type === 'service' ? (
                                <span className="text-muted">-</span>
                            ) : (
                                Number(product.price * product.stock).toLocaleString('en-US', { minimumFractionDigits: 2 })
                            )}
                        </td>
                        <td className="p-3">
                            {product.product_type === 'bundle' ? (
                                <span className="badge bg-info text-dark">{t('products.form.fields.types.bundle')}</span>
                            ) : product.product_type === 'variable' ? (
                                <span className="badge bg-warning text-dark">{t('products.form.fields.types.variable')}</span>
                            ) : product.product_type === 'service' ? (
                                <span className="badge bg-secondary text-white">{t('products.form.fields.types.service')}</span>
                            ) : (
                                <span className="badge bg-light text-dark border">{t('products.form.fields.types.single')}</span>
                            )}
                        </td>
                        <td className="p-3">
                            <button
                            onClick={() => navigate(`/products/${product.id}/edit`)}
                            className="btn btn-sm btn-outline-primary me-2"
                            >
                            {t('actions.edit')}
                            </button>
                            <button
                            onClick={() => handleDelete(product.id)}
                            className="btn btn-sm btn-outline-danger"
                            >
                            {t('actions.delete')}
                            </button>
                        </td>
                        </tr>
                    )) : (
                        <tr>
                            <td colSpan={6} className="text-center p-5 text-muted">{t('common.no_data')}</td>
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
