import React, { useEffect, useState } from 'react';
import { api, User, useAuthStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { EditOrderModal } from './EditOrderModal';
import { PullToRefresh } from '../../components/PullToRefresh';
import { MessageModal } from '../../components/MessageModal';
import { ConfirmModal } from '../../components/ConfirmModal';

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

interface OrderPaymentPlan {
  id: number;
  order_id: number;
  total: string;
  down_payment?: string | null;
  installment_count: number;
  installment_amount: string;
  start_date?: string | null;
  due_day?: number | null;
  status: string;
}

interface OrderPayment {
  id: number;
  order_id: number;
  installment_no?: number | null;
  amount: string;
  method: string;
  paid_at: string;
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
  payment_plan?: OrderPaymentPlan | null;
  paymentPlan?: OrderPaymentPlan | null;
  order_payments?: OrderPayment[];
  payments?: OrderPayment[];
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
  const [filterPaymentMethod, setFilterPaymentMethod] = useState<'all' | 'installment'>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchText, setSearchText] = useState('');
  const [appliedSearchText, setAppliedSearchText] = useState('');
  const [searchActive, setSearchActive] = useState(false);
  const [searchKind, setSearchKind] = useState<null | 'document' | 'order-id' | 'keyword'>(null);
  const [searchBusy, setSearchBusy] = useState(false);
  const [searchResultCount, setSearchResultCount] = useState<number | null>(null);
  const [dailySales, setDailySales] = useState<DailySales | null>(null);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const [confirmAction, setConfirmAction] = useState<
    | null
    | { kind: 'convert-quotation'; orderId: number }
    | { kind: 'cancel-order'; orderId: number }
    | { kind: 'mark-unpaid'; orderId: number }
    | { kind: 'purge-order'; orderId: number }
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

  const getInstallmentSummary = (order: Order) => {
    const plan = order.paymentPlan ?? order.payment_plan ?? null;
    if (!plan) return null;

    const total = Number(plan.total || order.total || 0);
    const payments = order.payments ?? order.order_payments ?? [];
    const paidSum = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
    const remaining = round2(total - paidSum);

    const count = Number(plan.installment_count || 0);
    const down = Number(plan.down_payment || 0);
    const base = Number(plan.installment_amount || 0);
    const installmentTotal = round2(Math.max(0, total - down));
    const lastAmount = round2(Math.max(0, installmentTotal - base * Math.max(0, count - 1)));

    const start = plan.start_date ? new Date(plan.start_date) : new Date(order.created_at);
    const startDate = new Date(start.getFullYear(), start.getMonth(), start.getDate());
    const dueDay = plan.due_day ?? startDate.getDate();
    const toDueDate = (monthOffset: number) => {
      const y = startDate.getFullYear();
      const m = startDate.getMonth() + monthOffset;
      const lastDay = new Date(y, m + 1, 0).getDate();
      const d = Math.min(Math.max(1, dueDay), lastDay);
      return new Date(y, m, d);
    };
    const expectedForNo = (no: number) => {
      if (no === 0) return round2(down);
      if (no === count) return lastAmount;
      return round2(base);
    };

    const schedule: Array<{ installment_no: number; due_date: Date | null; expected_amount: number }> = [];
    if (down > 0) {
      schedule.push({
        installment_no: 0,
        due_date: startDate,
        expected_amount: expectedForNo(0),
      });
    }
    for (let i = 1; i <= count; i += 1) {
      schedule.push({
        installment_no: i,
        due_date: toDueDate(i - 1),
        expected_amount: expectedForNo(i),
      });
    }

    const paidNos = new Set<number>(
      payments
        .filter((p) => p.installment_no !== null && p.installment_no !== undefined)
        .map((p) => Number(p.installment_no))
    );
    const paidCount = schedule.filter((s) => paidNos.has(s.installment_no)).length;
    const nextRow = schedule.find((s) => !paidNos.has(s.installment_no)) || null;

    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const overdueRows = schedule.filter((s) => {
      if (paidNos.has(s.installment_no)) return false;
      if (!s.due_date) return false;
      return s.due_date < todayDate;
    });
    const overdueCount = overdueRows.length;
    const overdueAmount = round2(overdueRows.reduce((sum, r) => sum + Number(r.expected_amount || 0), 0));

    const isCompleted = (plan.status || 'active') === 'completed' || remaining <= 0;
    return {
      planStatus: plan.status || 'active',
      isCompleted,
      totalCount: schedule.length,
      paidCount,
      remaining,
      nextRow,
      overdueCount,
      overdueAmount,
    };
  };

  const renderIssuedDocBadges = (order: Order) => {
    const docs: Array<{ key: 'quotation' | 'billing_note' | 'receipt'; label: string; number?: string; status?: string; activeClass: string }> = [
      {
        key: 'quotation',
        label: t('print.quotation.short', 'เสนอราคา'),
        number: order.quotation_number,
        status: order.quotation_status,
        activeClass: 'bg-info',
      },
      {
        key: 'billing_note',
        label: t('print.billing_note.short', 'วางบิล'),
        number: order.billing_note_number,
        status: order.billing_note_status,
        activeClass: 'bg-primary',
      },
      {
        key: 'receipt',
        label: t('print.receipt.short', 'ใบเสร็จ'),
        number: order.receipt_number,
        status: order.receipt_status,
        activeClass: 'bg-success',
      },
    ];

    const issued = docs.filter(d => Boolean(d.number));
    if (issued.length === 0) return null;

    return (
      <div className="d-flex flex-column gap-1 mt-1">
        {issued.map(d => {
          const isCancelled = d.status === 'cancelled';
          return (
            <span key={d.key} className="d-inline-flex align-items-center gap-1" title={d.number || ''}>
              <span
                className={`badge ${isCancelled ? 'bg-secondary text-decoration-line-through' : d.activeClass}`}
                style={{ fontSize: '0.7em' }}
              >
                {d.label}
              </span>
              {d.number && (
                <span
                  className={`badge bg-light text-dark border font-monospace ${isCancelled ? 'text-decoration-line-through' : ''}`}
                  style={{ fontSize: '0.68em' }}
                >
                  {d.number}
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  const renderIssuedDocBadgesInline = (order: Order) => {
    const docs: Array<{ key: 'quotation' | 'billing_note' | 'receipt'; label: string; number?: string; status?: string; activeClass: string }> = [
      {
        key: 'quotation',
        label: t('print.quotation.short', 'เสนอราคา'),
        number: order.quotation_number,
        status: order.quotation_status,
        activeClass: 'bg-info',
      },
      {
        key: 'billing_note',
        label: t('print.billing_note.short', 'วางบิล'),
        number: order.billing_note_number,
        status: order.billing_note_status,
        activeClass: 'bg-primary',
      },
      {
        key: 'receipt',
        label: t('print.receipt.short', 'ใบเสร็จ'),
        number: order.receipt_number,
        status: order.receipt_status,
        activeClass: 'bg-success',
      },
    ];

    const issued = docs.filter(d => Boolean(d.number));
    if (issued.length === 0) return '-';

    return (
      <div className="d-flex flex-column gap-1">
        {issued.map(d => {
          const isCancelled = d.status === 'cancelled';
          return (
            <span key={d.key} className="d-inline-flex align-items-center gap-1" title={d.number || ''}>
              <span
                className={`badge ${isCancelled ? 'bg-secondary text-decoration-line-through' : d.activeClass}`}
                style={{ fontSize: '0.75em' }}
              >
                {d.label}
              </span>
              {d.number && (
                <span
                  className={`badge bg-light text-dark border font-monospace ${isCancelled ? 'text-decoration-line-through' : ''}`}
                  style={{ fontSize: '0.7em' }}
                >
                  {d.number}
                </span>
              )}
            </span>
          );
        })}
      </div>
    );
  };

  useEffect(() => {
    if (searchActive && searchKind !== 'keyword') return;
    fetchOrders(currentPage, false, searchActive && searchKind === 'keyword' ? appliedSearchText.trim() : undefined);
  }, [currentPage, filterStatus, filterPaymentMethod, searchActive, searchKind, appliedSearchText]);

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

  const looksLikeOrderId = (q: string) => /^#?\d+$/.test(q.trim());
  const parseOrderId = (q: string) => {
    const raw = q.trim().replace(/^#/, '');
    const n = Number(raw);
    if (!Number.isFinite(n) || n <= 0) return null;
    return Math.trunc(n);
  };
  const looksLikeDocumentNumber = (q: string) => {
    const v = q.trim();
    if (v === '') return false;
    if (looksLikeOrderId(v)) return false;
    return /[A-Za-z]/.test(v) && v.includes('-');
  };

  const searchOrdersByDocumentNumber = async (query: string) => {
    const q = query.trim();
    if (q === '') {
      setAlertMessage({ type: 'danger', text: t('common.required', 'กรุณากรอกข้อมูล') });
      return;
    }
    setSearchActive(true);
    setSearchKind('document');
    setSearchBusy(true);
    setSearchResultCount(null);
    setLoading(true);
    try {
      const qLower = q.toLowerCase();
      let page = 1;
      let last = 1;
      const orderIds: number[] = [];
      while (page <= last && page <= 10) {
        const params = new URLSearchParams();
        params.set('page', String(page));
        params.set('per_page', '200');
        const res = await api.get(`/documents?${params.toString()}`);
        const apiData = (res as any)?.data;
        const rowsRaw = apiData?.data ?? apiData;
        const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
        for (const d of rows) {
          const number = String((d as any)?.number ?? '');
          if (number === '') continue;
          if (!number.toLowerCase().includes(qLower)) continue;
          const oid = Number((d as any)?.order?.id ?? (d as any)?.order_id);
          if (Number.isFinite(oid) && oid > 0) orderIds.push(oid);
        }
        if (typeof apiData?.last_page === 'number' && Number.isFinite(apiData.last_page)) {
          last = apiData.last_page;
        } else {
          last = 1;
        }
        page += 1;
      }

      const uniqueIds = Array.from(new Set(orderIds)).slice(0, 50);
      if (uniqueIds.length === 0) {
        setOrders([]);
        setCurrentPage(1);
        setLastPage(1);
        setSearchResultCount(0);
        return;
      }

      const results = await Promise.allSettled(uniqueIds.map((oid) => api.get(`/orders/${oid}`)));
      const loaded = results
        .filter((r): r is PromiseFulfilledResult<any> => r.status === 'fulfilled')
        .map((r) => r.value?.data)
        .filter(Boolean) as Order[];

      setOrders(loaded);
      setCurrentPage(1);
      setLastPage(1);
      setSearchResultCount(loaded.length);
    } catch (err) {
      setAlertMessage({ type: 'danger', text: t('common.fetch_failed', 'โหลดข้อมูลไม่สำเร็จ') });
    } finally {
      setLoading(false);
      setSearchBusy(false);
    }
  };

  const searchOrdersByOrderId = async (orderId: number) => {
    setSearchActive(true);
    setSearchKind('order-id');
    setSearchBusy(true);
    setSearchResultCount(null);
    setLoading(true);
    try {
      const res = await api.get(`/orders/${orderId}`);
      setOrders([res.data]);
      setCurrentPage(1);
      setLastPage(1);
      setSearchResultCount(1);
    } catch {
      setOrders([]);
      setCurrentPage(1);
      setLastPage(1);
      setSearchResultCount(0);
      setAlertMessage({ type: 'danger', text: t('common.not_found', 'ไม่พบข้อมูล') });
    } finally {
      setLoading(false);
      setSearchBusy(false);
    }
  };

  const runSearch = async () => {
    const q = searchText.trim();
    if (q === '') return;
    if (looksLikeOrderId(q)) {
      const oid = parseOrderId(q);
      if (!oid) {
        setAlertMessage({ type: 'danger', text: t('common.invalid', 'ข้อมูลไม่ถูกต้อง') });
        return;
      }
      await searchOrdersByOrderId(oid);
      return;
    }
    setSearchActive(true);
    setSearchKind('keyword');
    setSearchResultCount(null);
    setCurrentPage(1);
    setAppliedSearchText(q);
  };

  const clearSearch = () => {
    setSearchText('');
    setAppliedSearchText('');
    setSearchActive(false);
    setSearchKind(null);
    setSearchBusy(false);
    setSearchResultCount(null);
    setCurrentPage(1);
    fetchOrders(1);
  };

  const fetchOrders = async (page: number, background = false, keyword?: string) => {
    if (searchActive && searchKind && searchKind !== 'keyword') return;
    if (!background) setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(page));
      params.set('status', String(filterStatus));
      if (filterPaymentMethod !== 'all') params.set('payment_method', filterPaymentMethod);
      const q = keyword?.trim() || '';
      if (q !== '') params.set('search', q);
      const response = await api.get<PaginatedResponse<Order>>(`/orders?${params.toString()}`);
      setOrders(response.data.data);
      setCurrentPage(response.data.current_page);
      setLastPage(response.data.last_page);
      if (q !== '') setSearchResultCount(response.data.total ?? response.data.data.length);
    } catch (error) {
      console.error('Failed to fetch orders:', error);
      if (keyword && keyword.trim() !== '') {
        setAlertMessage({ type: 'danger', text: t('orders.search_not_supported', 'ระบบยังไม่รองรับค้นหาแบบคำ') });
        setSearchActive(false);
        setSearchKind(null);
        setSearchResultCount(null);
      }
    } finally {
      if (!background) setLoading(false);
    }
  };

  const handlePaymentSuccess = () => {
    fetchOrders(currentPage);
    fetchDailySales();
  };

  const handlePayClick = (order: Order, e: React.MouseEvent) => {
    e.stopPropagation();
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
  };

  const handleEditCustomerOnly = (e: React.MouseEvent, order: Order) => {
    e.stopPropagation();
    setEditingOrderMode('customer-only');
    setEditingOrder(order);
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
      <ConfirmModal
        open={confirmAction !== null}
        title={t('common.confirm_title', 'ยืนยัน')}
        message={
          !confirmAction
            ? ''
            : confirmAction.kind === 'convert-quotation'
              ? t('orders.confirm_convert_quotation')
              : confirmAction.kind === 'mark-unpaid'
                ? t('orders.confirm_mark_unpaid', 'ต้องการเปลี่ยนสถานะการจ่ายเงินเป็น "รอจ่าย" ใช่ไหม?')
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
          const action = confirmAction;
          if (!action) return;
          setConfirmBusy(true);
          try {
            if (action.kind === 'convert-quotation') {
              await api.put(`/orders/${action.orderId}`, { status: 'pending' });
              fetchOrders(currentPage);
            } else if (action.kind === 'mark-unpaid') {
              await api.put(`/orders/${action.orderId}`, { status: 'pending' });
              fetchOrders(currentPage);
              fetchDailySales();
              setAlertMessage({ type: 'success', text: t('orders.update_success') });
            } else if (action.kind === 'purge-order') {
              await api.post(`/orders/${action.orderId}/purge`);
              fetchOrders(currentPage);
              fetchDailySales();
              setAlertMessage({ type: 'success', text: t('orders.update_success') });
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
      />
      <MessageModal
        open={alertMessage !== null}
        type={alertMessage?.type || 'danger'}
        title={
          alertMessage?.type === 'success'
            ? t('common.success_title', 'สำเร็จ')
            : t('common.error_title', 'ไม่สำเร็จ')
        }
        message={alertMessage?.text || ''}
        okLabel={t('common.ok', 'ตกลง')}
        onClose={() => setAlertMessage(null)}
      />
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
        <button
          className="btn btn-primary"
          onClick={() => (searchActive ? runSearch() : fetchOrders(1))}
          disabled={searchBusy}
        >
          {t('orders.refresh')}
        </button>
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

      <div className="card shadow-sm mb-3">
        <div className="card-body py-2">
          <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2">
            <div
              className="nav nav-pills flex-nowrap overflow-auto gap-2 p-1 bg-light rounded"
              style={{ WebkitOverflowScrolling: 'touch' }}
              role="tablist"
              aria-label={t('orders.status', 'สถานะ')}
            >
              {['all', 'completed', 'pending', 'quotation', 'cancelled'].map(status => (
                <button
                  key={status}
                  type="button"
                  className={`nav-link text-nowrap px-3 py-2 ${filterStatus === status ? 'active fw-bold' : 'text-dark'}`}
                  onClick={() => { setFilterStatus(status); setCurrentPage(1); }}
                  disabled={searchActive && searchKind !== 'keyword'}
                  role="tab"
                  aria-selected={filterStatus === status}
                >
                  {t(`status.${status}`)}
                </button>
              ))}
            </div>

            <div className="form-check form-switch m-0">
              <input
                className="form-check-input"
                type="checkbox"
                id="filterInstallmentOnly"
                checked={filterPaymentMethod === 'installment'}
                disabled={searchActive && searchKind !== 'keyword'}
                onChange={(e) => {
                  setFilterPaymentMethod(e.target.checked ? 'installment' : 'all');
                  setCurrentPage(1);
                }}
              />
              <label className="form-check-label fw-semibold" htmlFor="filterInstallmentOnly">
                {t('orders.installment_list', 'รายการผ่อนชำระ')}
              </label>
            </div>
          </div>

          <div className="mt-2 d-flex flex-column flex-md-row gap-2">
            <input
              className="form-control"
              value={searchText}
              onChange={(e) => setSearchText(e.target.value)}
              placeholder={t('orders.search_placeholder', 'ค้นหา: เลขออเดอร์ / ชื่อลูกค้า / เลขที่เอกสาร / SKU')}
              onKeyDown={(e) => {
                if (e.key === 'Enter') runSearch();
              }}
              disabled={searchBusy}
            />
            <div className="d-flex gap-2">
              <button
                type="button"
                className="btn btn-outline-primary"
                onClick={runSearch}
                disabled={searchBusy || searchText.trim() === ''}
              >
                {t('common.search', 'ค้นหา')}
              </button>
              {searchActive && (
                <button type="button" className="btn btn-outline-secondary" onClick={clearSearch} disabled={searchBusy}>
                  {t('common.clear', 'ล้าง')}
                </button>
              )}
            </div>
          </div>
          {searchActive && searchResultCount !== null && (
            <div className="small text-muted mt-2">
              {t('common.found', 'พบ')}: {searchResultCount}
            </div>
          )}
        </div>
      </div>

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="d-none d-md-block table-responsive">
            <table className="table table-hover mb-0">
              <thead className="bg-light">
                <tr>
                  <th className="p-3">{t('orders.id')}</th>
                  <th className="p-3">{t('orders.date')}</th>
                  <th className="p-3">{t('orders.customer')}</th>
                  <th className="p-3">{t('orders.status')}</th>
                  <th className="p-3">{t('orders.documents', 'เอกสาร')}</th>
                  <th className="p-3">{t('orders.total')}</th>
                  <th className="p-3">{t('orders.items')}</th>
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => (
                  <React.Fragment key={order.id}>
                    <tr onClick={() => navigate(`/orders/${order.id}`)} style={{ cursor: 'pointer' }}>
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
                      <td className="p-3">
                        {(() => {
                          const dt = formatDateTime(order.created_at);
                          return (
                            <>
                              <div className="fw-semibold">{dt.date}</div>
                              <div className="small text-muted">{dt.time}</div>
                            </>
                          );
                        })()}
                      </td>
                      <td className="p-3">
                        <div className="fw-bold">{order.customer?.company_name || order.customer?.name || t('pos.walk_in')}</div>
                        <div className="small text-muted">{t('orders.staff')}: {order.user?.name || t('orders.unknown')}</div>
                      </td>
                      <td className="p-3">
                        {(() => {
                          const s = getInstallmentSummary(order);
                          const orderBadgeClass =
                            order.status === 'completed'
                              ? 'success'
                              : order.status === 'pending'
                                ? 'warning'
                                : order.status === 'quotation'
                                  ? 'info'
                                  : 'danger';
                          if (!s) {
                            return <span className={`badge bg-${orderBadgeClass}`}>{t(`status.${order.status}`)}</span>;
                          }

                          const badgeClass = s.isCompleted ? 'success' : s.overdueCount > 0 ? 'danger' : 'primary';
                          const badgeText = s.isCompleted
                            ? t('orders.completed', 'ปิดบัญชี')
                            : s.overdueCount > 0
                              ? t('orders.overdue', 'ค้างชำระ')
                              : t('orders.active', 'ผ่อนอยู่');
                          return (
                            <div>
                              <div className="d-flex flex-wrap gap-1">
                                <span className={`badge bg-${orderBadgeClass}`}>{t(`status.${order.status}`)}</span>
                                <span className={`badge bg-${badgeClass}`}>{badgeText}</span>
                              </div>
                              <div className="small text-muted mt-1">
                                {s.paidCount}/{s.totalCount}
                                {s.remaining > 0 && (
                                  <span> · ฿{s.remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                                )}
                              </div>
                              {s.overdueCount > 0 && (
                                <div className="small text-danger">
                                  {t('orders.overdue_amount', 'ยอดค้าง')}: ฿{s.overdueAmount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </div>
                              )}
                            </div>
                          );
                        })()}
                      </td>
                      <td className="p-3">
                        {renderIssuedDocBadgesInline(order)}
                      </td>
                      <td className="p-3 fw-bold">฿{parseFloat(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                      <td className="p-3">{order.items.length} {t('orders.items')}</td>
                    </tr>
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="d-block d-md-none p-2">
            {orders.length === 0 ? (
              <div className="text-center text-muted py-4">{t('orders.empty', 'ไม่พบรายการ')}</div>
            ) : (
              <div className="d-flex flex-column gap-2">
                {orders.map((order) => {
                  const dt = formatDateTime(order.created_at);
                  const customerName = order.customer?.company_name || order.customer?.name || t('pos.walk_in');
                  const installment = getInstallmentSummary(order);
                  const statusClass =
                    order.status === 'completed'
                      ? 'success'
                      : order.status === 'pending'
                        ? 'warning'
                        : order.status === 'quotation'
                          ? 'info'
                          : 'danger';
                  return (
                    <button
                      key={order.id}
                      type="button"
                      className="card border-0 shadow-sm text-start w-100"
                      onClick={() => navigate(`/orders/${order.id}`)}
                    >
                      <div className="card-body py-3">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div style={{ minWidth: 0 }}>
                            <div className="fw-bold text-truncate">#{order.id}</div>
                            <div className="small text-muted">
                              {dt.date} {dt.time}
                            </div>
                          </div>
                          <div className="text-end">
                            <div className="d-flex flex-column align-items-end gap-1">
                              <span className={`badge bg-${statusClass}`}>{t(`status.${order.status}`)}</span>
                              {installment && (
                                <span className={`badge bg-${installment.isCompleted ? 'success' : installment.overdueCount > 0 ? 'danger' : 'primary'}`}>
                                  {installment.isCompleted ? t('orders.completed', 'ปิดบัญชี') : installment.overdueCount > 0 ? t('orders.overdue', 'ค้างชำระ') : t('orders.active', 'ผ่อนอยู่')}
                                </span>
                              )}
                            </div>
                            <div className="fw-bold mt-1">
                              ฿{parseFloat(order.total).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                            </div>
                          </div>
                        </div>

                        <div className="mt-2">
                          <div className="fw-semibold text-truncate">{customerName}</div>
                          <div className="small text-muted text-truncate">{t('orders.staff')}: {order.user?.name || t('orders.unknown')}</div>
                        </div>

                        <div className="mt-2 d-flex justify-content-between align-items-center gap-2">
                          <div className="small text-muted">
                            {order.items.length} {t('orders.items')}
                          </div>
                          <div style={{ minWidth: 0 }}>
                            {renderIssuedDocBadgesInline(order)}
                          </div>
                        </div>

                        {installment && (
                          <div className="mt-2 small text-muted">
                            {installment.paidCount}/{installment.totalCount}
                            {installment.remaining > 0 && (
                              <span> · ฿{installment.remaining.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
                            )}
                          </div>
                        )}
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
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
