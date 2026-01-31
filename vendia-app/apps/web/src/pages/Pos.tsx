import React, { useEffect, useState } from 'react';
import { useCartStore, useProductStore, useCategoryStore, api, Product } from '@vendia/shared';

export const Pos = () => {
  const { items, addToCart, removeFromCart, clearCart, total } = useCartStore();
  const { products, fetchProducts, loading, pagination } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);

  // Price Override Modal State
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedProductForPrice, setSelectedProductForPrice] = useState<Product | null>(null);
  const [customPrice, setCustomPrice] = useState('');

  useEffect(() => {
    fetchProducts({
      page: currentPage,
      category_id: selectedCategory || undefined,
      per_page: 12
    });
  }, [fetchProducts, currentPage, selectedCategory]);

  useEffect(() => {
    fetchCategories({ has_products: true });
  }, [fetchCategories]);

  const handleCategorySelect = (id: number | null) => {
    setSelectedCategory(id);
    setCurrentPage(1);
  };

  const handlePageChange = (page: number) => {
    if (pagination && page >= 1 && page <= pagination.last_page) {
      setCurrentPage(page);
    }
  };


  const handleProductClick = (product: Product) => {
    if (product.product_type === 'service') {
      setSelectedProductForPrice(product);
      setCustomPrice(product.price.toString());
      setShowPriceModal(true);
    } else {
      addToCart(product);
    }
  };

  const confirmPrice = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (selectedProductForPrice) {
      addToCart(selectedProductForPrice, 1, parseFloat(customPrice));
      setShowPriceModal(false);
      setSelectedProductForPrice(null);
    }
  };

  const handleCheckout = async () => {
    try {
      await api.post('/orders', {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
        })),
        payment_method: 'cash',
      });
      setAlertMessage({ type: 'success', text: 'Order placed successfully!' });
      clearCart();
      fetchProducts(); // Refresh stock
      setTimeout(() => setAlertMessage(null), 3000);
    } catch (error) {
      setAlertMessage({ type: 'danger', text: 'Checkout failed!' });
      console.error(error);
    }
  };

  return (
    <div className="d-flex flex-column flex-lg-row h-100">
      {/* Product Grid */}
      <div className="flex-grow-1 p-4 overflow-auto border-end-lg border-bottom border-bottom-lg-0" style={{ flex: 3 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 m-0">Products</h1>
        </div>
        
        {/* Category Filter */}
        <div className="mb-4 d-flex gap-2 overflow-auto pb-2">
          <button 
            className={`btn ${selectedCategory === null ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => handleCategorySelect(null)}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`btn ${selectedCategory === category.id ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => handleCategorySelect(category.id)}
            >
              {category.name}
            </button>
          ))}
        </div>

        {alertMessage && (
            <div className={`alert alert-${alertMessage.type} alert-dismissible fade show`} role="alert">
                {alertMessage.text}
                <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
            </div>
        )}
        
        {loading ? (
          <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>
        ) : (
          <>
            <div className="row g-3">
              {products.map((product) => (
                <div key={product.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
                  <div className={`card h-100 shadow-sm ${product.stock === 0 && product.product_type !== 'service' ? 'opacity-50' : ''}`}>
                    <div className="card-body d-flex flex-column">
                      <h6 className="card-title">{product.name}</h6>
                      <p className="card-text text-muted flex-grow-1" style={{ fontSize: 'x-small' }}>{product.description}</p>
                      <div className="d-flex justify-content-between align-items-center mt-3">
                        <span className="fw-bold fs-5">฿{product.price}</span>
                        <span className="small text-muted">
                          {product.product_type === 'service' ? 'Service' : `Stock: ${product.stock}`}
                        </span>
                      </div>
                      <button
                        disabled={product.product_type !== 'service' && product.stock === 0}
                        onClick={() => handleProductClick(product)}
                        className={`btn w-100 mt-3 ${product.product_type !== 'service' && product.stock === 0 ? 'btn-secondary' : 'btn-primary'}`}
                      >
                        {product.product_type !== 'service' && product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.last_page > 1 && (
              <div className="d-flex justify-content-center align-items-center mt-4 gap-2">
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.current_page === 1}
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                >
                  Previous
                </button>
                <span className="text-muted">
                  Page {pagination.current_page} of {pagination.last_page}
                </span>
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cart Sidebar */}
      <div className="d-flex flex-column p-4 bg-light border-top" style={{ flex: 1, minWidth: '280px' }}>
        <h2 className="h4 mt-0 mb-4">Cart</h2>
        {items.length === 0 ? (
          <p className="text-muted text-center my-5">Cart is empty</p>
        ) : (
          <div className="flex-grow-1 overflow-auto mb-3">
            {/* Products Section */}
            {items.some(item => item.product.product_type !== 'service') && (
              <div className="mb-3">
                <h6 className="text-muted text-uppercase small fw-bold mb-2">Products</h6>
                {items.filter(item => item.product.product_type !== 'service').map((item) => (
                  <div key={item.product.id} className="card mb-2 border-0 shadow-sm">
                    <div className="card-body p-3 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold">{item.product.name}</div>
                        <div className="small text-muted">
                          ฿{item.price} x {item.quantity}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Services Section (Positive Price) */}
            {items.some(item => item.product.product_type === 'service' && item.price >= 0) && (
              <div className="mb-3">
                <h6 className="text-muted text-uppercase small fw-bold mb-2">Services & Fees</h6>
                {items.filter(item => item.product.product_type === 'service' && item.price >= 0).map((item) => (
                  <div key={item.product.id} className="card mb-2 border-0 shadow-sm border-start border-4 border-info">
                    <div className="card-body p-3 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold">{item.product.name}</div>
                        <div className="small text-muted">
                          ฿{item.price}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Deductions Section (Negative Price) */}
            {items.some(item => item.product.product_type === 'service' && item.price < 0) && (
              <div className="mb-3">
                <h6 className="text-danger text-uppercase small fw-bold mb-2">Deductions</h6>
                {items.filter(item => item.product.product_type === 'service' && item.price < 0).map((item) => (
                  <div key={item.product.id} className="card mb-2 border-0 shadow-sm border-start border-4 border-danger bg-danger bg-opacity-10">
                    <div className="card-body p-3 d-flex justify-content-between align-items-center">
                      <div>
                        <div className="fw-bold text-danger">{item.product.name}</div>
                        <div className="small text-danger fw-bold">
                          ฿{item.price}
                        </div>
                      </div>
                      <button
                        onClick={() => removeFromCart(item.product.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Remove
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="pt-3 border-top mt-auto">
          <div className="d-flex justify-content-between fs-4 fw-bold mb-3">
            <span>Total:</span>
            <span>฿{total().toFixed(2)}</span>
          </div>
          <button
            disabled={items.length === 0}
            onClick={handleCheckout}
            className={`btn w-100 btn-lg ${items.length === 0 ? 'btn-secondary' : 'btn-success'}`}
          >
            Checkout
          </button>
        </div>
      </div>

      {/* Price Override Modal */}
      {showPriceModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Enter Service Price</h5>
                <button type="button" className="btn-close" onClick={() => setShowPriceModal(false)}></button>
              </div>
              <form onSubmit={confirmPrice}>
                <div className="modal-body">
                  <label className="form-label">Price for {selectedProductForPrice?.name}</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={customPrice}
                    onChange={(e) => setCustomPrice(e.target.value)}
                    autoFocus
                  />
                  <div className="form-text">Negative values allowed for deductions (e.g. Deposit).</div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPriceModal(false)}>Cancel</button>
                  <button type="submit" className="btn btn-primary">Add to Cart</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
