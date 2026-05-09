import React, { useEffect, useMemo, useRef, useState } from 'react';
import { api, useAuthStore } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageModal } from '../../components/MessageModal';
import { ConfirmModal } from '../../components/ConfirmModal';
import { EditOrderModal } from './EditOrderModal';

interface BundleItemSnapshot {
  id: number;
  name: string;
  sku: string;
  quantity_per_bundle: number;
  total_quantity_deducted: number;
  price_at_sale: number;
}

interface OrderItem {
  id: number;
  product_id: number;
  product: {
    name: string;
    sku: string;
  };
  quantity: number;
  price: number;
  metadata?: {
    bundle_items?: BundleItemSnapshot[];
  };
}

interface Document {
  id: number;
  type: string;
  number: string;
  status: string;
  created_at: string;
}

interface Order {
  id: number;
  total: string;
  subtotal?: string;
  vat_rate?: string;
  vat_amount?: string;
  withholding_rate?: string;
  withholding_amount?: string;
  status: string;
  payment_method: string;
  created_at: string;
  appointments_count?: number;
  quotation_number?: string;
  quotation_status?: string;
  billing_note_number?: string;
  billing_note_status?: string;
  receipt_number?: string;
  receipt_status?: string;
  user?: {
    name: string;
    id?: number;
  };
  customer?: {
    id: number;
    name: string;
    company_name?: string | null;
    phone?: string | null;
    email?: string | null;
    tax_id?: string | null;
    address?: string | null;
    contact_name?: string | null;
    line_id?: string | null;
  };
  items: OrderItem[];
  documents?: Document[];
}

export const OrderDetail = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const user = useAuthStore((s) => s.user);
  const [order, setOrder] = useState<Order | null>(null);
  const [loading, setLoading] = useState(true);
  const [uiMessage, setUiMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | null
    | { kind: 'cancel-document'; docType: 'quotation' | 'billing_note' | 'receipt'; number: string }
    | { kind: 'convert-quotation' }
    | { kind: 'cancel-order' }
    | { kind: 'mark-unpaid' }
    | { kind: 'purge-order' }
    | { kind: 'delete-order' }
  >(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [editingMode, setEditingMode] = useState<null | 'full' | 'customer-only'>(null);

  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [change, setChange] = useState<number | null>(null);
  const [applyVat, setApplyVat] = useState(false);
  const [withholdingRate, setWithholdingRate] = useState<0 | 3 | 7>(0);
  const [moreMenuOpen, setMoreMenuOpen] = useState(false);
  const moreMenuRef = useRef<HTMLDivElement | null>(null);

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  const formatDateTime = (iso: string) => {
    const d = new Date(iso);
    const date = new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(d);
    const time = new Intl.DateTimeFormat('th-TH', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
    return { date, time };
  };

  const formatOrderDateTime = (iso: string) => {
    const d = new Date(iso);
    return new Intl.DateTimeFormat('th-TH', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }).format(d);
  };

  const fetchOrder = async () => {
    if (!id) return;
    setLoading(true);
    try {
      const res = await api.get(`/orders/${id}`);
      setOrder(res.data);
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setUiMessage({ type: 'danger', text: t('orders.fetch_failed', 'ไม่สามารถดึงข้อมูลออเดอร์ได้') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    if (!order) return;
    if (!showPaymentModal) return;
    if (paymentMethod !== 'cash') {
      setChange(null);
      return;
    }
    if (!receivedAmount) {
      setChange(null);
      return;
    }
    const received = parseFloat(receivedAmount);
    const subtotal = parseFloat(order.subtotal ?? order.total);
    const vatAmount = applyVat ? round2(subtotal * 0.07) : 0;
    const withholdingAmount = round2(subtotal * (withholdingRate / 100));
    const payable = round2(subtotal + vatAmount - withholdingAmount);
    setChange(received - payable);
  }, [receivedAmount, paymentMethod, order, applyVat, withholdingRate, showPaymentModal]);

  useEffect(() => {
    if (!moreMenuOpen) return;
    const handleClickOutside = (e: MouseEvent) => {
      if (!moreMenuRef.current) return;
      if (e.target instanceof Node && moreMenuRef.current.contains(e.target)) return;
      setMoreMenuOpen(false);
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [moreMenuOpen]);

  const getDocumentHistory = (o: Order, type: 'quotation' | 'billing_note' | 'receipt') => {
    const docs = (o.documents || []).filter(d => d.type === type);
    const currentNumber =
      type === 'quotation'
        ? o.quotation_number
        : type === 'billing_note'
          ? o.billing_note_number
          : o.receipt_number;
    const currentStatus =
      type === 'quotation'
        ? o.quotation_status
        : type === 'billing_note'
          ? o.billing_note_status
          : o.receipt_status;

    if (!currentNumber || docs.some(d => d.number === currentNumber)) return docs;

    return [
      {
        id: -o.id * 10 - (type === 'quotation' ? 1 : type === 'billing_note' ? 2 : 3),
        type,
        number: currentNumber,
        status: currentStatus || 'active',
        created_at: o.created_at,
      },
      ...docs,
    ];
  };

  const handlePrint = (o: Order, type: 'receipt' | 'quotation' | 'billing_note') => {
    const currentNumber =
      type === 'quotation'
        ? o.quotation_number
        : type === 'billing_note'
          ? o.billing_note_number
          : o.receipt_number;

    const docId = o.documents?.find((d) => d.type === type && d.number === currentNumber)?.id;
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('edit', '1');
    if (docId) params.set('doc_id', String(docId));
    window.open(`/print/order/${o.id}?${params.toString()}`, '_blank');
  };

  const handleIssueDocument = async (orderId: number, type: 'quotation' | 'billing_note' | 'receipt') => {
    try {
      await api.post(`/orders/${orderId}/issue-document`, { type });
      await fetchOrder();
      setUiMessage({ type: 'success', text: t('orders.update_success') });
    } catch (error) {
      console.error('Failed to issue document:', error);
      setUiMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const handleCancelDocument = async (orderId: number, type: 'quotation' | 'billing_note' | 'receipt') => {
    try {
      await api.post(`/orders/${orderId}/cancel-document`, { type });
      await fetchOrder();
      setUiMessage({ type: 'success', text: t('orders.update_success') });
    } catch (error) {
      console.error('Failed to cancel document:', error);
      setUiMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const handleConvertQuotation = async () => {
    if (!order) return;
    try {
      await api.put(`/orders/${order.id}`, { status: 'pending' });
      await fetchOrder();
      setUiMessage({ type: 'success', text: t('orders.update_success') });
    } catch (error) {
      console.error('Failed to convert quotation:', error);
      setUiMessage({ type: 'danger', text: t('orders.convert_failed', 'แปลงใบเสนอราคาไม่สำเร็จ') });
    }
  };

  const handleCancelOrder = async () => {
    if (!order) return;
    try {
      await api.put(`/orders/${order.id}`, { status: 'cancelled' });
      await fetchOrder();
      setUiMessage({ type: 'success', text: t('orders.update_success') });
    } catch (error) {
      console.error('Failed to cancel order:', error);
      setUiMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const handleMarkUnpaid = async () => {
    if (!order) return;
    try {
      await api.put(`/orders/${order.id}`, { status: 'pending' });
      await fetchOrder();
      setUiMessage({ type: 'success', text: t('orders.update_success') });
    } catch (error) {
      console.error('Failed to mark unpaid:', error);
      setUiMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const handlePurgeOrder = async () => {
    if (!order) return;
    try {
      await api.post(`/orders/${order.id}/purge`);
      await fetchOrder();
      setUiMessage({ type: 'success', text: t('orders.update_success') });
    } catch (error) {
      console.error('Failed to purge order:', error);
      setUiMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const handleDeleteOrder = async () => {
    if (!order) return;
    try {
      await api.delete(`/orders/${order.id}`);
      setUiMessage({ type: 'success', text: t('orders.update_success') });
      navigate('/orders');
    } catch (error) {
      console.error('Failed to delete order:', error);
      setUiMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const openPayment = () => {
    if (!order) return;
    setReceivedAmount('');
    setPaymentMethod('cash');
    setChange(null);
    setApplyVat(Number(order.vat_rate || 0) > 0);
    setWithholdingRate((Number(order.withholding_rate || 0) as 0 | 3 | 7) || 0);
    setShowPaymentModal(true);
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      await api.put(`/orders/${order.id}`, {
        status: 'completed',
        payment_method: paymentMethod,
        apply_vat: applyVat,
        withholding_rate: withholdingRate,
      });
      await fetchOrder();
      setShowPaymentModal(false);
      setUiMessage({ type: 'success', text: t('orders.payment_success') });
    } catch (error) {
      console.error('Payment failed:', error);
      setUiMessage({ type: 'danger', text: t('orders.payment_failed') });
    }
  };

  const customerName = order?.customer?.company_name || order?.customer?.name || t('pos.walk_in');
  const customer = order?.customer;

  if (loading) return <div className="p-4 text-center">{t('common.loading')}</div>;
  if (!order) return <div className="p-4 text-center text-muted">{t('orders.not_found', 'ไม่พบออเดอร์')}</div>;

  return (
    <div className="container-fluid p-2 p-md-4">
      <MessageModal
        open={uiMessage !== null}
        type={uiMessage?.type || 'danger'}
        title={uiMessage?.type === 'success' ? t('common.success_title', 'สำเร็จ') : t('common.error_title', 'ไม่สำเร็จ')}
        message={uiMessage?.text || ''}
        okLabel={t('common.ok', 'ตกลง')}
        onClose={() => setUiMessage(null)}
      />
      <ConfirmModal
        open={confirmAction !== null}
        title={t('common.confirm_title', 'ยืนยัน')}
        message={
          !confirmAction
            ? ''
            : confirmAction.kind === 'cancel-document'
              ? t('orders.confirm_cancel_document', { number: confirmAction.number })
              : confirmAction.kind === 'convert-quotation'
                ? t('orders.confirm_convert_quotation')
                : confirmAction.kind === 'mark-unpaid'
                  ? t('orders.confirm_mark_unpaid', 'ต้องการเปลี่ยนสถานะการจ่ายเงินเป็น "รอชำระ" ใช่ไหม?')
                  : confirmAction.kind === 'purge-order'
                    ? t('orders.confirm_purge_order', 'ต้องการยกเลิกเอกสารทั้งหมดและลบออเดอร์นี้ถาวรใช่ไหม? (กู้คืนไม่ได้)')
                    : confirmAction.kind === 'delete-order'
                      ? t('orders.confirm_delete_order', 'ต้องการลบออเดอร์นี้ออกจากระบบถาวรใช่ไหม? (ลบแล้วกู้คืนไม่ได้)')
                      : t('orders.confirm_cancel_order')
        }
        confirmLabel={t('common.confirm', 'ยืนยัน')}
        cancelLabel={t('common.cancel', 'ยกเลิก')}
        confirmVariant="danger"
        busy={confirmBusy}
        onCancel={() => setConfirmAction(null)}
        onConfirm={async () => {
          if (!confirmAction) return;
          setConfirmBusy(true);
          try {
            if (confirmAction.kind === 'cancel-document') {
              await handleCancelDocument(order.id, confirmAction.docType);
            } else if (confirmAction.kind === 'convert-quotation') {
              await handleConvertQuotation();
            } else if (confirmAction.kind === 'mark-unpaid') {
              await handleMarkUnpaid();
            } else if (confirmAction.kind === 'purge-order') {
              await handlePurgeOrder();
            } else if (confirmAction.kind === 'delete-order') {
              await handleDeleteOrder();
            } else {
              await handleCancelOrder();
            }
          } finally {
            setConfirmBusy(false);
            setConfirmAction(null);
          }
        }}
      />

      {editingMode && (
        <EditOrderModal
          orderId={order.id}
          mode={editingMode}
          onClose={() => setEditingMode(null)}
          onSuccess={async () => {
            setEditingMode(null);
            await fetchOrder();
            setUiMessage({ type: 'success', text: t('orders.update_success') });
          }}
        />
      )}

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-3 mb-md-4">
        <div className="w-100">
          <div className="d-flex justify-content-between align-items-start gap-2">
            <div className="d-flex align-items-center gap-2" style={{ minWidth: 0 }}>
              <button className="btn btn-outline-secondary" onClick={() => navigate('/orders')}>
                <i className="bi bi-arrow-left"></i> {t('common.back', 'ย้อนกลับ')}
              </button>
              <div style={{ minWidth: 0 }}>
                <div className="d-flex align-items-center gap-2">
                  <h2 className="m-0">{t('orders.order_no', 'เลขที่คำสั่งซื้อ')} #{order.id}</h2>
                  <span className={`badge bg-${
                    order.status === 'completed' ? 'success' :
                    order.status === 'pending' ? 'warning' :
                    order.status === 'quotation' ? 'info' : 'danger'
                  }`}>
                    {t(`status.${order.status}`)}
                  </span>
                </div>
                <div className="text-muted small mt-1">
                  <span className="me-2">{t('orders.ordered_at', 'วันที่สั่งซื้อ')}: {formatOrderDateTime(order.created_at)}</span>
                  {order.user?.name && <span>{t('orders.staff')}: {order.user.name}</span>}
                </div>
              </div>
            </div>
            <div className="text-end">
              <div className="fw-bold fs-5">
                ฿{parseFloat(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="d-block d-md-none mb-3">
        <div className="d-grid gap-2">
          {order.status === 'pending' && (
            <button className="btn btn-success btn-lg" onClick={openPayment}>
              {t('orders.pay_now')}
            </button>
          )}
          {order.status === 'quotation' && (
            <button className="btn btn-success btn-lg" onClick={() => setConfirmAction({ kind: 'convert-quotation' })}>
              {t('orders.to_order')}
            </button>
          )}
          {(order.appointments_count || 0) === 0 && (
            <button
              className="btn btn-primary"
              onClick={() => navigate(`/appointments/create?order_id=${order.id}&customer_id=${order.customer?.id}`)}
            >
              {t('orders.create_appt')}
            </button>
          )}
        </div>
        <div className="d-flex justify-content-end mt-2">
          <div className="dropdown" ref={moreMenuRef}>
            <button
              className="btn btn-outline-secondary dropdown-toggle"
              type="button"
              aria-expanded={moreMenuOpen ? 'true' : 'false'}
              onClick={() => setMoreMenuOpen(v => !v)}
            >
              {t('common.more', 'เพิ่มเติม')}
            </button>
            <ul className={`dropdown-menu${moreMenuOpen ? ' show' : ''}`}>
              {(order.status === 'pending' || order.status === 'quotation') && (
                <li>
                  <button
                    className="dropdown-item text-danger"
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setConfirmAction({ kind: 'cancel-order' });
                    }}
                  >
                    {t('common.cancel')}
                  </button>
                </li>
              )}
              {user?.role === 'admin' && order.status === 'completed' && (!order.receipt_number || order.receipt_status === 'cancelled') && (
                <li>
                  <button
                    className="dropdown-item"
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setConfirmAction({ kind: 'mark-unpaid' });
                    }}
                  >
                    {t('orders.mark_unpaid', 'ตั้งเป็นรอชำระ')}
                  </button>
                </li>
              )}
              {user?.role === 'admin' && (order.appointments_count || 0) === 0 && (
                <li>
                  <button
                    className="dropdown-item text-danger"
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setConfirmAction({ kind: 'purge-order' });
                    }}
                  >
                    {t('orders.delete_permanent', 'ลบถาวร')}
                  </button>
                </li>
              )}
              {user?.role === 'admin' && order.status === 'cancelled' && (
                <li>
                  <button
                    className="dropdown-item text-danger"
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setConfirmAction({ kind: 'delete-order' });
                    }}
                  >
                    {t('actions.delete', 'ลบ')}
                  </button>
                </li>
              )}
            </ul>
          </div>
        </div>
      </div>

      <div className="d-none d-md-flex flex-wrap gap-2 mb-4">
        {order.status === 'pending' && (
          <button className="btn btn-success" onClick={openPayment}>
            {t('orders.pay_now')}
          </button>
        )}
        {order.status === 'quotation' && (
          <button className="btn btn-success" onClick={() => setConfirmAction({ kind: 'convert-quotation' })}>
            {t('orders.to_order')}
          </button>
        )}
        {(order.appointments_count || 0) === 0 && (
          <button
            className="btn btn-primary"
            onClick={() => navigate(`/appointments/create?order_id=${order.id}&customer_id=${order.customer?.id}`)}
          >
            {t('orders.create_appt')}
          </button>
        )}
        <div className="dropdown" ref={moreMenuRef}>
          <button
            className="btn btn-outline-secondary dropdown-toggle"
            type="button"
            aria-expanded={moreMenuOpen ? 'true' : 'false'}
            onClick={() => setMoreMenuOpen(v => !v)}
          >
            {t('common.more', 'เพิ่มเติม')}
          </button>
          <ul className={`dropdown-menu${moreMenuOpen ? ' show' : ''}`}>
            {(order.status === 'pending' || order.status === 'quotation') && (
              <li>
                <button
                  className="dropdown-item text-danger"
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirmAction({ kind: 'cancel-order' });
                  }}
                >
                  {t('common.cancel')}
                </button>
              </li>
            )}
            {user?.role === 'admin' && order.status === 'completed' && (!order.receipt_number || order.receipt_status === 'cancelled') && (
              <li>
                <button
                  className="dropdown-item"
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirmAction({ kind: 'mark-unpaid' });
                  }}
                >
                  {t('orders.mark_unpaid', 'ตั้งเป็นรอชำระ')}
                </button>
              </li>
            )}
            {user?.role === 'admin' && (order.appointments_count || 0) === 0 && (
              <li>
                <button
                  className="dropdown-item text-danger"
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirmAction({ kind: 'purge-order' });
                  }}
                >
                  {t('orders.delete_permanent', 'ลบถาวร')}
                </button>
              </li>
            )}
            {user?.role === 'admin' && order.status === 'cancelled' && (
              <li>
                <button
                  className="dropdown-item text-danger"
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirmAction({ kind: 'delete-order' });
                  }}
                >
                  {t('actions.delete', 'ลบ')}
                </button>
              </li>
            )}
          </ul>
        </div>
      </div>

      {showPaymentModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('orders.pay_for_order', { id: order.id })}</h5>
                <button type="button" className="btn-close" onClick={() => setShowPaymentModal(false)}></button>
              </div>
              <form onSubmit={processPayment}>
                <div className="modal-body">
                  <div className="text-center mb-4">
                    <div className="text-muted mb-1">{t('orders.total')}</div>
                    <div className="display-4 fw-bold text-primary">
                      ฿{(() => {
                        const subtotal = parseFloat(order.subtotal ?? order.total);
                        const vatAmount = applyVat ? round2(subtotal * 0.07) : 0;
                        const withholdingAmount = round2(subtotal * (withholdingRate / 100));
                        const payable = round2(subtotal + vatAmount - withholdingAmount);
                        return payable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
                      })()}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('pos.payment_method')}</label>
                    <div className="btn-group w-100" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="paymentMethodDetail"
                        id="cashDetail"
                        autoComplete="off"
                        checked={paymentMethod === 'cash'}
                        onChange={() => setPaymentMethod('cash')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="cashDetail">{t('pos.cash')}</label>
                      <input
                        type="radio"
                        className="btn-check"
                        name="paymentMethodDetail"
                        id="transferDetail"
                        autoComplete="off"
                        checked={paymentMethod === 'transfer'}
                        onChange={() => setPaymentMethod('transfer')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="transferDetail">{t('pos.transfer')}</label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>{t('pos.subtotal_before_tax', 'ยอดก่อนภาษี')}</span>
                      <span className="fw-bold">
                        ฿{parseFloat(order.subtotal ?? order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>
                    <div className="form-check mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="applyVatOrderDetail"
                        checked={applyVat}
                        onChange={(e) => setApplyVat(e.target.checked)}
                      />
                      <label className="form-check-label fw-bold" htmlFor="applyVatOrderDetail">
                        {t('pos.apply_vat_7', 'คิด VAT 7%')}
                      </label>
                    </div>
                    <div className="mt-3">
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
                    </div>
                  </div>

                  {paymentMethod === 'cash' && (
                    <div className="mb-3">
                      <label className="form-label fw-bold">{t('pos.received_amount')}</label>
                      <input
                        type="number"
                        step="0.01"
                        className="form-control form-control-lg"
                        value={receivedAmount}
                        onChange={(e) => setReceivedAmount(e.target.value)}
                        placeholder={t('pos.enter_amount')}
                        autoFocus
                        required
                      />
                    </div>
                  )}

                  {change !== null && (
                    <div className={`alert ${change < 0 ? 'alert-danger' : 'alert-success'} text-center`}>
                      <div className="small text-uppercase fw-bold mb-1">{change < 0 ? t('pos.insufficient') : t('pos.change')}</div>
                      <div className="fs-2 fw-bold">฿{change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowPaymentModal(false)}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-success" disabled={change !== null && change < 0}>
                    {t('orders.confirm_payment')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="card border-0 shadow-sm mb-4">
        <div className="card-header bg-white d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
          <div className="fw-bold">{t('orders.customer', 'ลูกค้า')}</div>
          <div className="d-flex gap-2 flex-wrap">
            {customer?.id && (
              <button
                className="btn btn-outline-secondary btn-sm"
                onClick={() => navigate(`/customers/${customer.id}/edit`)}
              >
                {t('customers.edit_title', 'แก้ไขข้อมูลลูกค้า')}
              </button>
            )}
            {order.status !== 'cancelled' && (
              <button
                className="btn btn-primary btn-sm"
                onClick={() => setEditingMode('customer-only')}
              >
                {t('actions.change', 'เปลี่ยน')}
              </button>
            )}
          </div>
        </div>
        <div className="card-body">
          {customer ? (
            <div className="row g-2">
              <div className="col-12">
                <div className="fw-bold">{customer.company_name || customer.name}</div>
                {customer.company_name && <div className="text-muted">{customer.name}</div>}
              </div>
              {(customer.contact_name || customer.phone || customer.email) && (
                <div className="col-12">
                  <div className="small text-muted">
                    {customer.contact_name && <span className="me-3">{t('customers.locations.contact_person', 'ผู้ติดต่อ')}: {customer.contact_name}</span>}
                    {customer.phone && <span className="me-3">{t('customers.phone', 'เบอร์โทร')}: {customer.phone}</span>}
                    {customer.email && <span>{t('customers.email', 'อีเมล')}: {customer.email}</span>}
                  </div>
                </div>
              )}
              {(customer.tax_id || customer.line_id) && (
                <div className="col-12">
                  <div className="small text-muted">
                    {customer.tax_id && <span className="me-3">{t('customers.tax_id', 'เลขผู้เสียภาษี')}: {customer.tax_id}</span>}
                    {customer.line_id && <span>{t('customers.line_id', 'Line ID')}: {customer.line_id}</span>}
                  </div>
                </div>
              )}
              {customer.address && (
                <div className="col-12">
                  <div className="small text-muted">{t('customers.address', 'ที่อยู่')}: {customer.address}</div>
                </div>
              )}
            </div>
          ) : (
            <div className="text-muted">{t('pos.walk_in')}</div>
          )}
        </div>
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white d-flex justify-content-between align-items-center">
              <div className="fw-bold">{t('orders.order_items_breakdown')}</div>
              {(order.status === 'pending' || order.status === 'quotation') && (
                <button className="btn btn-warning btn-sm" onClick={() => setEditingMode('full')}>
                  {t('actions.edit')}
                </button>
              )}
            </div>
            <div className="card-body p-0">
              <div className="d-none d-md-block table-responsive">
                <table className="table table-sm table-bordered mb-0">
                  <thead>
                    <tr>
                      <th>{t('orders.product')}</th>
                      <th>{t('orders.sku')}</th>
                      <th>{t('orders.price')}</th>
                      <th>{t('orders.qty')}</th>
                      <th>{t('orders.subtotal')}</th>
                      <th>{t('orders.details')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {order.items.map((item) => (
                      <tr key={item.id}>
                        <td>{item.product?.name || t('orders.unknown_product')}</td>
                        <td>{item.product?.sku}</td>
                        <td>฿{Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>{item.quantity}</td>
                        <td>฿{(Number(item.price) * item.quantity).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td>
                          {item.metadata?.bundle_items ? (
                            <div className="small text-muted">
                              <strong>{t('orders.bundle_contents')}:</strong>
                              <ul className="mb-0 ps-3">
                                {item.metadata.bundle_items.map((bItem, idx) => (
                                  <li key={idx}>
                                    {bItem.name} (Qty: {bItem.total_quantity_deducted})
                                  </li>
                                ))}
                              </ul>
                            </div>
                          ) : '-'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <div className="d-block d-md-none p-2">
                <div className="d-flex flex-column gap-2">
                  {order.items.map((item) => {
                    const lineTotal = Number(item.price) * item.quantity;
                    const bundleItems = item.metadata?.bundle_items || [];
                    return (
                      <div key={item.id} className="card border-0 shadow-sm">
                        <div className="card-body py-3">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div style={{ minWidth: 0 }}>
                              <div className="fw-bold text-truncate">{item.product?.name || t('orders.unknown_product')}</div>
                              <div className="small text-muted text-truncate">{item.product?.sku || '-'}</div>
                            </div>
                            <div className="text-end">
                              <div className="fw-bold">
                                ฿{lineTotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                              </div>
                              <div className="small text-muted">
                                ฿{Number(item.price).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} × {item.quantity}
                              </div>
                            </div>
                          </div>

                          {bundleItems.length > 0 && (
                            <details className="mt-2">
                              <summary className="small text-muted">{t('orders.bundle_contents')}</summary>
                              <ul className="mb-0 mt-2 ps-3 small">
                                {bundleItems.map((bItem, idx) => (
                                  <li key={idx}>
                                    {bItem.name} (Qty: {bItem.total_quantity_deducted})
                                  </li>
                                ))}
                              </ul>
                            </details>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header bg-white fw-bold">{t('orders.issued_documents')}</div>
            <div className="card-body">
              <div className="d-none d-md-block">
                <ul className="list-group list-group-flush">
                <li className="list-group-item px-0">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold">{t('orders.quotation')}</span>
                    {(!order.quotation_number || order.quotation_status === 'cancelled') && (
                      <button
                        className="btn btn-outline-primary p-0 d-inline-flex align-items-center justify-content-center"
                        onClick={() => handleIssueDocument(order.id, 'quotation')}
                        title={t('orders.create')}
                        style={{ width: '40px', height: '40px' }}
                      >
                        <i className="bi bi-plus-lg" style={{ fontSize: '1.1rem' }}></i>
                      </button>
                    )}
                  </div>

                  {getDocumentHistory(order, 'quotation').map(doc => (
                    <div key={doc.id} className="d-flex justify-content-between align-items-center mb-1 ps-2 border-start border-3">
                      <div>
                        <span className={`font-monospace d-block small ${doc.status === 'cancelled' ? 'text-decoration-line-through text-danger' : 'text-success'}`}>
                          {doc.number}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.7em' }}>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="btn-group">
                        {doc.status !== 'cancelled' ? (
                          <>
                            <button
                              className="btn btn-outline-secondary p-0 d-inline-flex align-items-center justify-content-center"
                              onClick={() => handlePrint(order, 'quotation')}
                              title={t('orders.print')}
                              style={{ width: '40px', height: '40px' }}
                            >
                              <i className="bi bi-printer" style={{ fontSize: '1.05rem' }}></i>
                            </button>
                            <button
                              className="btn btn-outline-danger p-0 d-inline-flex align-items-center justify-content-center"
                              onClick={() => setConfirmAction({ kind: 'cancel-document', docType: 'quotation', number: doc.number })}
                              title={t('common.cancel')}
                              style={{ width: '40px', height: '40px' }}
                            >
                              <i className="bi bi-x-lg" style={{ fontSize: '1.05rem' }}></i>
                            </button>
                          </>
                        ) : (
                          <span className="badge bg-danger" style={{ fontSize: '0.6em' }}>{t('orders.document_cancelled')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {getDocumentHistory(order, 'quotation').length === 0 && (
                    <div className="text-muted small ps-2">{t('orders.not_issued')}</div>
                  )}
                </li>

                <li className="list-group-item px-0">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold">{t('orders.billing_note')}</span>
                    {(!order.billing_note_number || order.billing_note_status === 'cancelled') && (
                      <button
                        className="btn btn-outline-primary p-0 d-inline-flex align-items-center justify-content-center"
                        onClick={() => handleIssueDocument(order.id, 'billing_note')}
                        title={t('orders.create')}
                        style={{ width: '40px', height: '40px' }}
                      >
                        <i className="bi bi-plus-lg" style={{ fontSize: '1.1rem' }}></i>
                      </button>
                    )}
                  </div>

                  {getDocumentHistory(order, 'billing_note').map(doc => (
                    <div key={doc.id} className="d-flex justify-content-between align-items-center mb-1 ps-2 border-start border-3">
                      <div>
                        <span className={`font-monospace d-block small ${doc.status === 'cancelled' ? 'text-decoration-line-through text-danger' : 'text-success'}`}>
                          {doc.number}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.7em' }}>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="btn-group">
                        {doc.status !== 'cancelled' ? (
                          <>
                            <button
                              className="btn btn-outline-secondary p-0 d-inline-flex align-items-center justify-content-center"
                              onClick={() => handlePrint(order, 'billing_note')}
                              title={t('orders.print')}
                              style={{ width: '40px', height: '40px' }}
                            >
                              <i className="bi bi-printer" style={{ fontSize: '1.05rem' }}></i>
                            </button>
                            <button
                              className="btn btn-outline-danger p-0 d-inline-flex align-items-center justify-content-center"
                              onClick={() => setConfirmAction({ kind: 'cancel-document', docType: 'billing_note', number: doc.number })}
                              title={t('common.cancel')}
                              style={{ width: '40px', height: '40px' }}
                            >
                              <i className="bi bi-x-lg" style={{ fontSize: '1.05rem' }}></i>
                            </button>
                          </>
                        ) : (
                          <span className="badge bg-danger" style={{ fontSize: '0.6em' }}>{t('orders.document_cancelled')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {getDocumentHistory(order, 'billing_note').length === 0 && (
                    <div className="text-muted small ps-2">{t('orders.not_issued')}</div>
                  )}
                </li>

                <li className="list-group-item px-0">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <span className="fw-bold">{t('orders.receipt')}</span>
                    {(!order.receipt_number || order.receipt_status === 'cancelled') && (
                      <button
                        className="btn btn-outline-primary p-0 d-inline-flex align-items-center justify-content-center"
                        onClick={() => handleIssueDocument(order.id, 'receipt')}
                        title={t('orders.create')}
                        style={{ width: '40px', height: '40px' }}
                      >
                        <i className="bi bi-plus-lg" style={{ fontSize: '1.1rem' }}></i>
                      </button>
                    )}
                  </div>

                  {getDocumentHistory(order, 'receipt').map(doc => (
                    <div key={doc.id} className="d-flex justify-content-between align-items-center mb-1 ps-2 border-start border-3">
                      <div>
                        <span className={`font-monospace d-block small ${doc.status === 'cancelled' ? 'text-decoration-line-through text-danger' : 'text-success'}`}>
                          {doc.number}
                        </span>
                        <span className="text-muted" style={{ fontSize: '0.7em' }}>
                          {new Date(doc.created_at).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="btn-group">
                        {doc.status !== 'cancelled' ? (
                          <>
                            <button
                              className="btn btn-outline-secondary p-0 d-inline-flex align-items-center justify-content-center"
                              onClick={() => handlePrint(order, 'receipt')}
                              title={t('orders.print')}
                              style={{ width: '40px', height: '40px' }}
                            >
                              <i className="bi bi-printer" style={{ fontSize: '1.05rem' }}></i>
                            </button>
                            <button
                              className="btn btn-outline-danger p-0 d-inline-flex align-items-center justify-content-center"
                              onClick={() => setConfirmAction({ kind: 'cancel-document', docType: 'receipt', number: doc.number })}
                              title={t('common.cancel')}
                              style={{ width: '40px', height: '40px' }}
                            >
                              <i className="bi bi-x-lg" style={{ fontSize: '1.05rem' }}></i>
                            </button>
                          </>
                        ) : (
                          <span className="badge bg-danger" style={{ fontSize: '0.6em' }}>{t('orders.document_cancelled')}</span>
                        )}
                      </div>
                    </div>
                  ))}
                  {getDocumentHistory(order, 'receipt').length === 0 && (
                    <div className="text-muted small ps-2">{t('orders.not_issued')}</div>
                  )}
                </li>
                </ul>
              </div>

              <div className="d-block d-md-none">
                <div className="d-flex flex-column gap-2">
                  {(['quotation', 'billing_note', 'receipt'] as const).map((docType) => {
                    const title =
                      docType === 'quotation'
                        ? t('orders.quotation')
                        : docType === 'billing_note'
                          ? t('orders.billing_note')
                          : t('orders.receipt');
                    const canCreate =
                      docType === 'quotation'
                        ? !order.quotation_number || order.quotation_status === 'cancelled'
                        : docType === 'billing_note'
                          ? !order.billing_note_number || order.billing_note_status === 'cancelled'
                          : !order.receipt_number || order.receipt_status === 'cancelled';
                    const history = getDocumentHistory(order, docType);
                    return (
                      <div key={docType} className="card border-0 shadow-sm">
                        <div className="card-header bg-white d-flex justify-content-between align-items-center">
                          <span className="fw-bold">{title}</span>
                          {canCreate && (
                            <button
                              className="btn btn-outline-primary p-0 d-inline-flex align-items-center justify-content-center"
                              onClick={() => handleIssueDocument(order.id, docType)}
                              title={t('orders.create', 'สร้างเอกสาร')}
                              type="button"
                              style={{ width: '44px', height: '44px' }}
                            >
                              <i className="bi bi-plus-lg" style={{ fontSize: '1.1rem' }}></i>
                            </button>
                          )}
                        </div>
                        <div className="card-body">
                          {history.length === 0 ? (
                            <div className="text-muted small">{t('orders.not_issued')}</div>
                          ) : (
                            <div className="d-flex flex-column gap-2">
                              {history.map((doc) => (
                                <div key={doc.id} className="d-flex justify-content-between align-items-center ps-2 border-start border-3">
                                  <div style={{ minWidth: 0 }}>
                                    <span className={`font-monospace d-block small ${doc.status === 'cancelled' ? 'text-decoration-line-through text-danger' : 'text-success'}`}>
                                      {doc.number}
                                    </span>
                                    <span className="text-muted" style={{ fontSize: '0.75em' }}>
                                      {new Date(doc.created_at).toLocaleDateString()}
                                    </span>
                                  </div>
                                  <div className="btn-group">
                                    {doc.status !== 'cancelled' ? (
                                      <>
                                        <button
                                          className="btn btn-outline-secondary p-0 d-inline-flex align-items-center justify-content-center"
                                          onClick={() => handlePrint(order, docType)}
                                          title={t('orders.print', 'พิมพ์')}
                                          type="button"
                                          style={{ width: '44px', height: '44px' }}
                                        >
                                          <i className="bi bi-printer" style={{ fontSize: '1.05rem' }}></i>
                                        </button>
                                        <button
                                          className="btn btn-outline-danger p-0 d-inline-flex align-items-center justify-content-center"
                                          onClick={() => setConfirmAction({ kind: 'cancel-document', docType, number: doc.number })}
                                          title={t('common.cancel')}
                                          type="button"
                                          style={{ width: '44px', height: '44px' }}
                                        >
                                          <i className="bi bi-x-lg" style={{ fontSize: '1.05rem' }}></i>
                                        </button>
                                      </>
                                    ) : (
                                      <span className="badge bg-danger" style={{ fontSize: '0.7em' }}>{t('orders.document_cancelled')}</span>
                                    )}
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
