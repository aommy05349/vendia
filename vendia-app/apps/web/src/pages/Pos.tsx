import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useCartStore, useProductStore, useCategoryStore, useCustomerStore, api, Product, User } from '@vendia/shared';

export const Pos = () => {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editingOrderId = searchParams.get('order_id');
  const { items, addToCart, removeFromCart, updateQuantity, clearCart, setCart, total } = useCartStore();
  const { products, fetchProducts, loading, pagination } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { customers, fetchCustomers, createCustomer } = useCustomerStore();
  
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [newCustomerName, setNewCustomerName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerLineId, setNewCustomerLineId] = useState('');
  const [newCustomerTaxId, setNewCustomerTaxId] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerCompany, setNewCustomerCompany] = useState('');

  const [currentPage, setCurrentPage] = useState(1);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);

  // Price Override Modal State
  const [showPriceModal, setShowPriceModal] = useState(false);
  const [selectedProductForPrice, setSelectedProductForPrice] = useState<Product | null>(null);
  const [customPrice, setCustomPrice] = useState('');

  // Payment Modal State
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [change, setChange] = useState<number | null>(null);

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

  useEffect(() => {
    fetchCategories({ has_products: true });
  }, [fetchCategories]);

  useEffect(() => {
    if (editingOrderId) {
      console.log("Loading order:", editingOrderId);
      
      api.get(`/orders/${editingOrderId}`).then((res) => {
        console.log("Order loaded:", res.data);
        
        if (res.data.customer) {
            setSelectedCustomer(res.data.customer);
        } else {
            setSelectedCustomer(null);
        }

        if (!res.data.items || !Array.isArray(res.data.items)) {
            console.error("Invalid items format:", res.data);
            return;
        }

        let skippedCount = 0;
        const newCartItems = res.data.items.map((item: any) => {
           let product = item.product;
           
           if (!product) {
               console.warn("Item missing product:", item);
               // Create a placeholder product to ensure item is visible
               product = {
                   id: item.product_id || 0,
                   name: `Unknown Product (ID: ${item.product_id})`,
                   price: parseFloat(item.price) || 0,
                   stock: 999,
                   product_type: 'single',
                   description: 'Product data missing or deleted'
               };
           }
           
           const qty = parseInt(item.quantity, 10);
           const price = parseFloat(item.price);
           
           // Ensure product object has all necessary fields
           const productWithAdjustedStock = {
              ...product,
              // Force stock to be sufficient for the order
              stock: Math.max(product.stock || 0, qty + 100) 
            };

            return {
                product: productWithAdjustedStock,
                quantity: qty,
                price: price
            };
        }); 

        console.log("Setting cart:", newCartItems);
        
        if (skippedCount > 0) {
            setAlertMessage({ type: 'danger', text: `Warning: ${skippedCount} items were skipped because the product no longer exists.` });
        }

        // Direct update without timeout to test immediate reactivity
        setCart(newCartItems);
        
      }).catch(err => {
        console.error("Failed to load order", err);
        setAlertMessage({ type: 'danger', text: 'Failed to load order for editing: ' + err.message });
      });
    } else {
        // If we are NOT editing (normal POS mode), clear the cart on mount
        // This ensures no leftover state from previous edits or sessions
        clearCart();
    }
  }, [editingOrderId, setCart, clearCart]);

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

  const handleCheckoutClick = () => {
    setShowPaymentModal(true);
    setReceivedAmount('');
    setChange(null);
    setPaymentMethod('cash');
  };

  const submitOrder = async (status: 'completed' | 'pending' | 'quotation', method: string) => {
    try {
      const payload = {
        items: items.map((item) => ({
          product_id: item.product.id,
          quantity: item.quantity,
          price: item.price,
        })),
        payment_method: method,
        status: status,
        customer_id: selectedCustomer?.id || null,
      };

      if (editingOrderId) {
        await api.put(`/orders/${editingOrderId}`, payload);
        setAlertMessage({ type: 'success', text: 'Order updated successfully!' });
      } else {
        await api.post('/orders', payload);
        let msg = 'Order placed successfully!';
        if (status === 'pending') msg = 'Order saved as Unpaid!';
        if (status === 'quotation') msg = 'Quotation created successfully!';
        setAlertMessage({ type: 'success', text: msg });
      }

      setShowPaymentModal(false);
      clearCart();
      fetchProducts(); // Refresh stock
      
      if (editingOrderId) {
        setTimeout(() => navigate('/orders'), 1000);
      } else {
        setTimeout(() => setAlertMessage(null), 3000);
      }
    } catch (error) {
      setAlertMessage({ type: 'danger', text: 'Checkout failed!' });
      console.error(error);
    }
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    submitOrder('completed', paymentMethod);
  };

  const handlePayLater = () => {
    submitOrder('pending', 'pay_later');
  };

  const handleQuotation = () => {
    submitOrder('quotation', 'quotation');
  };

  useEffect(() => {
    if (paymentMethod === 'cash' && receivedAmount) {
      const received = parseFloat(receivedAmount);
      const totalAmount = total();
      setChange(received - totalAmount);
    } else {
      setChange(null);
    }
  }, [receivedAmount, paymentMethod, total]);

  return (
    <div className="d-flex flex-column flex-lg-row h-100">
      {/* Product Grid */}
      <div className="flex-grow-1 p-4 overflow-auto border-end-lg border-bottom border-bottom-lg-0" style={{ flex: 3 }}>
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 m-0">
                {editingOrderId ? (
                    <span>
                        Editing Order <span className="text-primary">#{editingOrderId}</span>
                        <button 
                            className="btn btn-sm btn-outline-danger ms-3" 
                            onClick={() => { 
                                clearCart();
                                navigate('/orders'); 
                            }}
                        >
                            Cancel Edit
                        </button>
                    </span>
                ) : 'Products'}
            </h1>
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
                        <span className="fw-bold fs-5">฿{Number(product.price).toLocaleString()}</span>
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
        
        {/* Customer Section */}
        <div className="mb-4">
             <div className="d-flex justify-content-between align-items-center mb-2">
                 <h6 className="text-muted text-uppercase small fw-bold m-0">Customer</h6>
                 <button className="btn btn-sm btn-link text-decoration-none" onClick={() => { setShowCustomerModal(true); fetchCustomers(); }}>
                     {selectedCustomer ? 'Change' : 'Select'}
                 </button>
             </div>
             <div className="card shadow-sm border-0" onClick={() => { setShowCustomerModal(true); fetchCustomers(); }} style={{ cursor: 'pointer' }}>
                 <div className="card-body p-3">
                     {selectedCustomer ? (
                         <div>
                             <div className="fw-bold">{selectedCustomer.name}</div>
                             {selectedCustomer.phone && <div className="small text-muted">{selectedCustomer.phone}</div>}
                         </div>
                     ) : (
                         <div className="text-muted">Walk-in Customer</div>
                     )}
                 </div>
             </div>
        </div>

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
                          ฿{Number(item.price).toLocaleString()} x {item.quantity}
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <button 
                          className="btn btn-light btn-sm border"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="mx-2 fw-bold">{item.quantity}</span>
                        <button 
                          className="btn btn-light btn-sm border"
                          onClick={() => addToCart(item.product, 1)}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="btn btn-danger btn-sm ms-2"
                        >
                          Remove
                        </button>
                      </div>
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
                          ฿{Number(item.price).toLocaleString()} {item.quantity > 1 && `x ${item.quantity}`}
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <button 
                          className="btn btn-light btn-sm border"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="mx-2 fw-bold">{item.quantity}</span>
                        <button 
                          className="btn btn-light btn-sm border"
                          onClick={() => addToCart(item.product, 1)}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="btn btn-danger btn-sm ms-2"
                        >
                          Remove
                        </button>
                      </div>
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
                          ฿{Number(item.price).toLocaleString()} {item.quantity > 1 && `x ${item.quantity}`}
                        </div>
                      </div>
                      <div className="d-flex align-items-center">
                        <button 
                          className="btn btn-light btn-sm border"
                          onClick={() => updateQuantity(item.product.id, item.quantity - 1)}
                        >
                          -
                        </button>
                        <span className="mx-2 fw-bold">{item.quantity}</span>
                        <button 
                          className="btn btn-light btn-sm border"
                          onClick={() => addToCart(item.product, 1)}
                        >
                          +
                        </button>
                        <button
                          onClick={() => removeFromCart(item.product.id)}
                          className="btn btn-danger btn-sm ms-2"
                        >
                          Remove
                        </button>
                      </div>
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
            <span>฿{total().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <button
            disabled={items.length === 0}
            onClick={handleCheckoutClick}
            className={`btn w-100 btn-lg ${items.length === 0 ? 'btn-secondary' : 'btn-success'}`}
          >
            {editingOrderId ? 'Update Order' : 'Checkout'}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Complete Payment</h5>
                <button type="button" className="btn-close" onClick={() => setShowPaymentModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={processPayment}>
                    <div className="mb-3">
                        <label className="form-label">Payment Method</label>
                        <div className="btn-group w-100" role="group">
                            <input 
                                type="radio" 
                                className="btn-check" 
                                name="paymentMethod" 
                                id="cash" 
                                autoComplete="off" 
                                checked={paymentMethod === 'cash'}
                                onChange={() => setPaymentMethod('cash')}
                            />
                            <label className="btn btn-outline-primary" htmlFor="cash">Cash</label>

                            <input 
                                type="radio" 
                                className="btn-check" 
                                name="paymentMethod" 
                                id="transfer" 
                                autoComplete="off" 
                                checked={paymentMethod === 'transfer'}
                                onChange={() => setPaymentMethod('transfer')}
                            />
                            <label className="btn btn-outline-primary" htmlFor="transfer">Transfer</label>
                        </div>
                    </div>

                    {paymentMethod === 'cash' && (
                        <div className="mb-3">
                            <label className="form-label">Received Amount</label>
                            <input
                                type="number"
                                className="form-control form-control-lg"
                                value={receivedAmount}
                                onChange={(e) => setReceivedAmount(e.target.value)}
                                placeholder="Enter amount"
                                autoFocus
                                required
                            />
                        </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fs-5">Total:</span>
                        <span className="fs-4 fw-bold">฿{total().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    {change !== null && (
                        <div className={`alert ${change < 0 ? 'alert-danger' : 'alert-success'} text-center`}>
                            <div className="small text-uppercase fw-bold mb-1">{change < 0 ? 'Insufficient' : 'Change'}</div>
                            <div className="fs-2 fw-bold">฿{change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                    )}

                    <div className="d-flex gap-2 mt-4">
                        <button type="submit" className="btn btn-success flex-grow-1 py-3 fw-bold" disabled={change !== null && change < 0}>
                            {editingOrderId ? 'Update & Pay' : 'Confirm Payment (ชำระเงิน)'}
                        </button>
                        <button type="button" className="btn btn-outline-warning" onClick={handlePayLater}>
                             {editingOrderId ? 'Update as Unpaid' : 'Save as Unpaid (ติดไว้ก่อน)'}
                        </button>
                    </div>
                    <div className="d-flex gap-2 mt-2">
                        <button type="button" className="btn btn-outline-info w-100" onClick={handleQuotation}>
                            Quotation (ใบเสนอราคา)
                        </button>
                    </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Customer Selection Modal */}
      {showCustomerModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Select Customer</h5>
                <button type="button" className="btn-close" onClick={() => setShowCustomerModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex gap-2 mb-3">
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder="Search customer by name, phone..." 
                        value={customerSearch}
                        onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            fetchCustomers({ search: e.target.value });
                        }}
                    />
                    <button className="btn btn-primary" onClick={() => setShowCreateCustomerModal(true)}>
                        + New Customer
                    </button>
                </div>
                
                <div className="list-group overflow-auto" style={{ maxHeight: '400px' }}>
                    <button 
                        className={`list-group-item list-group-item-action ${!selectedCustomer ? 'active' : ''}`}
                        onClick={() => { setSelectedCustomer(null); setShowCustomerModal(false); }}
                    >
                        <div className="fw-bold">Walk-in Customer</div>
                        <div className="small">Default</div>
                    </button>
                    {customers.map(customer => (
                        <button 
                            key={customer.id} 
                            className={`list-group-item list-group-item-action ${selectedCustomer?.id === customer.id ? 'active' : ''}`}
                            onClick={() => { setSelectedCustomer(customer); setShowCustomerModal(false); }}
                        >
                            <div className="d-flex justify-content-between align-items-center">
                                <div>
                                    <div className="fw-bold">{customer.name}</div>
                                    <div className="small opacity-75">{customer.phone} {customer.email && `• ${customer.email}`}</div>
                                    {customer.company_name && <div className="small opacity-75">{customer.company_name}</div>}
                                </div>
                                {selectedCustomer?.id === customer.id && <span className="badge bg-light text-dark">Selected</span>}
                            </div>
                        </button>
                    ))}
                    {customers.length === 0 && (
                        <div className="text-center p-4 text-muted">No customers found</div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreateCustomerModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">New Customer</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateCustomerModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    try {
                        const newCustomer = await createCustomer({
                            name: newCustomerName,
                            phone: newCustomerPhone,
                            email: newCustomerEmail || undefined,
                            line_id: newCustomerLineId,
                            tax_id: newCustomerTaxId,
                            address: newCustomerAddress,
                            company_name: newCustomerCompany,
                        });
                        setSelectedCustomer(newCustomer);
                        setShowCreateCustomerModal(false);
                        setShowCustomerModal(false);
                        
                        // Reset form
                        setNewCustomerName('');
                        setNewCustomerPhone('');
                        setNewCustomerEmail('');
                        setNewCustomerLineId('');
                        setNewCustomerTaxId('');
                        setNewCustomerAddress('');
                        setNewCustomerCompany('');
                        
                        fetchCustomers();
                    } catch (err) {
                        alert('Failed to create customer');
                    }
                }}>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Contact Name (ผู้ติดต่อ) *</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerName}
                                onChange={(e) => setNewCustomerName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Company Name (ชื่อบริษัท)</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerCompany}
                                onChange={(e) => setNewCustomerCompany(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Phone (เบอร์โทร)</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerPhone}
                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Email (อีเมล)</label>
                            <input 
                                type="email" 
                                className="form-control" 
                                value={newCustomerEmail}
                                onChange={(e) => setNewCustomerEmail(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Line ID</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerLineId}
                                onChange={(e) => setNewCustomerLineId(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">Tax ID (เลขผู้เสียภาษี)</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerTaxId}
                                onChange={(e) => setNewCustomerTaxId(e.target.value)}
                            />
                        </div>
                        <div className="col-12 mb-3">
                            <label className="form-label">Address (ที่อยู่)</label>
                            <textarea 
                                className="form-control" 
                                rows={2}
                                value={newCustomerAddress}
                                onChange={(e) => setNewCustomerAddress(e.target.value)}
                            ></textarea>
                        </div>
                    </div>
                    <div className="d-grid">
                        <button type="submit" className="btn btn-success">Create Customer</button>
                    </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Price Override Modal */}
      {showPriceModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Enter Price</h5>
                <button type="button" className="btn-close" onClick={() => { setShowPriceModal(false); setSelectedProductForPrice(null); }}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={confirmPrice}>
                  <div className="mb-3">
                    <label className="form-label">Price (฿)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      autoFocus
                    />
                    <div className="form-text text-muted">
                      Enter negative value for deductions (e.g., -100)
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowPriceModal(false); setSelectedProductForPrice(null); }}>Cancel</button>
                    <button type="submit" className="btn btn-primary">Confirm</button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
