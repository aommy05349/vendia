import React, { useEffect, useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useCartStore, useProductStore, useCategoryStore, useCustomerStore, api, Product, User } from '@vendia/shared';

export const Pos = () => {
  const { t } = useTranslation();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const editingOrderId = searchParams.get('order_id');
  const parentOrderId = searchParams.get('parent_order_id');
  const { items, addToCart, removeFromCart, updateQuantity, clearCart, setCart, total } = useCartStore();
  const { products, fetchProducts, loading, pagination } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { customers, fetchCustomers, createCustomer } = useCustomerStore();
  
  const [selectedCategory, setSelectedCategory] = useState<number | null>(null);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [parentOrder, setParentOrder] = useState<any | null>(null);
  const [showCustomerModal, setShowCustomerModal] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCreateCustomerModal, setShowCreateCustomerModal] = useState(false);
  const [newCustomerFirstName, setNewCustomerFirstName] = useState('');
  const [newCustomerLastName, setNewCustomerLastName] = useState('');
  const [newCustomerPhone, setNewCustomerPhone] = useState('');
  const [newCustomerEmail, setNewCustomerEmail] = useState('');
  const [newCustomerTaxId, setNewCustomerTaxId] = useState('');
  const [newCustomerAddress, setNewCustomerAddress] = useState('');
  const [newCustomerCompany, setNewCustomerCompany] = useState('');
  const [applyVat, setApplyVat] = useState(false);
  const [withholdingRate, setWithholdingRate] = useState<0 | 3 | 7>(0);

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;
  const subtotalAmount = total();
  const vatRate = applyVat ? 7 : 0;
  const vatAmount = round2((subtotalAmount * vatRate) / 100);
  const withholdingAmount = round2((subtotalAmount * withholdingRate) / 100);
  const totalWithVat = round2(subtotalAmount + vatAmount);
  const payableAmount = round2(totalWithVat - withholdingAmount);
  const [createCustomerError, setCreateCustomerError] = useState<string | null>(null);

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

  const getImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const origin = apiUrl.replace(/\/api\/?$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    if (!normalizedPath.startsWith('/storage/') && !normalizedPath.startsWith('/images/')) {
        return `${origin}/storage${normalizedPath}`;
    }
    return `${origin}${normalizedPath}`;
  };

  const openCustomerSelect = () => {
    setCustomerSearch('');
    setShowCustomerModal(true);
    fetchCustomers();
  };

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
    if (parentOrderId) {
        api.get(`/orders/${parentOrderId}`).then(res => {
            setParentOrder(res.data);
        }).catch(err => console.error("Failed to load parent order", err));
    }
  }, [parentOrderId]);

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
            setAlertMessage({ type: 'danger', text: t('pos.warning_items_skipped', { count: skippedCount }) });
        }

        // Direct update without timeout to test immediate reactivity
        setCart(newCartItems);
        setApplyVat(Number(res.data?.vat_rate || 0) > 0);
        setWithholdingRate((Number(res.data?.withholding_rate || 0) as 0 | 3 | 7) || 0);
        
      }).catch(err => {
        console.error("Failed to load order", err);
        setAlertMessage({ type: 'danger', text: t('pos.error_load_order') + err.message });
      });
    } else {
        // If we are NOT editing (normal POS mode), clear the cart on mount
        clearCart();
        
        // Check for customer_id param to pre-fill customer
        const customerIdParam = searchParams.get('customer_id');
        if (customerIdParam) {
            api.get(`/users/${customerIdParam}`).then(res => {
                setSelectedCustomer(res.data);
            }).catch(err => console.error('Failed to load customer', err));
        }
    }
  }, [editingOrderId, setCart, clearCart, searchParams]);

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
    if (!editingOrderId) {
      setApplyVat(false);
      setWithholdingRate(0);
    }
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
        parent_id: parentOrderId || null,
        apply_vat: applyVat,
        withholding_rate: withholdingRate,
      };

      if (editingOrderId) {
        await api.put(`/orders/${editingOrderId}`, payload);
        setAlertMessage({ type: 'success', text: t('pos.order_updated') });
      } else {
        await api.post('/orders', payload);
        let msg = t('pos.order_placed');
        if (status === 'pending') msg = t('pos.order_saved_unpaid');
        if (status === 'quotation') msg = t('pos.quotation_created');
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
      setAlertMessage({ type: 'danger', text: t('pos.checkout_failed') });
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
      setChange(received - payableAmount);
    } else {
      setChange(null);
    }
  }, [receivedAmount, paymentMethod, payableAmount]);

  return (
    <div className="d-flex flex-column flex-lg-row h-100 overflow-hidden" style={{ minHeight: 0 }}>
      {/* Product Grid */}
      <div
        className="flex-grow-1 p-3 p-lg-4 overflow-auto border-end-lg border-bottom border-bottom-lg-0"
        style={{ flex: 4, minHeight: 0 }}
      >
        <div className="d-flex justify-content-between align-items-center mb-4">
            <h1 className="h3 m-0">
                {editingOrderId ? (
                    <span>
                        {t('pos.editing_order')} <span className="text-primary">#{editingOrderId}</span>
                        <button 
                            className="btn btn-sm btn-outline-danger ms-3" 
                            onClick={() => { 
                                clearCart();
                                navigate('/orders'); 
                            }}
                        >
                            {t('pos.cancel_edit')}
                        </button>
                    </span>
                ) : parentOrder ? (
                    <span>
                        {t('pos.adding_extra_charge')} <span className="text-primary">#{parentOrder.id}</span>
                        <button 
                            className="btn btn-sm btn-outline-danger ms-3" 
                            onClick={() => { 
                                clearCart();
                                navigate('/appointments'); 
                            }}
                        >
                            {t('pos.cancel')}
                        </button>
                    </span>
                ) : t('pos.products')}
            </h1>
        </div>
        
        {/* Category Filter */}
        <div className="mb-4 d-flex gap-2 overflow-auto pb-2">
          <button 
            className={`btn ${selectedCategory === null ? 'btn-dark' : 'btn-outline-dark'}`}
            onClick={() => handleCategorySelect(null)}
          >
            {t('common.all')}
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

        {alertMessage && alertMessage.type === 'danger' && (
          <div
            className={`alert alert-${alertMessage.type} alert-dismissible fade show`}
            role="alert"
          >
            {alertMessage.text}
            <button
              type="button"
              className="btn-close"
              onClick={() => setAlertMessage(null)}
            ></button>
          </div>
        )}
        {alertMessage && alertMessage.type === 'success' && (
          <div
            className="modal fade show d-block"
            style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
            role="dialog"
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content border-0">
                <div className="modal-body text-center p-4">
                  <div
                    className="text-success mb-3"
                    style={{ fontSize: '3rem' }}
                  >
                    <i className="bi bi-check-circle-fill"></i>
                  </div>
                  <h5 className="mb-2">
                    {t('common.success_title', 'สำเร็จ')}
                  </h5>
                  <p className="mb-0">{alertMessage.text}</p>
                </div>
                <div className="modal-footer border-0 justify-content-center">
                  <button
                    type="button"
                    className="btn btn-success"
                    onClick={() => setAlertMessage(null)}
                  >
                    {t('common.ok', 'ตกลง')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        
        {loading ? (
          <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>
        ) : (
          <>
            <div className="row g-2 g-lg-3">
              {products.map((product) => {
                const coverImage = product.images?.find(img => img.is_cover) || product.images?.[0];
                const isOutOfStock = product.product_type !== 'service' && product.stock === 0;
                
                return (
                <div key={product.id} className="col-12 col-md-6 col-lg-4 col-xl-3 col-xxl-3">
                  <div 
                    className={`card h-100 border-0 shadow-sm product-card ${isOutOfStock ? 'opacity-75' : ''}`}
                    style={{ 
                        cursor: isOutOfStock ? 'not-allowed' : 'pointer', 
                        transition: 'transform 0.2s, box-shadow 0.2s',
                        filter: isOutOfStock ? 'grayscale(1)' : 'none'
                    }}
                    onClick={() => !isOutOfStock && handleProductClick(product)}
                    onMouseEnter={(e) => { if(!isOutOfStock) { e.currentTarget.style.transform = 'translateY(-5px)'; e.currentTarget.classList.add('shadow'); } }}
                    onMouseLeave={(e) => { if(!isOutOfStock) { e.currentTarget.style.transform = 'none'; e.currentTarget.classList.remove('shadow'); } }}
                  >
                    <div style={{ height: '140px', overflow: 'hidden', position: 'relative' }} className="bg-light rounded-top">
                        {coverImage ? (
                            <img 
                                src={getImageUrl(coverImage.image_path)} 
                                className="card-img-top" 
                                alt={product.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                            />
                        ) : (
                            <div className="d-flex align-items-center justify-content-center h-100 text-muted">
                                <i className="bi bi-image fs-1 opacity-25"></i>
                            </div>
                        )}
                        
                        {/* Status Badges */}
                        <div className="position-absolute top-0 end-0 p-2">
                            {product.product_type === 'service' ? (
                                <span className="badge bg-info text-white shadow-sm">Service</span>
                            ) : isOutOfStock ? (
                                <span className="badge bg-danger shadow-sm">{t('pos.out_of_stock')}</span>
                            ) : (
                                <span className="badge bg-white text-dark bg-opacity-75 shadow-sm" style={{ backdropFilter: 'blur(4px)' }}>
                                    <i className="bi bi-box-seam me-1"></i>{product.stock}
                                </span>
                            )}
                        </div>
                    </div>

                    <div className="card-body d-flex flex-column p-2 p-lg-3">
                      <h6 className="card-title fw-bold mb-1 text-truncate" title={product.name}>{product.name}</h6>
                      <p className="card-text text-muted small mb-2 flex-grow-1" style={{ 
                          display: '-webkit-box',
                          WebkitLineClamp: 2,
                          WebkitBoxOrient: 'vertical',
                          overflow: 'hidden',
                          fontSize: '0.8rem'
                      }}>
                        {product.description || '-'}
                      </p>
                      
                      <div className="d-flex justify-content-between align-items-end mt-auto">
                        <div>
                           <span className="text-primary fw-bold">฿{Number(product.price).toLocaleString()}</span>
                        </div>
                        <button 
                           className={`btn btn-sm rounded-circle d-flex align-items-center justify-content-center shadow-sm ${isOutOfStock ? 'btn-secondary' : 'btn-primary'}`}
                           style={{ width: '32px', height: '32px' }}
                           disabled={isOutOfStock}
                        >
                           <i className="bi bi-plus-lg"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              ); })}
            </div>

            {/* Pagination Controls */}
            {pagination && pagination.last_page > 1 && (
              <div className="d-flex justify-content-center align-items-center mt-4 gap-2">
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.current_page === 1}
                  onClick={() => handlePageChange(pagination.current_page - 1)}
                >
                  {t('common.previous')}
                </button>
                <span className="text-muted">
                  {t('common.page_of', { current: pagination.current_page, total: pagination.last_page })}
                </span>
                <button
                  className="btn btn-outline-secondary"
                  disabled={pagination.current_page === pagination.last_page}
                  onClick={() => handlePageChange(pagination.current_page + 1)}
                >
                  {t('common.next')}
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Cart Sidebar */}
      <div
        className="d-flex flex-column p-3 p-lg-4 bg-light border-top overflow-hidden"
        style={{ flex: 1, minWidth: '260px', maxWidth: '500px', minHeight: 0 }}
      >
        
        {/* Customer Section */}
        <div className="mb-4">
             <div className="d-flex justify-content-between align-items-center mb-2">
                 <h6 className="text-muted text-uppercase small fw-bold m-0">{t('pos.select_customer')}</h6>
                 <button className="btn btn-sm btn-link text-decoration-none" onClick={openCustomerSelect}>
                     {selectedCustomer ? t('actions.change') : t('actions.select')}
                 </button>
             </div>
             <div className="card shadow-sm border-0" onClick={openCustomerSelect} style={{ cursor: 'pointer' }}>
                 <div className="card-body p-3">
                     {selectedCustomer ? (
                         <div>
                             <div className="fw-bold">{selectedCustomer.name}</div>
                             {selectedCustomer.phone && <div className="small text-muted">{selectedCustomer.phone}</div>}
                         </div>
                     ) : (
                         <div className="text-muted">{t('pos.walk_in')}</div>
                     )}
                 </div>
             </div>
        </div>

        <h2 className="h4 mt-0 mb-4">{t('pos.cart')}</h2>
        {items.length === 0 ? (
          <p className="text-muted text-center my-5">{t('pos.cart_empty')}</p>
        ) : (
          <div className="flex-grow-1 overflow-auto mb-3">
            {/* Products Section */}
            {items.some(item => item.product.product_type !== 'service') && (
              <div className="mb-3">
                <h6 className="text-muted text-uppercase small fw-bold mb-2">{t('pos.products')}</h6>
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
                          {t('actions.delete')}
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
                <h6 className="text-muted text-uppercase small fw-bold mb-2">{t('pos.services_fees')}</h6>
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
                          {t('actions.delete')}
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
                <h6 className="text-danger text-uppercase small fw-bold mb-2">{t('pos.discount')}</h6>
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
                          {t('actions.delete')}
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
        
        <div className="pt-3 border-top mt-auto bg-light">
          <div className="d-flex justify-content-between fs-4 fw-bold mb-3">
            <span>{t('pos.total')}:</span>
            <span>฿{total().toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
          </div>
          <button
            disabled={items.length === 0}
            onClick={handleCheckoutClick}
            className={`btn w-100 btn-lg ${items.length === 0 ? 'btn-secondary' : 'btn-success'}`}
          >
            {editingOrderId ? t('actions.update') : t('pos.pay')}
          </button>
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('pos.payment')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowPaymentModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={processPayment}>
                    <div className="mb-3">
                        <div className="d-flex justify-content-between align-items-center mb-2">
                            <label className="form-label fw-bold m-0">{t('pos.customer', 'ลูกค้า')}</label>
                            <button type="button" className="btn btn-sm btn-link text-decoration-none p-0" onClick={openCustomerSelect}>
                                {selectedCustomer ? t('actions.change') : t('actions.select')}
                            </button>
                        </div>
                        <div className="card border-0 shadow-sm" style={{ cursor: 'pointer' }} onClick={openCustomerSelect}>
                            <div className="card-body py-2 px-3">
                                {selectedCustomer ? (
                                    <div>
                                        <div className="fw-bold">{selectedCustomer.name}</div>
                                        {selectedCustomer.phone && <div className="small text-muted">{selectedCustomer.phone}</div>}
                                        {selectedCustomer.company_name && <div className="small text-muted">{selectedCustomer.company_name}</div>}
                                    </div>
                                ) : (
                                    <div className="text-muted">{t('pos.walk_in')}</div>
                                )}
                            </div>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label">{t('pos.payment_method')}</label>
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
                            <label className="btn btn-outline-primary" htmlFor="cash">{t('pos.cash')}</label>

                            <input 
                                type="radio" 
                                className="btn-check" 
                                name="paymentMethod" 
                                id="transfer" 
                                autoComplete="off" 
                                checked={paymentMethod === 'transfer'}
                                onChange={() => setPaymentMethod('transfer')}
                            />
                            <label className="btn btn-outline-primary" htmlFor="transfer">{t('pos.transfer')}</label>
                        </div>
                    </div>

                    {paymentMethod === 'cash' && (
                        <div className="mb-3">
                            <label className="form-label">{t('pos.received_amount')}</label>
                            <input
                                type="number"
                                className="form-control form-control-lg"
                                value={receivedAmount}
                                onChange={(e) => setReceivedAmount(e.target.value)}
                                placeholder={t('pos.enter_amount')}
                                autoFocus
                                required
                            />
                        </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center mb-3">
                        <span className="fs-5">{t('pos.subtotal_before_tax', 'ยอดก่อนภาษี')}:</span>
                        <span className="fs-4 fw-bold">฿{subtotalAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                    </div>

                    <div className="mb-3">
                        <div className="form-check">
                            <input
                                className="form-check-input"
                                type="checkbox"
                                id="applyVat"
                                checked={applyVat}
                                onChange={(e) => setApplyVat(e.target.checked)}
                            />
                            <label className="form-check-label fw-bold" htmlFor="applyVat">
                                {t('pos.apply_vat_7', 'คิด VAT 7%')}
                            </label>
                        </div>
                        {applyVat && (
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <span className="text-muted">{t('pos.vat', 'VAT')} ({vatRate}%)</span>
                                <span className="fw-bold">฿{vatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className="fw-bold">{t('pos.total', 'ยอดรวม')}:</span>
                            <span className="fw-bold">฿{totalWithVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                        </div>
                    </div>

                    <div className="mb-3">
                        <label className="form-label fw-bold">{t('pos.withholding', 'หัก ณ ที่จ่าย')}</label>
                        <select
                            className="form-select"
                            value={withholdingRate}
                            onChange={(e) => setWithholdingRate(Number(e.target.value) as 0 | 3 | 7)}
                        >
                            <option value={0}>{t('pos.withholding_none', 'ไม่หัก')}</option>
                            <option value={3}>3%</option>
                            <option value={7}>7%</option>
                        </select>
                        {withholdingRate > 0 && (
                            <div className="d-flex justify-content-between align-items-center mt-2">
                                <span className="text-muted">
                                    {t('pos.withholding_amount', 'ยอดหัก ณ ที่จ่าย')} ({withholdingRate}%)
                                </span>
                                <span className="fw-bold">-฿{withholdingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            </div>
                        )}
                        <div className="d-flex justify-content-between align-items-center mt-2">
                            <span className="fw-bold">{t('pos.payable', 'ยอดที่ต้องชำระจริง')}:</span>
                            <span className="fs-4 fw-bold text-primary">
                                ฿{payableAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </span>
                        </div>
                    </div>

                    {change !== null && (
                        <div className={`alert ${change < 0 ? 'alert-danger' : 'alert-success'} text-center`}>
                            <div className="small text-uppercase fw-bold mb-1">{change < 0 ? t('pos.insufficient') : t('pos.change')}</div>
                            <div className="fs-2 fw-bold">฿{change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                    )}

                    <div className="d-flex gap-2 mt-4">
                        <button type="submit" className="btn btn-success flex-grow-1 py-3 fw-bold" disabled={change !== null && change < 0}>
                            {editingOrderId ? t('pos.update_pay') : t('pos.pay')}
                        </button>
                        <button type="button" className="btn btn-outline-warning" onClick={handlePayLater}>
                             {editingOrderId ? t('pos.update_pay_later') : t('pos.pay_later')}
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
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('pos.select_customer')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowCustomerModal(false)}></button>
              </div>
              <div className="modal-body">
                <div className="d-flex gap-2 mb-3">
                    <input 
                        type="text" 
                        className="form-control" 
                        placeholder={t('pos.search_customers')}
                        value={customerSearch}
                        onChange={(e) => {
                            setCustomerSearch(e.target.value);
                            fetchCustomers({ search: e.target.value });
                        }}
                    />
                    <button className="btn btn-primary" onClick={() => { setShowCreateCustomerModal(true); setCreateCustomerError(null); }}>
                        + {t('pos.add_customer')}
                    </button>
                </div>
                
                <div className="list-group overflow-auto" style={{ maxHeight: '400px' }}>
                    <button 
                        className={`list-group-item list-group-item-action ${!selectedCustomer ? 'active' : ''}`}
                        onClick={() => { setSelectedCustomer(null); setShowCustomerModal(false); }}
                    >
                        <div className="fw-bold">{t('pos.walk_in')}</div>
                        <div className="small">{t('pos.default')}</div>
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
                                {selectedCustomer?.id === customer.id && <span className="badge bg-light text-dark">{t('customers.selected')}</span>}
                            </div>
                        </button>
                    ))}
                    {customers.length === 0 && (
                        <div className="text-center p-4 text-muted">{t('pos.no_customers_found')}</div>
                    )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Create Customer Modal */}
      {showCreateCustomerModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1070 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('customers.new_customer')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateCustomerModal(false)}></button>
              </div>
              <div className="modal-body">
                {createCustomerError && (
                    <div className="alert alert-danger" role="alert">
                        {createCustomerError}
                    </div>
                )}
                <form onSubmit={async (e) => {
                    e.preventDefault();
                    setCreateCustomerError(null);
                    try {
                        const newCustomer = await createCustomer({
                            first_name: newCustomerFirstName,
                            last_name: newCustomerLastName,
                            name: `${newCustomerFirstName} ${newCustomerLastName}`, // Fallback for display
                            phone: newCustomerPhone,
                            email: newCustomerEmail,
                            tax_id: newCustomerTaxId,
                            address: newCustomerAddress,
                            company_name: newCustomerCompany,
                        });
                        setSelectedCustomer(newCustomer);
                        setShowCreateCustomerModal(false);
                        setShowCustomerModal(false);
                        
                        // Reset form
                        setNewCustomerFirstName('');
                        setNewCustomerLastName('');
                        setNewCustomerPhone('');
                        setNewCustomerEmail('');
                        setNewCustomerTaxId('');
                        setNewCustomerAddress('');
                        setNewCustomerCompany('');
                        setCreateCustomerError(null);
                        
                        fetchCustomers();
                    } catch (err: any) {
                        const message = err.response?.data?.message || t('customers.create_failed');
                        setCreateCustomerError(message);
                    }
                }}>
                    <div className="row">
                        <div className="col-md-6 mb-3">
                            <label className="form-label">{t('customers.first_name')} *</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerFirstName}
                                onChange={(e) => setNewCustomerFirstName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">{t('customers.last_name')} *</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerLastName}
                                onChange={(e) => setNewCustomerLastName(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">{t('customers.email')} *</label>
                            <input 
                                type="email" 
                                className="form-control" 
                                value={newCustomerEmail}
                                onChange={(e) => setNewCustomerEmail(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">{t('customers.phone')} *</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerPhone}
                                onChange={(e) => setNewCustomerPhone(e.target.value)}
                                required
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">{t('customers.company')}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerCompany}
                                onChange={(e) => setNewCustomerCompany(e.target.value)}
                            />
                        </div>
                        <div className="col-md-6 mb-3">
                            <label className="form-label">{t('customers.tax_id')}</label>
                            <input 
                                type="text" 
                                className="form-control" 
                                value={newCustomerTaxId}
                                onChange={(e) => setNewCustomerTaxId(e.target.value)}
                            />
                        </div>
                        <div className="col-12 mb-3">
                            <label className="form-label">{t('customers.address')}</label>
                            <textarea 
                                className="form-control" 
                                rows={2}
                                value={newCustomerAddress}
                                onChange={(e) => setNewCustomerAddress(e.target.value)}
                            ></textarea>
                        </div>
                    </div>
                    <div className="d-grid">
                        <button type="submit" className="btn btn-success">{t('customers.create_btn')}</button>
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
                <h5 className="modal-title">{t('pos.enter_price')}</h5>
                <button type="button" className="btn-close" onClick={() => { setShowPriceModal(false); setSelectedProductForPrice(null); }}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={confirmPrice}>
                  <div className="mb-3">
                    <label className="form-label">{t('pos.price_thb')}</label>
                    <input
                      type="number"
                      className="form-control"
                      value={customPrice}
                      onChange={(e) => setCustomPrice(e.target.value)}
                      autoFocus
                    />
                    <div className="form-text text-muted">
                      {t('pos.price_deduction_hint')}
                    </div>
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <button type="button" className="btn btn-secondary" onClick={() => { setShowPriceModal(false); setSelectedProductForPrice(null); }}>{t('actions.cancel')}</button>
                    <button type="submit" className="btn btn-primary">{t('common.confirm')}</button>
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
