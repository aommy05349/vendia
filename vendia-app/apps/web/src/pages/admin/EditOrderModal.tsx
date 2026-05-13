import React, { useState, useEffect } from 'react';
import { api, Product, User } from '@vendia/shared';
import { useTranslation } from 'react-i18next';
import { MessageModal } from '../../components/MessageModal';

interface EditOrderModalProps {
  orderId: number;
  mode?: 'full' | 'customer-only';
  onClose: () => void;
  onSuccess: () => void;
}

export const EditOrderModal: React.FC<EditOrderModalProps> = ({ orderId, mode = 'full', onClose, onSuccess }) => {
  const { t } = useTranslation();
  const isCustomerOnly = mode === 'customer-only';
  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<any[]>([]);
  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<User[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);
  const [isEditingCustomer, setIsEditingCustomer] = useState(false);
  const [showCustomerFormModal, setShowCustomerFormModal] = useState(false);
  const [customerFormMode, setCustomerFormMode] = useState<'create' | 'edit'>('create');
  const [customerFormIsCompany, setCustomerFormIsCompany] = useState(false);
  const [customerFormSaving, setCustomerFormSaving] = useState(false);
  const [customerFormError, setCustomerFormError] = useState<string | null>(null);
  const [customerForm, setCustomerForm] = useState({
    first_name: '',
    last_name: '',
    contact_name: '',
    phone: '',
    email: '',
    company_name: '',
    tax_id: '',
    address: '',
    line_id: '',
  });
  const [customerContactChannel, setCustomerContactChannel] = useState<'line' | 'facebook'>('line');
  const [customerContactHandle, setCustomerContactHandle] = useState('');
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const parseStoredLineId = (value: string) => {
    const raw = (value || '').trim();
    const upper = raw.toUpperCase();
    if (upper.startsWith('FB:') || upper.startsWith('FACEBOOK:')) {
      return { channel: 'facebook' as const, handle: raw.replace(/^facebook:/i, '').replace(/^fb:/i, '').trim() };
    }
    return { channel: 'line' as const, handle: raw };
  };

  const buildStoredLineId = (channel: 'line' | 'facebook', handle: string) => {
    const v = (handle || '').trim();
    if (v === '') return '';
    const upper = v.toUpperCase();
    if (upper.startsWith('FB:') || upper.startsWith('FACEBOOK:')) return v;
    if (channel === 'facebook') return `FB:${v}`;
    return v;
  };

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

  // Search customers
  useEffect(() => {
    const delayDebounceFn = setTimeout(async () => {
      if (customerSearchTerm.length > 1) {
        setIsSearchingCustomer(true);
        try {
          const res = await api.get('/customers', { params: { search: customerSearchTerm, per_page: 5 } });
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
      const payload: any = {
        customer_id: selectedCustomer?.id || null,
      };
      if (!isCustomerOnly) {
        payload.items = items.map(item => ({
          product_id: item.product_id,
          quantity: item.quantity,
          price: item.price
        }));
      }
      await api.put(`/orders/${orderId}`, payload);
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      setError(t('orders.update_failed'));
      setSaving(false);
    }
  };

  const openCreateCustomer = () => {
    setCustomerFormMode('create');
    setCustomerFormError(null);
    setCustomerFormIsCompany(false);
    const fullName = customerSearchTerm.trim();
    const parts = fullName.split(/\s+/).filter(Boolean);
    const firstName = parts[0] || '';
    const lastName = parts.slice(1).join(' ') || '';
    setCustomerForm({
      first_name: firstName,
      last_name: lastName,
      contact_name: '',
      phone: '',
      email: '',
      company_name: '',
      tax_id: '',
      address: '',
      line_id: '',
    });
    setCustomerContactChannel('line');
    setCustomerContactHandle('');
    setShowCustomerFormModal(true);
  };

  const openEditCustomer = async () => {
    if (!selectedCustomer?.id) return;
    setCustomerFormMode('edit');
    setCustomerFormError(null);
    setCustomerFormSaving(true);
    setShowCustomerFormModal(true);
    try {
      const res = await api.get(`/customers/${selectedCustomer.id}`);
      const email = typeof res.data.email === 'string' ? res.data.email.trim() : '';
      const emailForForm = email && (email.startsWith('cust_') || email.endsWith('@vendia.local') || email.endsWith('@example.com')) ? '' : email;
      setCustomerForm({
        first_name: res.data.first_name || '',
        last_name: res.data.last_name || '',
        contact_name: res.data.contact_name || '',
        phone: res.data.phone || '',
        email: emailForForm,
        company_name: res.data.company_name || '',
        tax_id: res.data.tax_id || '',
        address: res.data.address || '',
        line_id: res.data.line_id || '',
      });
      const parsed = parseStoredLineId(res.data.line_id || '');
      setCustomerContactChannel(parsed.channel);
      setCustomerContactHandle(parsed.handle);
      setCustomerFormIsCompany(Boolean(res.data.is_company) || (Boolean(res.data.company_name) && (!res.data.first_name && !res.data.last_name)));
    } catch (err) {
      setCustomerFormError(t('customers.fetch_failed', 'โหลดข้อมูลลูกค้าไม่สำเร็จ'));
    } finally {
      setCustomerFormSaving(false);
    }
  };

  const saveCustomerForm = async () => {
    setCustomerFormError(null);
    setCustomerFormSaving(true);
    try {
      if (customerFormMode === 'create') {
        const companyName = customerForm.company_name.trim();
        const firstName = customerForm.first_name.trim();
        const lastName = customerForm.last_name.trim();
        const contactName = customerForm.contact_name.trim();
        const email = customerForm.email.trim();
        const phone = customerForm.phone.trim();
        const taxId = customerForm.tax_id.trim();
        const address = customerForm.address.trim();
        const lineId = buildStoredLineId(customerContactChannel, customerContactHandle);
        const payload = {
          is_company: customerFormIsCompany,
          company_name: companyName === '' ? null : companyName,
          contact_name: contactName === '' ? null : contactName,
          first_name: customerFormIsCompany ? '' : firstName,
          last_name: customerFormIsCompany ? '' : lastName,
          name: (customerFormIsCompany ? companyName : `${firstName} ${lastName}`).trim(),
          email: email === '' ? null : email,
          phone: phone === '' ? null : phone,
          tax_id: taxId === '' ? null : taxId,
          address: address === '' ? null : address,
          line_id: lineId === '' ? null : lineId,
        };
        const created = await api.post('/customers', payload);
        setSelectedCustomer(created.data);
        await api.put(`/orders/${orderId}`, { customer_id: created.data.id });
        onSuccess();
        setShowCustomerFormModal(false);
      } else {
        if (!selectedCustomer?.id) return;
        const companyName = customerForm.company_name.trim();
        const firstName = customerForm.first_name.trim();
        const lastName = customerForm.last_name.trim();
        const contactName = customerForm.contact_name.trim();
        const email = customerForm.email.trim();
        const phone = customerForm.phone.trim();
        const taxId = customerForm.tax_id.trim();
        const address = customerForm.address.trim();
        const lineId = buildStoredLineId(customerContactChannel, customerContactHandle);
        const payload = {
          is_company: customerFormIsCompany,
          company_name: companyName === '' ? null : companyName,
          contact_name: contactName === '' ? null : contactName,
          first_name: customerFormIsCompany ? '' : firstName,
          last_name: customerFormIsCompany ? '' : lastName,
          name: (customerFormIsCompany ? companyName : `${firstName} ${lastName}`).trim(),
          email: email === '' ? null : email,
          phone: phone === '' ? null : phone,
          tax_id: taxId === '' ? null : taxId,
          address: address === '' ? null : address,
          line_id: lineId === '' ? null : lineId,
        };
        const updated = await api.put(`/customers/${selectedCustomer.id}`, payload);
        setSelectedCustomer(updated.data);
        onSuccess();
        setShowCustomerFormModal(false);
      }
    } catch (err: any) {
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join('\n');
        setCustomerFormError(errorMessages);
      } else {
        setCustomerFormError(err.response?.data?.message || t('customers.save_failed', 'บันทึกข้อมูลลูกค้าไม่สำเร็จ'));
      }
    } finally {
      setCustomerFormSaving(false);
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
            <MessageModal
              open={error !== null}
              type="danger"
              title={t('common.error_title', 'ไม่สำเร็จ')}
              message={error || ''}
              okLabel={t('common.ok', 'ตกลง')}
              onClose={() => setError(null)}
            />
            {showCustomerFormModal && (
              <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1060 }} role="dialog">
                <div className="modal-dialog modal-dialog-centered modal-lg">
                  <div className="modal-content">
                    <div className="modal-header">
                      <h5 className="modal-title">
                        {customerFormMode === 'create'
                          ? t('customers.create_title', 'เพิ่มลูกค้า')
                          : t('customers.edit_title', 'แก้ไขลูกค้า')}
                      </h5>
                      <button
                        type="button"
                        className="btn-close"
                        onClick={() => !customerFormSaving && setShowCustomerFormModal(false)}
                      ></button>
                    </div>
                    <div className="modal-body">
                      <MessageModal
                        open={customerFormError !== null}
                        type="danger"
                        title={t('common.error_title', 'ไม่สำเร็จ')}
                        message={customerFormError || ''}
                        okLabel={t('common.ok', 'ตกลง')}
                        onClose={() => setCustomerFormError(null)}
                        zIndex={2100}
                      />
                      <div className="row g-3">
                        <div className="col-12">
                          <div className="form-check form-switch d-flex align-items-center gap-2">
                            <input
                              className="form-check-input"
                              type="checkbox"
                              checked={customerFormIsCompany}
                              onChange={(e) => setCustomerFormIsCompany(e.target.checked)}
                              id="editOrderCustomerIsCompany"
                              disabled={customerFormSaving}
                              style={{ width: '3.25rem', height: '1.75rem' }}
                            />
                            <label className="form-check-label fw-bold fs-5" htmlFor="editOrderCustomerIsCompany">
                              {t('customers.is_company', 'เป็นบริษัท')}
                            </label>
                          </div>
                        </div>
                        {customerFormIsCompany && (
                          <div className="col-12">
                            <label className="form-label fw-bold">{t('customers.company', 'บริษัท')} <span className="text-danger">*</span></label>
                            <input
                              type="text"
                              className="form-control"
                              value={customerForm.company_name}
                              onChange={(e) => setCustomerForm((p) => ({ ...p, company_name: e.target.value }))}
                              disabled={customerFormSaving}
                              required
                            />
                          </div>
                        )}
                        {customerFormIsCompany && (
                          <div className="col-12">
                            <label className="form-label fw-bold">{t('customers.locations.contact_person', 'ผู้ติดต่อ (ถ้ามี)')}</label>
                            <input
                              type="text"
                              className="form-control"
                              value={customerForm.contact_name}
                              onChange={(e) => setCustomerForm((p) => ({ ...p, contact_name: e.target.value }))}
                              disabled={customerFormSaving}
                              placeholder={t('print.customer.attention', 'ผู้ติดต่อ / Attention')}
                            />
                          </div>
                        )}
                        <div className="col-md-6">
                          <label className="form-label fw-bold">{t('customers.first_name', 'ชื่อ')}</label>
                          <input
                            type="text"
                            className="form-control"
                            value={customerForm.first_name}
                            onChange={(e) => setCustomerForm((p) => ({ ...p, first_name: e.target.value }))}
                            disabled={customerFormSaving || customerFormIsCompany}
                            required={!customerFormIsCompany}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">{t('customers.last_name', 'นามสกุล')}</label>
                          <input
                            type="text"
                            className="form-control"
                            value={customerForm.last_name}
                            onChange={(e) => setCustomerForm((p) => ({ ...p, last_name: e.target.value }))}
                            disabled={customerFormSaving || customerFormIsCompany}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">{t('customers.phone', 'เบอร์โทร')}</label>
                          <input
                            type="text"
                            className="form-control"
                            value={customerForm.phone}
                            onChange={(e) => setCustomerForm((p) => ({ ...p, phone: e.target.value }))}
                            disabled={customerFormSaving}
                          />
                        </div>
                        <div className="col-md-6">
                          <label className="form-label fw-bold">{t('customers.email', 'อีเมล')}</label>
                          <input
                            type="email"
                            className="form-control"
                            value={customerForm.email}
                            onChange={(e) => setCustomerForm((p) => ({ ...p, email: e.target.value }))}
                            disabled={customerFormSaving}
                            placeholder={t('customers.email_optional', 'เว้นว่างได้ ระบบจะสร้างให้')}
                          />
                        </div>
                        {!customerFormIsCompany && (
                          <div className="col-md-6">
                            <label className="form-label fw-bold">{t('customers.company', 'บริษัท')}</label>
                            <input
                              type="text"
                              className="form-control"
                              value={customerForm.company_name}
                              onChange={(e) => setCustomerForm((p) => ({ ...p, company_name: e.target.value }))}
                              disabled={customerFormSaving}
                            />
                          </div>
                        )}
                        <div className="col-md-6">
                          <label className="form-label fw-bold">{t('customers.tax_id', 'เลขผู้เสียภาษี')}</label>
                          <input
                            type="text"
                            className="form-control"
                            value={customerForm.tax_id}
                            onChange={(e) => setCustomerForm((p) => ({ ...p, tax_id: e.target.value }))}
                            disabled={customerFormSaving}
                          />
                        </div>
                        <div className="col-md-12">
                          <label className="form-label fw-bold">{t('customers.address', 'ที่อยู่')}</label>
                          <textarea
                            className="form-control"
                            rows={3}
                            value={customerForm.address}
                            onChange={(e) => setCustomerForm((p) => ({ ...p, address: e.target.value }))}
                            disabled={customerFormSaving}
                          />
                        </div>
                        <div className="col-md-4">
                          <label className="form-label fw-bold">{t('customers.contact_channel', 'ช่องทางติดต่อ')}</label>
                          <select
                            className="form-select"
                            value={customerContactChannel}
                            onChange={(e) => setCustomerContactChannel(e.target.value as 'line' | 'facebook')}
                            disabled={customerFormSaving}
                          >
                            <option value="line">LINE</option>
                            <option value="facebook">Facebook</option>
                          </select>
                        </div>
                        <div className="col-md-8">
                          <label className="form-label fw-bold">{t('customers.contact_handle', 'ไอดี/ลิงก์')}</label>
                          <input
                            type="text"
                            className="form-control"
                            value={customerContactHandle}
                            onChange={(e) => setCustomerContactHandle(e.target.value)}
                            disabled={customerFormSaving}
                            placeholder={customerContactChannel === 'facebook' ? t('customers.facebook_placeholder', 'เช่น ชื่อโปรไฟล์ หรือ ลิงก์') : t('customers.line_placeholder', 'เช่น Line ID')}
                          />
                        </div>
                      </div>
                    </div>
                    <div className="modal-footer">
                      <button type="button" className="btn btn-secondary" onClick={() => setShowCustomerFormModal(false)} disabled={customerFormSaving}>
                        {t('common.cancel', 'ยกเลิก')}
                      </button>
                      <button type="button" className="btn btn-primary" onClick={saveCustomerForm} disabled={customerFormSaving}>
                        {customerFormSaving ? t('common.saving', 'กำลังบันทึก...') : t('common.save', 'บันทึก')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
            
            {/* Customer Section */}
            <div className="mb-4">
                <label className="form-label">{t('orders.customer')}</label>
                {!isEditingCustomer ? (
                    <div className="d-flex justify-content-between align-items-center p-2 border rounded">
                        <div>
                            <div className="fw-bold">{selectedCustomer?.company_name || selectedCustomer?.name || t('pos.walk_in')}</div>
                            {selectedCustomer && <div className="small text-muted">{selectedCustomer.phone}</div>}
                        </div>
                        <div className="d-flex gap-2">
                          <button className="btn btn-sm btn-outline-primary" onClick={() => setIsEditingCustomer(true)}>
                              {t('actions.change')}
                          </button>
                          {selectedCustomer ? (
                            <button className="btn btn-sm btn-outline-secondary" onClick={openEditCustomer}>
                              {t('actions.edit', 'แก้ไข')}
                            </button>
                          ) : (
                            <button className="btn btn-sm btn-outline-secondary" onClick={openCreateCustomer}>
                              {t('customers.create_btn', 'เพิ่มลูกค้า')}
                            </button>
                          )}
                        </div>
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
                            <div
                              className="list-group position-absolute shadow"
                              style={{
                                zIndex: 2000,
                                top: '100%',
                                left: 0,
                                right: 0,
                                marginTop: '0.25rem',
                                maxHeight: '240px',
                                overflowY: 'auto',
                                backgroundColor: 'white',
                              }}
                            >
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
                                        <div className="fw-bold">{customer.company_name || customer.name}</div>
                                        <div className="small text-muted">{customer.phone}</div>
                                    </button>
                                ))}
                                <button
                                  type="button"
                                  className="list-group-item list-group-item-action"
                                  onClick={() => {
                                    setIsEditingCustomer(false);
                                    setCustomerSearchResults([]);
                                    openCreateCustomer();
                                  }}
                                >
                                  <div className="fw-bold">{t('customers.create_btn', 'เพิ่มลูกค้า')}</div>
                                  <div className="small text-muted">{t('customers.create_hint', 'สร้างลูกค้าใหม่แล้วผูกกับออเดอร์นี้')}</div>
                                </button>
                            </div>
                        )}
                    </div>
                )}
            </div>

            {!isCustomerOnly ? (
              <div className="row g-3">
                <div className="col-12 col-lg-5">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white fw-bold">{t('pos.search_products')}</div>
                    <div className="card-body">
                      <input
                        type="text"
                        className="form-control"
                        placeholder={t('pos.search_products')}
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        autoFocus
                      />
                      {searchTerm.length > 1 && (
                        <div className="mt-3 border rounded p-2 bg-light">
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
                          <div className="row g-2" style={{ maxHeight: '320px', overflowY: 'auto' }}>
                            {searchResults.map(product => {
                              const coverImage = product.images?.find(img => img.is_cover) || product.images?.[0];
                              const isOutOfStock = product.product_type !== 'service' && product.stock === 0;
                              return (
                                <div key={product.id} className="col-12">
                                  <button
                                    type="button"
                                    className={`card text-start border-0 shadow-sm w-100 ${isOutOfStock ? 'opacity-75' : ''}`}
                                    style={{ cursor: isOutOfStock ? 'not-allowed' : 'pointer' }}
                                    onClick={() => !isOutOfStock && handleAddItem(product)}
                                  >
                                    <div className="row g-0">
                                      <div className="col-4">
                                        <div className="bg-light d-flex align-items-center justify-content-center" style={{ height: '72px', overflow: 'hidden' }}>
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
                                          <div className="d-flex justify-content-between align-items-start gap-2">
                                            <div style={{ minWidth: 0 }}>
                                              <div className="fw-bold text-truncate" title={product.name}>
                                                {product.name}
                                              </div>
                                              <div className="small text-muted text-truncate">{product.sku}</div>
                                            </div>
                                            <span className="badge bg-light text-dark border">
                                              ฿{Number(product.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                            </span>
                                          </div>
                                          <div className="d-flex justify-content-between align-items-center mt-2">
                                            <span className="badge bg-secondary bg-opacity-25 text-dark">
                                              {product.product_type === 'service' ? t('pos.services') : t('pos.products')}
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
                  </div>
                </div>

                <div className="col-12 col-lg-7">
                  <div className="card border-0 shadow-sm">
                    <div className="card-header bg-white d-flex justify-content-between align-items-center">
                      <div className="fw-bold">{t('orders.order_items_breakdown')}</div>
                      <div className="small text-muted">
                        {items.length} {t('orders.items')}
                      </div>
                    </div>
                    <div className="card-body" style={{ maxHeight: '520px', overflowY: 'auto' }}>
                      {items.map((item) => {
                        const lineTotal = item.price * item.quantity;
                        return (
                          <div key={item.product_id} className="card border-0 shadow-sm mb-2">
                            <div className="card-body py-2">
                              <div className="d-flex justify-content-between align-items-start gap-2">
                                <div style={{ minWidth: 0 }}>
                                  <div className="fw-bold text-truncate" title={item.product?.name || 'Unknown'}>
                                    {item.product?.name || 'Unknown'}
                                  </div>
                                  <div className="small text-muted text-truncate">{item.product?.sku}</div>
                                </div>
                                <button
                                  type="button"
                                  className="btn btn-sm btn-outline-danger"
                                  onClick={() => handleRemoveItem(item.product_id)}
                                >
                                  <i className="bi bi-trash"></i>
                                </button>
                              </div>

                              <div className="row g-2 align-items-end mt-2">
                                <div className="col-12 col-md-4">
                                  <label className="form-label small text-muted mb-1">{t('orders.price')}</label>
                                  <div className="input-group input-group-sm">
                                    <span className="input-group-text">฿</span>
                                    <input
                                      type="number"
                                      className="form-control"
                                      value={item.price}
                                      onChange={(e) => handleUpdateItem(item.product_id, 'price', parseFloat(e.target.value) || 0)}
                                    />
                                  </div>
                                </div>
                                <div className="col-12 col-md-4">
                                  <label className="form-label small text-muted mb-1">{t('orders.qty')}</label>
                                  <div className="input-group input-group-sm">
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() => handleUpdateItem(item.product_id, 'quantity', Math.max(1, (item.quantity || 1) - 1))}
                                    >
                                      -
                                    </button>
                                    <input
                                      type="number"
                                      className="form-control text-center"
                                      value={item.quantity}
                                      min={1}
                                      onChange={(e) => handleUpdateItem(item.product_id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                                    />
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary"
                                      onClick={() => handleUpdateItem(item.product_id, 'quantity', (item.quantity || 1) + 1)}
                                    >
                                      +
                                    </button>
                                  </div>
                                </div>
                                <div className="col-12 col-md-4 text-md-end">
                                  <label className="form-label small text-muted mb-1">{t('orders.subtotal')}</label>
                                  <div className="fw-bold">
                                    ฿{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {items.length === 0 && (
                        <div className="text-center text-muted py-5">{t('pos.cart_empty')}</div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white fw-bold">{t('orders.customer', 'ลูกค้า')}</div>
                <div className="card-body text-muted small">
                  {t('orders.edit_customer', 'แก้ลูกค้า')}
                </div>
              </div>
            )}

          </div>
          <div className="modal-footer d-flex justify-content-between align-items-center">
            <div className="fw-bold">
              {t('orders.total')}:{' '}
              <span className="text-primary">
                ฿{items.reduce((sum, item) => sum + (item.price * item.quantity), 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="d-flex gap-2">
              <button type="button" className="btn btn-secondary" onClick={onClose}>{t('common.cancel')}</button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSave}
                disabled={saving || (!isCustomerOnly && items.length === 0)}
              >
                {saving ? t('common.saving', 'กำลังบันทึก...') : t('common.save', 'บันทึก')}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
