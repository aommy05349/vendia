import React, { useState, useEffect } from 'react';
import { api, Product } from '@vendia/shared';
import { useTranslation } from 'react-i18next';

interface SupplementaryCustomer {
  id: number;
  name: string;
  phone?: string;
}

interface CreateSupplementaryOrderModalProps {
  parentOrderId: number;
  parentOrderCode?: string;
  initialCustomer: SupplementaryCustomer | null;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateSupplementaryOrderModal: React.FC<CreateSupplementaryOrderModalProps> = ({
  parentOrderId,
  parentOrderCode,
  initialCustomer,
  onClose,
  onSuccess,
}) => {
  const { t } = useTranslation();
  const [items, setItems] = useState<
    {
      product_id: number;
      product: Product;
      quantity: number;
      price: number;
    }[]
  >([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (searchTerm.length > 1) {
        setIsSearching(true);
        try {
          const res = await api.get('/products', { params: { search: searchTerm, per_page: 12 } });
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

  const handleAddItem = (product: Product) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      handleUpdateItem(product.id, 'quantity', existing.quantity + 1);
    } else {
      const price = parseFloat(product.price.toString());
      setItems([
        ...items,
        {
          product_id: product.id,
          product,
          quantity: 1,
          price: isNaN(price) ? 0 : price,
        },
      ]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const handleUpdateItem = (productId: number, field: 'quantity' | 'price', value: number) => {
    setItems(prev =>
      prev.map(item =>
        item.product_id === productId
          ? {
              ...item,
              [field]: value,
            }
          : item
      )
    );
  };

  const handleRemoveItem = (productId: number) => {
    setItems(prev => prev.filter(i => i.product_id !== productId));
  };

  const handleSave = async () => {
    if (items.length === 0) return;
    setSaving(true);
    setError(null);
    try {
      const payload = {
        customer_id: initialCustomer?.id || null,
        parent_id: parentOrderId,
        payment_method: 'pay_later',
        status: 'pending',
        items: items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price,
        })),
      };
      await api.post('/orders', payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(t('orders.update_failed'));
      setSaving(false);
    }
  };

  const total = items.reduce((sum, item) => sum + item.price * item.quantity, 0);

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {t('appointments.detail.add_extra_charge')}{' '}
              {parentOrderCode ? `#${parentOrderCode}` : `#${parentOrderId}`}
            </h5>
            <button type="button" className="btn-close" onClick={onClose}></button>
          </div>
          <div className="modal-body">
            {error && <div className="alert alert-danger">{error}</div>}

            <div className="mb-3">
              <label className="form-label">{t('orders.customer')}</label>
              <div className="p-2 border rounded bg-light">
                <div className="fw-bold">
                  {initialCustomer?.name || t('pos.walk_in')}
                </div>
                {initialCustomer?.phone && (
                  <div className="small text-muted">{initialCustomer.phone}</div>
                )}
              </div>
            </div>

            <div className="mb-4">
              <label className="form-label">{t('pos.search_products')}</label>
              <input
                type="text"
                className="form-control mb-3"
                placeholder={t('pos.search_products')}
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
              />
              {searchTerm.length > 1 && (
                <div className="border rounded p-2 bg-light">
                  {isSearching && (
                    <div className="text-center my-3">
                      <div className="spinner-border spinner-border-sm text-primary" role="status"></div>
                    </div>
                  )}
                  {!isSearching && searchResults.length === 0 && (
                    <div className="text-center text-muted small py-2">
                      {t('pos.no_products')}
                    </div>
                  )}
                  <div className="row g-2" style={{ maxHeight: '260px', overflowY: 'auto' }}>
                    {searchResults.map(product => {
                      const coverImage = product.images?.find(img => img.is_cover) || product.images?.[0];
                      const isOutOfStock = product.product_type !== 'service' && product.stock === 0;
                      return (
                        <div key={product.id} className="col-12 col-md-6">
                          <button
                            type="button"
                            className={`card h-100 text-start border-0 shadow-sm w-100 ${isOutOfStock ? 'opacity-75' : ''}`}
                            style={{ cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                            onClick={() => !isOutOfStock && handleAddItem(product)}
                          >
                            <div className="row g-0">
                              <div className="col-4">
                                <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '80px', overflow: 'hidden' }}>
                                  {coverImage ? (
                                    <img
                                      src={coverImage.image_path}
                                      alt={product.name}
                                      style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                    />
                                  ) : (
                                    <i className="bi bi-image text-muted fs-3"></i>
                                  )}
                                </div>
                              </div>
                              <div className="col-8">
                                <div className="card-body py-2 px-3">
                                  <div className="d-flex justify-content-between align-items-start mb-1">
                                    <h6 className="mb-0 fw-bold text-truncate" title={product.name}>
                                      {product.name}
                                    </h6>
                                    <span className="badge bg-light text-dark border">
                                      ฿{Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                    </span>
                                  </div>
                                  <div className="small text-muted mb-1 text-truncate">
                                    {product.sku}
                                  </div>
                                  <div className="d-flex justify-content-between align-items-center">
                                    <span className="badge bg-secondary bg-opacity-25 text-dark">
                                      {product.product_type === 'service'
                                        ? t('pos.services')
                                        : t('pos.products')}
                                    </span>
                                    {product.product_type !== 'service' && (
                                      <span className="small text-muted">
                                        <i className="bi bi-box-seam me-1"></i>
                                        {product.stock}
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </button>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

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
                          onChange={e =>
                            handleUpdateItem(
                              item.product_id,
                              'price',
                              parseFloat(e.target.value) || 0
                            )
                          }
                        />
                      </td>
                      <td>
                        <input
                          type="number"
                          className="form-control form-control-sm"
                          value={item.quantity}
                          min={1}
                          onChange={e =>
                            handleUpdateItem(
                              item.product_id,
                              'quantity',
                              parseInt(e.target.value) || 1
                            )
                          }
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
                      <td colSpan={5} className="text-center text-muted py-4">
                        {t('pos.cart_empty')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <div className="d-flex justify-content-end mt-3 border-top pt-3">
              <h4 className="fw-bold m-0">
                {t('orders.total')}:{' '}
                <span className="text-primary">
                  ฿{total.toLocaleString()}
                </span>
              </h4>
            </div>
          </div>
          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose}>
              {t('common.cancel')}
            </button>
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
}
