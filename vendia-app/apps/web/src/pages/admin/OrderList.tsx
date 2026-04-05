import React, { useEffect, useState } from 'react';
import { api, User, useAuthStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EditOrderModal } from './EditOrderModal';
import { PullToRefresh } from '../../components/PullToRefresh';

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
  parent_id?: number;
  parent?: {
    id: number;
    total: string;
  };
  appointments_count?: number;
  subtotal?: string;
  vat_rate?: string;
  vat_amount?: string;
  withholding_rate?: string;
  withholding_amount?: string;
  total: string;
  status: string;
  quotation_number?: string;
  quotation_status?: string;
  billing_note_number?: string;
  billing_note_status?: string;
  receipt_number?: string;
  receipt_status?: string;
  payment_method: string;
  created_at: string;
  user?: {
    name: string;
    id: number;
  };
  customer?: User;
  items: OrderItem[];
  documents?: Document[];
}

interface DailySales {
  date: string;
  total: number;
  count: number;
  breakdown: {
    cash: number;
    transfer: number;
  };
}

interface PaginatedResponse<T> {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
  per_page: number;
}

export const OrderList = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);
  const [orders, setOrders] = useState<Order[]>([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [lastPage, setLastPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [dailySales, setDailySales] = useState<DailySales | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | null
    | { kind: 'cancel-document'; orderId: number; docType: 'quotation' | 'billing_note' | 'receipt'; number: string }
    | { kind: 'convert-quotation'; orderId: number }
    | { kind: 'cancel-order'; orderId: number }
    | { kind: 'delete-order'; orderId: number }
  >(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  // Payment Modal State
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editingOrderMode, setEditingOrderMode] = useState<'full' | 'customer-only'>('full');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [change, setChange] = useState<number | null>(null);
  const [applyVat, setApplyVat] = useState(false);
  const [withholdingRate, setWithholdingRate] = useState<0 | 3 | 7>(0);

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  useEffect(() => {
    fetchOrders(currentPage);
  }, [currentPage, filterStatus]);

  useEffect(() => {
    fetchDailySales();
  }, []);

  const fetchDailySales = async () => {
    try {
      const response = await api.get('/orders/daily-sales');
      setDailySales(response.data);
    } catch (error) {
      console.error('Failed to fetch daily sales:', error);
    }
  };

  const fetchOrders = async (page: number, background = false) => {
    if (!background) setLoading(true);
    try {
      const response = await api.get<PaginatedResponse<Order>>(`/orders?page=${page}&status=${filterStatus}`);
      setOrders(response.data.data);
      setCurrentPage(response.data.current_page);
      setLastPage(response.data.last_page);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
    } finally {
      if (!background) setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    fetchOrders(currentPage);
    fetchDailySales();
  };

  const toggleExpand = (orderId: number) => {
    setExpandedOrderId(expandedOrderId === orderId ? null : orderId);
  };

  const handlePayClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent row expansion
    setSelectedOrder(order);
    setReceivedAmount('');
    setChange(null);
    setPaymentMethod('cash');
    setApplyVat(Number(order.vat_rate || 0) > 0);
    setWithholdingRate((Number(order.withholding_rate || 0) as 0 | 3 | 7) || 0);
  };

  const handleEditOrder = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setEditingOrderMode('full');
    setEditingOrder(order);
    setExpandedOrderId(order.id);
  };

  const handleEditCustomerOnly = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setEditingOrderMode('customer-only');
    setEditingOrder(order);
    setExpandedOrderId(order.id);
  };

  const handlePrint = (e: React.MouseEvent, orderId: number, type: 'receipt' | 'quotation' | 'billing_note') => {
    e.stopPropagation();
    window.open(`/print/order/${orderId}?type=${type}`, '_blank');
  };

  const handleCancelDocument = async (orderId: number, type: 'quotation' | 'billing_note' | 'receipt', number: string) => {
    try {
        await api.post(`/orders/${orderId}/cancel-document`, { type });
        fetchOrders(currentPage);
        setAlertMessage({ type: 'success', text: t('orders.update_success') });
    } catch (error) {
        console.error('Failed to cancel document:', error);
        setAlertMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const handleIssueDocument = async (orderId: number, type: 'quotation' | 'billing_note' | 'receipt') => {
    try {
        await api.post(`/orders/${orderId}/issue-document`, { type });
        fetchOrders(currentPage);
        setAlertMessage({ type: 'success', text: t('orders.update_success') });
    } catch (error) {
        console.error('Failed to issue document:', error);
        setAlertMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const getDocumentHistory = (order: Order, type: 'quotation' | 'billing_note' | 'receipt') => {
    const docs = (order.documents || []).filter(d => d.type === type);
    const currentNumber =
      type === 'quotation'
        ? order.quotation_number
        : type === 'billing_note'
          ? order.billing_note_number
          : order.receipt_number;
    const currentStatus =
      type === 'quotation'
        ? order.quotation_status
        : type === 'billing_note'
          ? order.billing_note_status
          : order.receipt_status;

    if (!currentNumber || docs.some(d => d.number === currentNumber)) return docs;

    return [
      {
        id: -order.id * 10 - (type === 'quotation' ? 1 : type === 'billing_note' ? 2 : 3),
        type,
        number: currentNumber,
        status: currentStatus || 'active',
        created_at: order.created_at,
      },
      ...docs,
    ];
  };

  const handleConvertQuotation = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    try {
      await api.put(`/orders/${orderId}`, { status: 'pending' });
      fetchOrders(currentPage);
    } catch (err) {
        setAlertMessage({ type: 'danger', text: t('orders.convert_failed') });
    }
  };

  const handleCancelOrder = async (e: React.MouseEvent, orderId: number) => {
    e.stopPropagation();
    try {
      await api.put(`/orders/${orderId}`, { status: 'cancelled' });
      fetchOrders(currentPage);
      setAlertMessage({ type: 'success', text: t('orders.update_success') });
    } catch (err) {
      console.error('Failed to cancel order:', err);
      setAlertMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const processPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrder) return;

    try {
      await api.put(`/orders/${selectedOrder.id}`, {
        status: 'completed',
        payment_method: paymentMethod,
        apply_vat: applyVat,
        withholding_rate: withholdingRate,
      });
      
      // Update local state
      setOrders(orders.map(o => 
        o.id === selectedOrder.id 
          ? { ...o, status: 'completed', payment_method: paymentMethod } 
          : o
      ));
      
      handlePaymentSuccess();
      
      setSelectedOrder(null);
      setAlertMessage({ type: 'success', text: t('orders.payment_success') });
    } catch (error) {
      console.error('Payment failed:', error);
      setAlertMessage({ type: 'danger', text: t('orders.payment_failed') });
    }
  };

  useEffect(() => {
    if (selectedOrder && paymentMethod === 'cash' && receivedAmount) {
      const received = parseFloat(receivedAmount);
      const subtotal = parseFloat(selectedOrder.subtotal ?? selectedOrder.total);
      const vatAmount = applyVat ? round2(subtotal * 0.07) : 0;
      const withholdingAmount = round2(subtotal * (withholdingRate / 100));
      const payable = round2(subtotal + vatAmount - withholdingAmount);
      setChange(received - payable);
    } else {
      setChange(null);
    }
  }, [receivedAmount, paymentMethod, selectedOrder, applyVat, withholdingRate]);

  const selectedSubtotal = selectedOrder ? parseFloat(selectedOrder.subtotal ?? selectedOrder.total) : 0;
  const selectedVatAmount = selectedOrder && applyVat ? round2(selectedSubtotal * 0.07) : 0;
  const selectedTotalWithVat = selectedOrder ? round2(selectedSubtotal + selectedVatAmount) : 0;
  const selectedWithholdingAmount = selectedOrder ? round2(selectedSubtotal * (withholdingRate / 100)) : 0;
  const selectedPayable = selectedOrder ? round2(selectedTotalWithVat - selectedWithholdingAmount) : 0;

  if (loading) return <div className="p-4 text-center">{t('common.loading')}</div>;

  return (
    <PullToRefresh onRefresh={() => fetchOrders(1, true)}>
      <div className="container-fluid p-4">
      {confirmAction && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          role="dialog"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget && !confirmBusy) setConfirmAction(null);
          }}
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-header">
                <h5 className="modal-title">{t('common.confirm_title', 'ยืนยัน')}</h5>
                <button type="button" className="btn-close" onClick={() => !confirmBusy && setConfirmAction(null)}></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  {confirmAction.kind === 'cancel-document'
                    ? t('orders.confirm_cancel_document', { number: confirmAction.number })
                    : confirmAction.kind === 'convert-quotation'
                      ? t('orders.confirm_convert_quotation')
                      : confirmAction.kind === 'delete-order'
                        ? t('orders.confirm_delete_order', 'ต้องการลบออเดอร์นี้ออกจากระบบถาวรใช่ไหม? (ลบแล้วกู้คืนไม่ได้)')
                        : t('orders.confirm_cancel_order')}
                </p>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline-secondary" onClick={() => setConfirmAction(null)} disabled={confirmBusy}>
                  {t('common.cancel', 'ยกเลิก')}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={async () => {
                    const action = confirmAction;
                    if (!action) return;
                    setConfirmBusy(true);
                    try {
                      if (action.kind === 'cancel-document') {
                        await handleCancelDocument(action.orderId, action.docType, action.number);
                      } else if (action.kind === 'convert-quotation') {
                        await api.put(`/orders/${action.orderId}`, { status: 'pending' });
                        fetchOrders(currentPage);
                      } else if (action.kind === 'delete-order') {
                        await api.delete(`/orders/${action.orderId}`);
                        fetchOrders(currentPage);
                        setAlertMessage({ type: 'success', text: t('orders.update_success') });
                      } else {
                        await api.put(`/orders/${action.orderId}`, { status: 'cancelled' });
                        fetchOrders(currentPage);
                        setAlertMessage({ type: 'success', text: t('orders.update_success') });
                      }
                    } catch (error) {
                      if (action.kind === 'convert-quotation') {
                        setAlertMessage({ type: 'danger', text: t('orders.convert_failed') });
                      } else if (action.kind === 'delete-order') {
                        setAlertMessage({ type: 'danger', text: t('orders.update_failed') });
                      } else {
                        setAlertMessage({ type: 'danger', text: t('orders.update_failed') });
                      }
                    } finally {
                      setConfirmBusy(false);
                      setConfirmAction(null);
                    }
                  }}
                  disabled={confirmBusy}
                >
                  {confirmBusy ? t('common.loading', 'กำลังทำรายการ...') : t('common.confirm', 'ยืนยัน')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
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
                <div className="text-success mb-3" style={{ fontSize: '3rem' }}>
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
      {dailySales && (
        <div className="row mb-4">
          <div className="col-md-4">
            <div className="card bg-primary text-white h-100">
              <div className="card-body">
                <h5 className="card-title">{t('orders.todays_sales')}</h5>
                <h2 className="display-6 fw-bold">฿{dailySales.total.toLocaleString()}</h2>
                <div className="mt-2 small">
                  <span className="me-3">{t('pos.cash')}: ฿{dailySales.breakdown.cash.toLocaleString()}</span>
                  <span>{t('pos.transfer')}: ฿{dailySales.breakdown.transfer.toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card bg-success text-white h-100">
              <div className="card-body">
                <h5 className="card-title">{t('orders.todays_orders')}</h5>
                <h2 className="display-6 fw-bold">{dailySales.count}</h2>
                <p className="card-text small">{t('orders.completed_orders_today')}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{t('orders.title_bills')}</h2>
        <button className="btn btn-primary" onClick={() => fetchOrders(1)}>{t('orders.refresh')}</button>
      </div>

      {editingOrder && (
        <EditOrderModal
            orderId={editingOrder.id}
            mode={editingOrderMode}
            onClose={() => setEditingOrder(null)}
            onSuccess={() => {
                fetchOrders(currentPage);
                setAlertMessage({ type: 'success', text: t('orders.update_success') });
            }}
        />
      )}

      <ul className="nav nav-tabs mb-3">
        {['all', 'completed', 'pending', 'quotation', 'cancelled'].map(status => (
            <li className="nav-item" key={status}>
                <button 
                    className={`nav-link ${filterStatus === status ? 'active' : ''} text-capitalize`}
                    onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
                >
                    {t(`status.${status}`)}
                </button>
            </li>
        ))}
      </ul>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="p-3">{t('orders.id')}</th>
                  <th className="p-3">{t('orders.date')}</th>
                  <th className="p-3">{t('orders.customer')}</th>
                  <th className="p-3">{t('orders.status')}</th>
                  <th className="p-3">{t('orders.total')}</th>
                  <th className="p-3">{t('orders.items')}</th>
                  <th className="p-3">{t('orders.action')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr onClick={() => toggleExpand(order.id)} style={{ cursor: 'pointer' }}>
                      <td className="p-3">
                        #{order.id}
                        {order.parent && (
                            <div className="mt-1">
                                <span className="badge bg-secondary" style={{ fontSize: '0.7em' }} title={t('orders.supplementary_order')}>
                                    {t('orders.ref')}: #{order.parent.id}
                                </span>
                            </div>
                        )}
                      </td>
                      <td className="p-3">{new Date(order.created_at).toLocaleString()}</td>
                      <td className="p-3">
                        <div className="fw-bold">{order.customer?.name || t('pos.walk_in')}</div>
                        <div className="small text-muted">{t('orders.staff')}: {order.user?.name || t('orders.unknown')}</div>
                      </td>
                      <td className="p-3">
                        <span className={`badge bg-${
                            order.status === 'completed' ? 'success' : 
                            order.status === 'pending' ? 'warning' : 
                            order.status === 'quotation' ? 'info' : 'danger'
                        }`}>
                          {t(`status.${order.status}`)}
                        </span>
                      </td>
                      <td className="p-3 fw-bold">฿{parseFloat(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3">{order.items.length} {t('orders.items')}</td>
                      <td className="p-3">
                        {order.status === 'quotation' && (
                            <>
                                <button 
                                    className="btn btn-success btn-sm me-2"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmAction({ kind: 'convert-quotation', orderId: order.id });
                                    }}
                                >
                                    {t('orders.to_order')}
                                </button>
                                <button 
                                    className="btn btn-warning btn-sm me-2"
                                    onClick={(e) => handleEditOrder(e, order)}
                                >
                                    {t('actions.edit')}
                                </button>
                                <button 
                                    className="btn btn-danger btn-sm"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      setConfirmAction({ kind: 'cancel-order', orderId: order.id });
                                    }}
                                >
                                    {t('common.cancel')}
                                </button>
                            </>
                        )}
                        {order.status === 'pending' && (
                          <>
                            <button 
                              className="btn btn-success btn-sm me-2"
                              onClick={(e) => handlePayClick(order, e)}
                            >
                              {t('orders.pay_now')}
                            </button>
                            <button 
                                className="btn btn-warning btn-sm me-2"
                                onClick={(e) => handleEditOrder(e, order)}
                            >
                                {t('actions.edit')}
                            </button>
                            {(order.appointments_count || 0) === 0 && (
                              <button 
                                  className="btn btn-primary btn-sm me-2"
                                  onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/appointments/create?order_id=${order.id}&customer_id=${order.customer?.id}`);
                                  }}
                              >
                                  {t('orders.create_appt')}
                              </button>
                            )}
                            <button 
                                className="btn btn-danger btn-sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setConfirmAction({ kind: 'cancel-order', orderId: order.id });
                                }}
                            >
                                {t('common.cancel')}
                            </button>
                          </>
                        )}
                        {order.status === 'completed' && (
                            <>
                            <button 
                                className="btn btn-warning btn-sm me-2"
                                onClick={(e) => handleEditCustomerOnly(e, order)}
                            >
                                {t('orders.edit_customer', 'แก้ลูกค้า')}
                            </button>
                            {(order.appointments_count || 0) === 0 && (
                              <button 
                                  className="btn btn-primary btn-sm me-2"
                                  onClick={(e) => {
                                  e.stopPropagation();
                                  navigate(`/appointments/create?order_id=${order.id}&customer_id=${order.customer?.id}`);
                                  }}
                              >
                                  {t('orders.create_appt')}
                              </button>
                            )}
                            </>
                        )}
                        {order.status === 'cancelled' && user?.role === 'admin' && (
                          <button
                            className="btn btn-danger btn-sm me-2"
                            onClick={(e) => {
                              e.stopPropagation();
                              setConfirmAction({ kind: 'delete-order', orderId: order.id });
                            }}
                          >
                            {t('actions.delete')}
                          </button>
                        )}
                        <button className="btn btn-sm btn-link text-decoration-none">
                          {expandedOrderId === order.id ? t('orders.hide') : t('orders.view')}
                        </button>
                      </td>
                    </tr>
                    {expandedOrderId === order.id && (
                      <tr className="bg-light">
                        <td colSpan={7} className="p-4">
                          <div className="row">
                            <div className="col-md-8">
                                <div className="card border-0 h-100">
                                    <div className="card-header bg-white fw-bold">{t('orders.order_items_breakdown')}</div>
                                    <div className="card-body p-0">
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
                                </div>
                            </div>
                            <div className="col-md-4">
                                <div className="card border-0 h-100">
                                    <div className="card-header bg-white fw-bold">{t('orders.issued_documents')}</div>
                                    <div className="card-body">
                                        <ul className="list-group list-group-flush">
                                            {/* Quotation Section */}
                                            <li className="list-group-item px-0">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span className="fw-bold">{t('orders.quotation')}</span>
                                                    {(!order.quotation_number || order.quotation_status === 'cancelled') && (
                                                        <button 
                                                            className="btn btn-sm btn-outline-primary" 
                                                            onClick={() => handleIssueDocument(order.id, 'quotation')}
                                                            title={t('orders.create')}
                                                        >
                                                            <i className="bi bi-plus-lg"></i>
                                                        </button>
                                                    )}
                                                </div>
                                                
                                                {/* History List */}
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
                                                            {doc.status !== 'cancelled' && (
                                                                <>
                                                                    <button className="btn btn-sm btn-outline-secondary py-0" onClick={(e) => handlePrint(e, order.id, 'quotation')} title={t('orders.print')}>
                                                                        <i className="bi bi-printer" style={{ fontSize: '0.8em' }}></i>
                                                                    </button>
                                                                    <button
                                                                      className="btn btn-sm btn-outline-danger py-0"
                                                                      onClick={() => setConfirmAction({ kind: 'cancel-document', orderId: order.id, docType: 'quotation', number: doc.number })}
                                                                      title={t('common.cancel')}
                                                                    >
                                                                        <i className="bi bi-x-lg" style={{ fontSize: '0.8em' }}></i>
                                                                    </button>
                                                                </>
                                                            )}
                                                            {doc.status === 'cancelled' && (
                                                                <span className="badge bg-danger" style={{ fontSize: '0.6em' }}>{t('orders.document_cancelled')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {getDocumentHistory(order, 'quotation').length === 0 && (
                                                    <div className="text-muted small ps-2">{t('orders.not_issued')}</div>
                                                )}
                                            </li>

                                            {/* Billing Note Section */}
                                            <li className="list-group-item px-0">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span className="fw-bold">{t('orders.billing_note')}</span>
                                                    {(!order.billing_note_number || order.billing_note_status === 'cancelled') && (
                                                        <button 
                                                            className="btn btn-sm btn-outline-primary" 
                                                            onClick={() => handleIssueDocument(order.id, 'billing_note')}
                                                            title={t('orders.create')}
                                                        >
                                                            <i className="bi bi-plus-lg"></i>
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
                                                            {doc.status !== 'cancelled' && (
                                                                <>
                                                                    <button className="btn btn-sm btn-outline-secondary py-0" onClick={(e) => handlePrint(e, order.id, 'billing_note')} title={t('orders.print')}>
                                                                        <i className="bi bi-printer" style={{ fontSize: '0.8em' }}></i>
                                                                    </button>
                                                                    <button
                                                                      className="btn btn-sm btn-outline-danger py-0"
                                                                      onClick={() => setConfirmAction({ kind: 'cancel-document', orderId: order.id, docType: 'billing_note', number: doc.number })}
                                                                      title={t('common.cancel')}
                                                                    >
                                                                        <i className="bi bi-x-lg" style={{ fontSize: '0.8em' }}></i>
                                                                    </button>
                                                                </>
                                                            )}
                                                            {doc.status === 'cancelled' && (
                                                                <span className="badge bg-danger" style={{ fontSize: '0.6em' }}>{t('orders.document_cancelled')}</span>
                                                            )}
                                                        </div>
                                                    </div>
                                                ))}
                                                {getDocumentHistory(order, 'billing_note').length === 0 && (
                                                    <div className="text-muted small ps-2">{t('orders.not_issued')}</div>
                                                )}
                                            </li>

                                            {/* Receipt Section */}
                                            <li className="list-group-item px-0">
                                                <div className="d-flex justify-content-between align-items-center mb-1">
                                                    <span className="fw-bold">{t('orders.receipt')}</span>
                                                    {(!order.receipt_number || order.receipt_status === 'cancelled') && (
                                                        <button 
                                                            className="btn btn-sm btn-outline-primary" 
                                                            onClick={() => handleIssueDocument(order.id, 'receipt')}
                                                            title={t('orders.create')}
                                                        >
                                                            <i className="bi bi-plus-lg"></i>
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
                                                            {doc.status !== 'cancelled' && (
                                                                <>
                                                                    <button className="btn btn-sm btn-outline-secondary py-0" onClick={(e) => handlePrint(e, order.id, 'receipt')} title={t('orders.print')}>
                                                                        <i className="bi bi-printer" style={{ fontSize: '0.8em' }}></i>
                                                                    </button>
                                                                    <button
                                                                      className="btn btn-sm btn-outline-danger py-0"
                                                                      onClick={() => setConfirmAction({ kind: 'cancel-document', orderId: order.id, docType: 'receipt', number: doc.number })}
                                                                      title={t('common.cancel')}
                                                                    >
                                                                        <i className="bi bi-x-lg" style={{ fontSize: '0.8em' }}></i>
                                                                    </button>
                                                                </>
                                                            )}
                                                            {doc.status === 'cancelled' && (
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
                                </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card-footer bg-white d-flex justify-content-between align-items-center py-3">
            <button 
                className="btn btn-outline-secondary btn-sm"
                disabled={currentPage === 1}
                onClick={() => fetchOrders(currentPage - 1)}
            >
                &laquo; {t('common.previous')}
            </button>
            <span className="text-muted small">
                {t('common.page_of', { current: currentPage, total: lastPage })}
            </span>
            <button 
                className="btn btn-outline-secondary btn-sm"
                disabled={currentPage === lastPage}
                onClick={() => fetchOrders(currentPage + 1)}
            >
                {t('common.next')} &raquo;
            </button>
        </div>
      </div>

      {/* Payment Modal */}
      {selectedOrder && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('orders.pay_for_order', { id: selectedOrder.id })}</h5>
                <button type="button" className="btn-close" onClick={() => setSelectedOrder(null)}></button>
              </div>
              <form onSubmit={processPayment}>
                <div className="modal-body">
                  <div className="text-center mb-4">
                    <div className="text-muted mb-1">{t('orders.total')}</div>
                    <div className="display-4 fw-bold text-primary">฿{selectedPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('pos.payment_method')}</label>
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

                  <div className="mb-3">
                    <div className="d-flex justify-content-between align-items-center">
                      <span>{t('pos.subtotal_before_tax', 'ยอดก่อนภาษี')}</span>
                      <span className="fw-bold">
                        ฿{selectedSubtotal.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="form-check mt-2">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="applyVatOrderList"
                        checked={applyVat}
                        onChange={(e) => setApplyVat(e.target.checked)}
                      />
                      <label className="form-check-label fw-bold" htmlFor="applyVatOrderList">
                        {t('pos.apply_vat_7', 'คิด VAT 7%')}
                      </label>
                    </div>

                    {applyVat && (
                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className="text-muted">{t('pos.vat', 'VAT')} (7%)</span>
                        <span className="fw-bold">
                          ฿{selectedVatAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
                    )}

                    <div className="d-flex justify-content-between align-items-center mt-2">
                      <span className="fw-bold">{t('pos.total', 'ยอดรวม')}</span>
                      <span className="fw-bold">
                        ฿{selectedTotalWithVat.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                      </span>
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

                      {withholdingRate > 0 && (
                        <div className="d-flex justify-content-between align-items-center mt-2">
                          <span className="text-muted">
                            {t('pos.withholding_amount', 'ยอดหัก ณ ที่จ่าย')} ({withholdingRate}%)
                          </span>
                          <span className="fw-bold">
                            -฿{selectedWithholdingAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      )}

                      <div className="d-flex justify-content-between align-items-center mt-2">
                        <span className="fw-bold">{t('pos.payable', 'ยอดที่ต้องชำระจริง')}</span>
                        <span className="fw-bold text-primary">
                          ฿{selectedPayable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                        </span>
                      </div>
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
                        autoFocus
                        required
                        min={selectedPayable}
                      />
                      {change !== null && (
                        <div className={`mt-3 p-3 rounded text-center ${change >= 0 ? 'bg-success bg-opacity-10 text-success' : 'bg-danger bg-opacity-10 text-danger'}`}>
                          <div className="small fw-bold text-uppercase">{t('pos.change')}</div>
                          <div className="fs-2 fw-bold">฿{change.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setSelectedOrder(null)}>{t('common.cancel')}</button>
                  <button 
                    type="submit" 
                    className="btn btn-success btn-lg px-4"
                    disabled={paymentMethod === 'cash' && (!receivedAmount || parseFloat(receivedAmount) < selectedPayable)}
                  >
                    {t('pos.confirm_payment')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
      </div>
    </PullToRefresh>
  );
};
