import React, { useState, useEffect } from 'react';
import { api, Product, User } from '@vendia/shared';
import { useTranslation } from 'react-i18next';

interface EditOrderModalProps {
  orderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ orderId, onClose, onSuccess }) => {
  const { t } = useTranslation();
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<User[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  // Load order details
  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        setItems(res.data.items.map((item: any) => ({
          product_id: item.product_id,
          product: item.product,
          quantity: item.quantity,
          price: parseFloat(item.price)
        })));
        setSelectedCustomer(res.data.customer || null);
        setLoading(false);
      } catch (err) {
        setError(t('pos.error_load_order'));
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, t]);

  // Search products
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 1) {
        setIsSearching(true);
        try {
          const res = await api.get('/products', { params: { search: searchTerm, per_page: 5 } });
          setSearchResults(res.data.data);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearching(false);
        }
      } else {
        setSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm]);

  // Search customers
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (customerSearchTerm.length > 1) {
        setIsSearchingCustomer(true);
        try {
          const res = await api.get('/users', { params: { role: 'customer', search: customerSearchTerm, per_page: 5 } });
          setCustomerSearchResults(res.data.data);
        } catch (err) {
          console.error(err);
        } finally {
          setIsSearchingCustomer(false);
        }
      } else {
        setCustomerSearchResults([]);
      }
    }, 500);

    return () => clearTimeout(delayDebounceFn);
  }, [customerSearchTerm]);

  const handleAddItem = (product: Product) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      handleUpdateItem(product.id, 'quantity', existing.quantity + 1);
    } else {
      setItems([...items, {
        product_id: product.id,
        product: product,
        quantity: 1,
        price: parseFloat(product.price.toString())
      }]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleUpdateItem = (productId: number, field: 'quantity' | 'price', value: number) => {
    setItems(items.map(item => {
      if (item.product_id === productId) {
        return { ...item, [field]: value };
      }
      return item;
    }));
  };

  const handleRemoveItem = (productId: number) => {
    setItems(items.filter(i => i.product_id !== productId));
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        customer_id: selectedCustomer?.id || null,
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        }))
      };
      await api.put(`/orders/${orderId}`, payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(t('orders.update_failed'));
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
        <div className="modal-dialog">
            <div className="modal-content">
                <div className="modal-body text-center p-5">
                    <div className="spinner-border text-primary" role="status"></div>
                </div>
            </div>
        </div>
    </div>
  );

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">{t('actions.edit')} #{orderId}</h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}
            
            {/* Customer Section */}
            <div className="mb-4">
                <label className="form-label">{t('orders.customer')}</label>
                {!isEditingCustomer ? (
                    <div className="d-flex justify-content-between align-items-center p-2 border rounded">
                        <div>
                            <div className="fw-bold">{selectedCustomer?.name || t('pos.walk_in')}</div>
                            {selectedCustomer && <div className="small text-muted">{selectedCustomer.phone}</div>}
                        </div>
                        <button className="btn btn-sm btn-outline-primary" onClick={() => setIsEditingCustomer(true)}>
                            {t('actions.change')}
                        </button>
                    </div>
                ) : (
                    <div className="position-relative">
                        <div className="input-group">
                            <input
                                type="text"
                                className="form-control"
                                placeholder={t('pos.search_customers')}
                                value={customerSearchTerm}
                                onChange={(e) => setCustomerSearchTerm(e.target.value)}
                                autoFocus
                            />
                            <button className="btn btn-outline-secondary" onClick={() => setIsEditingCustomer(false)}>
                                <i className="bi bi-x-lg"></i>
                            </button>
                        </div>
                        {customerSearchResults.length > 0 && (
                            <div className="list-group position-absolute w-100 shadow" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                                <button
                                    type="button"
                                    className="list-group-item list-group-item-action"
                                    onClick={() => {
                                        setSelectedCustomer(null);
                                        setIsEditingCustomer(false);
                                        setCustomerSearchTerm('');
                                        setCustomerSearchResults([]);
                                    }}
                                >
                                    <div className="fw-bold">{t('pos.walk_in')}</div>
                                    <div className="small text-muted">{t('pos.default')}</div>
                                </button>
                                {customerSearchResults.map(customer => (
                                    <button
                                        key={customer.id}
                                        type="button"
                                        className="list-group-item list-group-item-action"
                                        onClick={() => {
                                            setSelectedCustomer(customer);
                                            setIsEditingCustomer(false);
                                            setCustomerSearchTerm('');
                                            setCustomerSearchResults([]);
                                        }}
                                    >
                                        <div className="fw-bold">{customer.name}</div>
                                        <div className="small text-muted">{customer.phone}</div>
                                    </button>
                                ))}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {/* Add Product Section */}
            <div className="mb-4 position-relative">
              <label className="form-label">{t('pos.search_products')}</label>
              <input
                type="text"
                className="form-control"
                placeholder={t('pos.search_products')}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
              {/* Search Results Dropdown */}
              {searchResults.length > 0 && (
                <div className="list-group position-absolute w-100 shadow" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                  {searchResults.map(product => (
                    <button
                      key={product.id}
                      type="button"
                      className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                      onClick={() => handleAddItem(product)}
                    >
                      <div>
                        <strong>{product.name}</strong>
                        <div className="small text-muted">{product.sku}</div>
                      </div>
                      <span className="badge bg-primary">฿{product.price}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Items Table */}
            <div className="table-responsive" style={{ maxHeight: '400px', overflowY: 'auto' }}>
              <table className="table table-bordered align-middle">
                <thead className="table-light sticky-top">
                  <tr>
                    <th>{t('orders.product')}</th>
                    <th style={{ width: '120px' }}>{t('orders.price')}</th>
                    <th style={{ width: '100px' }}>{t('orders.qty')}</th>
                    <th style={{ width: '120px' }}>{t('orders.subtotal')}</th>
                    <th style={{ width: '50px' }}></th>
                  </tr>
                </thead>
                <tbody>
                  {items.map(item => (
                    <tr key={item.product_id}>
                      <td>
                        <div className="fw-bold">{item.product?.name || 'Unknown'}</div>
                        <div className="small text-muted">{item.product?.sku}</div>
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.price}
                          onChange={(e) => handleUpdateItem(item.product_id, 'price', parseFloat(e.target.value) || 0)}
                        />
                      </td>
                      <td>
                         <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.quantity}
                          min="1"
                          onChange={(e) => handleUpdateItem(item.product_id, 'quantity', parseInt(e.target.value) || 1)}
                        />
                      </td>
                      <td className="text-end">
                        ฿{(item.price * item.quantity).toLocaleString()}
                      </td>
                      <td>
                        <button
                          className="btn btn-sm btn-outline-danger"
                          onClick={() => handleRemoveItem(item.product_id)}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </td>
                    </tr>
                  ))}
                  {items.length === 0 && (
                    <tr>
                      <td colSpan={5} className="text-center text-muted py-4">{t('pos.cart_empty')}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
            
             <div className="d-flex justify-content-end mt-3 border-top pt-3">
                <h4 className="fw-bold m-0">
                    {t('orders.total')}: <span className="text-primary">฿{items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString()}</span>
                </h4>
            </div>

          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
            <button 
                type="button" 
                className="btn btn-primary" 
                onClick={handleSave}
                disabled={saving || items.length === 0}
            >
                {saving ? t('actions.save') : t('actions.save')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
