import React, { useEffect, useMemo, useState } from 'react';
import { api, Product, User } from '@vendia/shared';
import { useTranslation } from 'react-i18next';
import { MessageModal } from '../../components/MessageModal';

type TaxMode = 'none' | 'exclusive' | 'inclusive';

interface AmendReceiptModalProps {
  orderId: number;
  onClose: () => void;
  onSuccess: () => void;
}

interface AmendItem {
  product_id: number;
  product: any;
  quantity: number;
  price: number;
}

const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

const formatMoney = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

export const AmendReceiptModal: React.FC<AmendReceiptModalProps> = ({ orderId, onClose, onSuccess }) => {
  const { t } = useTranslation();

  const [loading, setLoading] = useState(true);
  const [items, setItems] = useState<AmendItem[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [isSearching, setIsSearching] = useState(false);

  const [selectedCustomer, setSelectedCustomer] = useState<User | null>(null);
  const [customerSearchTerm, setCustomerSearchTerm] = useState('');
  const [customerSearchResults, setCustomerSearchResults] = useState<User[]>([]);
  const [isSearchingCustomer, setIsSearchingCustomer] = useState(false);

  const [taxMode, setTaxMode] = useState<TaxMode>('none');
  const [withholdingRate, setWithholdingRate] = useState<number>(0);

  const [docCustomerName, setDocCustomerName] = useState('');
  const [docCustomerAddress, setDocCustomerAddress] = useState('');
  const [docCustomerAttention, setDocCustomerAttention] = useState('');
  const [docRemarks, setDocRemarks] = useState('');

  const [receiptNumber, setReceiptNumber] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const normalizeTaxMode = (mode?: string | null, vatRate?: string | number | null): TaxMode => {
    if (mode === 'none' || mode === 'exclusive' || mode === 'inclusive') return mode;
    return Number(vatRate ?? 0) > 0 ? 'exclusive' : 'none';
  };

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await api.get(`/orders/${orderId}`);
        const order = res.data;
        setItems((order.items || []).map((item: any) => ({
          product_id: item.product_id,
          product: item.product,
          quantity: item.quantity,
          price: parseFloat(item.price),
        })));
        setSelectedCustomer(order.customer || null);
        setTaxMode(normalizeTaxMode(order.tax_mode, order.vat_rate));
        setWithholdingRate(Number(order.withholding_rate ?? 0));
        setReceiptNumber(order.receipt_number || '');
        const activeDoc = (order.documents || []).find(
          (d: any) => d.type === 'receipt' && d.number === order.receipt_number && d.status === 'active'
        );
        if (activeDoc) {
          setDocCustomerName(activeDoc.customer_name || '');
          setDocCustomerAddress(activeDoc.customer_address || '');
          setDocCustomerAttention(activeDoc.customer_attention || '');
          setDocRemarks(activeDoc.remarks || '');
        }
        setLoading(false);
      } catch (err) {
        console.error(err);
        setError(t('orders.fetch_failed', 'ไม่สามารถดึงข้อมูลออเดอร์ได้'));
        setLoading(false);
      }
    };
    fetchOrder();
  }, [orderId, t]);

  useEffect(() => {
    const timer = setTimeout(async () => {
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
    return () => clearTimeout(timer);
  }, [searchTerm]);

  useEffect(() => {
    const timer = setTimeout(async () => {
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
    return () => clearTimeout(timer);
  }, [customerSearchTerm]);

  const addItem = (product: Product) => {
    const existing = items.find(i => i.product_id === product.id);
    if (existing) {
      setItems(items.map(i => i.product_id === product.id ? { ...i, quantity: i.quantity + 1 } : i));
    } else {
      setItems([...items, {
        product_id: product.id,
        product,
        quantity: 1,
        price: parseFloat(product.price.toString()),
      }]);
    }
    setSearchTerm('');
    setSearchResults([]);
  };

  const updateItem = (productId: number, field: 'quantity' | 'price', value: number) => {
    setItems(items.map(i => i.product_id === productId ? { ...i, [field]: value } : i));
  };

  const removeItem = (productId: number) => {
    setItems(items.filter(i => i.product_id !== productId));
  };

  const summary = useMemo(() => {
    const raw = round2(items.reduce((sum, i) => sum + (i.price * i.quantity), 0));
    const vatRate = taxMode === 'none' ? 0 : 7;
    let subtotal = raw;
    let vatAmount = 0;
    let total = raw;
    if (taxMode === 'exclusive') {
      vatAmount = round2(raw * vatRate / 100);
      total = round2(raw + vatAmount);
    } else if (taxMode === 'inclusive') {
      subtotal = round2(raw / (1 + vatRate / 100));
      vatAmount = round2(raw - subtotal);
      total = raw;
    }
    const withholdingAmount = round2(subtotal * (withholdingRate / 100));
    return { subtotal, vatRate, vatAmount, withholdingAmount, total };
  }, [items, taxMode, withholdingRate]);

  const handleSave = async () => {
    if (items.length === 0) {
      setError(t('orders.amend_no_items', 'ต้องมีรายการสินค้าอย่างน้อย 1 รายการ'));
      return;
    }
    setSaving(true);
    setError(null);
    try {
      await api.post(`/orders/${orderId}/amend`, {
        items: items.map(i => ({
          product_id: i.product_id,
          quantity: i.quantity,
          price: i.price,
        })),
        tax_mode: taxMode,
        vat_rate: taxMode === 'none' ? 0 : 7,
        withholding_rate: withholdingRate,
        customer_id: selectedCustomer?.id ?? null,
        document: {
          customer_name: docCustomerName.trim() === '' ? null : docCustomerName.trim(),
          customer_address: docCustomerAddress.trim() === '' ? null : docCustomerAddress.trim(),
          customer_attention: docCustomerAttention.trim() === '' ? null : docCustomerAttention.trim(),
          remarks: docRemarks.trim() === '' ? null : docRemarks.trim(),
        },
      });
      onSuccess();
      onClose();
    } catch (err: any) {
      console.error(err);
      setError(err?.response?.data?.message || t('orders.update_failed', 'บันทึกไม่สำเร็จ'));
      setSaving(false);
    }
  };

  if (loading) {
    return (
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
  }

  return (
    <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
      <div className="modal-dialog modal-lg modal-dialog-scrollable">
        <div className="modal-content">
          <div className="modal-header">
            <h5 className="modal-title">
              {t('orders.amend_title', 'แก้ไขบิล')} <span className="font-monospace">{receiptNumber}</span>
            </h5>
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

            <div className="alert alert-warning small">
              {t('orders.amend_warning', 'การแก้บิลจะเปลี่ยนข้อมูลบนใบเสร็จฉบับนี้ทันที กรุณาตรวจสอบให้ถูกต้อง')}
            </div>

            {/* รายการสินค้า */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-white fw-bold">{t('orders.items', 'รายการสินค้า')}</div>
              <div className="card-body">
                {items.map((item) => (
                  <div key={item.product_id} className="d-flex align-items-center gap-2 mb-2 border-bottom pb-2">
                    <div className="flex-grow-1" style={{ minWidth: 0 }}>
                      <div className="fw-bold text-truncate">{item.product?.name || `#${item.product_id}`}</div>
                      <div className="text-muted small">{item.product?.sku}</div>
                    </div>
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ width: '80px' }}
                      value={item.price}
                      step="0.01"
                      onChange={(e) => updateItem(item.product_id, 'price', parseFloat(e.target.value) || 0)}
                    />
                    <input
                      type="number"
                      className="form-control form-control-sm"
                      style={{ width: '70px' }}
                      value={item.quantity}
                      min={1}
                      onChange={(e) => updateItem(item.product_id, 'quantity', Math.max(1, parseInt(e.target.value) || 1))}
                    />
                    <div className="fw-bold" style={{ width: '100px', textAlign: 'right' }}>
                      ฿{formatMoney(item.price * item.quantity)}
                    </div>
                    <button
                      type="button"
                      className="btn btn-outline-danger btn-sm"
                      onClick={() => removeItem(item.product_id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                ))}
                {items.length === 0 && (
                  <div className="text-center text-muted py-3">{t('pos.cart_empty', 'ยังไม่มีรายการ')}</div>
                )}

                <div className="mt-2">
                  <input
                    type="text"
                    className="form-control"
                    placeholder={t('pos.search_product_placeholder', 'ค้นหาสินค้า...')}
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                  {isSearching && <div className="text-muted small mt-1">{t('common.loading', 'กำลังโหลด...')}</div>}
                  {searchResults.length > 0 && (
                    <div className="list-group mt-1" style={{ maxHeight: '200px', overflowY: 'auto' }}>
                      {searchResults.map((p) => (
                        <button
                          key={p.id}
                          type="button"
                          className="list-group-item list-group-item-action d-flex justify-content-between"
                          onClick={() => addItem(p)}
                        >
                          <span>{p.name}</span>
                          <span className="text-muted">฿{formatMoney(parseFloat(p.price.toString()))}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>

            {/* ภาษี */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-white fw-bold">{t('orders.vat', 'VAT')}</div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold">{t('orders.vat', 'VAT')}</label>
                    <select
                      className="form-select"
                      value={taxMode}
                      onChange={(e) => setTaxMode(e.target.value as TaxMode)}
                    >
                      <option value="none">{t('pos.vat_none', 'ไม่คิด VAT')}</option>
                      <option value="exclusive">{t('pos.vat_exclusive', 'บวก VAT 7%')}</option>
                      <option value="inclusive">{t('pos.vat_inclusive', 'รวม VAT 7% แล้ว')}</option>
                    </select>
                  </div>
                  <div className="col-12 col-md-6">
                    <label className="form-label fw-bold">{t('pos.withholding', 'หัก ณ ที่จ่าย')}</label>
                    <select
                      className="form-select"
                      value={withholdingRate}
                      onChange={(e) => setWithholdingRate(Number(e.target.value))}
                    >
                      <option value={0}>{t('pos.withholding_none', 'ไม่หัก')}</option>
                      <option value={3}>3%</option>
                      <option value={7}>7%</option>
                    </select>
                  </div>
                </div>
              </div>
            </div>

            {/* ลูกค้า */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-white fw-bold">{t('orders.customer', 'ลูกค้า')}</div>
              <div className="card-body">
                <div className="mb-2">
                  {selectedCustomer ? (
                    <div className="d-flex justify-content-between align-items-center">
                      <span className="fw-bold">{selectedCustomer.company_name || selectedCustomer.name}</span>
                      <button type="button" className="btn btn-outline-secondary btn-sm" onClick={() => setSelectedCustomer(null)}>
                        {t('actions.change', 'เปลี่ยน')}
                      </button>
                    </div>
                  ) : (
                    <div className="text-muted small">{t('orders.no_customer', 'ไม่ระบุลูกค้า')}</div>
                  )}
                </div>
                <input
                  type="text"
                  className="form-control"
                  placeholder={t('orders.search_customer', 'ค้นหาลูกค้า...')}
                  value={customerSearchTerm}
                  onChange={(e) => setCustomerSearchTerm(e.target.value)}
                />
                {isSearchingCustomer && <div className="text-muted small mt-1">{t('common.loading', 'กำลังโหลด...')}</div>}
                {customerSearchResults.length > 0 && (
                  <div className="list-group mt-1">
                    {customerSearchResults.map((c) => (
                      <button
                        key={c.id}
                        type="button"
                        className="list-group-item list-group-item-action"
                        onClick={() => {
                          setSelectedCustomer(c);
                          setCustomerSearchTerm('');
                          setCustomerSearchResults([]);
                        }}
                      >
                        {c.company_name || c.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ข้อมูลบนหัวบิล */}
            <div className="card border-0 shadow-sm mb-3">
              <div className="card-header bg-white fw-bold">{t('orders.document_info', 'ข้อมูลบนใบเสร็จ')}</div>
              <div className="card-body">
                <div className="mb-2">
                  <label className="form-label">{t('print.document.customer_name', 'ชื่อลูกค้า')}</label>
                  <input className="form-control" value={docCustomerName} onChange={(e) => setDocCustomerName(e.target.value)} />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('orders.attention', 'เรียน / ผู้ติดต่อ')}</label>
                  <input className="form-control" value={docCustomerAttention} onChange={(e) => setDocCustomerAttention(e.target.value)} />
                </div>
                <div className="mb-2">
                  <label className="form-label">{t('customers.address', 'ที่อยู่')}</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={docCustomerAddress}
                    onChange={(e) => setDocCustomerAddress(e.target.value)}
                  />
                </div>
                <div>
                  <label className="form-label">{t('print.footer.remarks', 'หมายเหตุ')}</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={docRemarks}
                    onChange={(e) => setDocRemarks(e.target.value)}
                  />
                </div>
              </div>
            </div>

            {/* สรุปยอด */}
            <div className="card border-0 shadow-sm">
              <div className="card-body">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">{t('pos.subtotal_before_tax', 'ยอดก่อนภาษี')}</span>
                  <span>฿{formatMoney(summary.subtotal)}</span>
                </div>
                <div className="d-flex justify-content-between">
                  <span className="text-muted">{t('orders.vat', 'VAT')} ({summary.vatRate}%)</span>
                  <span>฿{formatMoney(summary.vatAmount)}</span>
                </div>
                {withholdingRate > 0 && (
                  <div className="d-flex justify-content-between">
                    <span className="text-muted">{t('pos.withholding', 'หัก ณ ที่จ่าย')} ({withholdingRate}%)</span>
                    <span>-฿{formatMoney(summary.withholdingAmount)}</span>
                  </div>
                )}
                <hr className="my-2" />
                <div className="d-flex justify-content-between fw-bold fs-5">
                  <span>{t('orders.total', 'ยอดรวม')}</span>
                  <span className="text-primary">฿{formatMoney(summary.total)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="modal-footer">
            <button type="button" className="btn btn-secondary" onClick={onClose} disabled={saving}>
              {t('common.cancel', 'ยกเลิก')}
            </button>
            <button type="button" className="btn btn-primary" onClick={handleSave} disabled={saving}>
              {saving ? t('common.saving', 'กำลังบันทึก...') : t('common.save', 'บันทึก')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
