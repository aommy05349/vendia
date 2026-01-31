import React, { useEffect, useState } from 'react';
import { useCartStore, useProductStore, useCategoryStore, api } from '@vendia/shared';

export const Pos = () => {
  const { items, addToCart, removeFromCart, clearCart, total } = useCartStore();
  const { products, fetchProducts, loading } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);

  useEffect(() => {
    fetchProducts();
    fetchCategories();
  }, [fetchProducts, fetchCategories]);

  const filteredProducts = selectedCategory
    ? products.filter((p) => p.category_id === selectedCategory)
    : products;

  const handleCheckout = async () => {
    try {
      await api.post('/orders', {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
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
    <div className="d-flex h-100">
      {/* Product Grid */}
      <div className="flex-grow-1 p-4 overflow-auto border-end" style={{ flex: 2 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 m-0">Products</h1>
        </div>
        
        {/* Category Filter */}
        <div className="mb-4 d-flex gap-2 overflow-auto pb-2">
          <button 
            className={`btn ${selectedCategory === null ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => setSelectedCategory(null)}
          >
            All
          </button>
          {categories.map((category) => (
            <button
              key={category.id}
              className={`btn ${selectedCategory === category.id ? 'btn-dark' : 'btn-outline-dark'}`}
              onClick={() => setSelectedCategory(category.id)}
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
          <div className="row g-3">
            {filteredProducts.map((product) => (
              <div key={product.id} className="col-12 col-md-6 col-lg-4 col-xl-3">
                <div className={`card h-100 shadow-sm ${product.stock === 0 ? 'opacity-50' : ''}`}>
                  <div className="card-body d-flex flex-column">
                    <h5 className="card-title">{product.name}</h5>
                    <p className="card-text text-muted small flex-grow-1">{product.description}</p>
                    <div className="d-flex justify-content-between align-items-center mt-3">
                      <span className="fw-bold fs-5">${product.price}</span>
                      <span className="small text-muted">Stock: {product.stock}</span>
                    </div>
                    <button
                      disabled={product.stock === 0}
                      onClick={() => addToCart(product)}
                      className={`btn w-100 mt-3 ${product.stock === 0 ? 'btn-secondary' : 'btn-primary'}`}
                    >
                      {product.stock === 0 ? 'Out of Stock' : 'Add to Cart'}
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Cart Sidebar */}
      <div className="d-flex flex-column p-4 bg-light" style={{ flex: 1, minWidth: '300px' }}>
        <h2 className="h4 mt-0 mb-4">Cart</h2>
        {items.length === 0 ? (
          <p className="text-muted text-center my-5">Cart is empty</p>
        ) : (
          <div className="flex-grow-1 overflow-auto mb-3">
            {items.map((item) => (
              <div key={item.product.id} className="card mb-2 border-0 shadow-sm">
                <div className="card-body p-3 d-flex justify-content-between align-items-center">
                  <div>
                    <div className="fw-bold">{item.product.name}</div>
                    <div className="small text-muted">
                      ${item.product.price} x {item.quantity}
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
        
        <div className="pt-3 border-top mt-auto">
          <div className="d-flex justify-content-between fs-4 fw-bold mb-3">
            <span>Total:</span>
            <span>${total().toFixed(2)}</span>
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
    </div>
  );
};
