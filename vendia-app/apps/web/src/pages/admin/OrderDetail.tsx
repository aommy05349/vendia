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
  order_payment_id?: number | null;
  header_subtitle?: string | null;
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
  installment_no?: number | null;
  amount: string;
  method: 'cash' | 'transfer' | string;
  paid_at: string;
  note?: string | null;
  documents?: Document[];
}

interface CustomerLocation {
  id: number;
  customer_id: number;
  name: string | null;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  google_maps_link: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  is_default: boolean;
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
  invoice_number?: string;
  invoice_status?: string;
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
  paymentPlan?: OrderPaymentPlan | null;
  payments?: OrderPayment[];
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
    | { kind: 'cancel-document'; docType: 'quotation' | 'billing_note' | 'invoice' | 'receipt'; number: string }
    | { kind: 'delete-installment-receipt'; paymentId: number; number: string }
    | { kind: 'convert-quotation' }
    | { kind: 'cancel-order' }
    | { kind: 'cancel-order-migration' }
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

  const [showInstallmentPlanModal, setShowInstallmentPlanModal] = useState(false);
  const [showInstallmentPaymentModal, setShowInstallmentPaymentModal] = useState(false);
  const [planInstallmentCount, setPlanInstallmentCount] = useState('12');
  const [planDownPayment, setPlanDownPayment] = useState('');
  const [planInstallmentAmount, setPlanInstallmentAmount] = useState('');
  const [planStartDate, setPlanStartDate] = useState('');
  const [planDueDay, setPlanDueDay] = useState('');
  const [installmentPayAmount, setInstallmentPayAmount] = useState('');
  const [installmentPayMethod, setInstallmentPayMethod] = useState<'cash' | 'transfer'>('cash');
  const [installmentPayDate, setInstallmentPayDate] = useState('');
  const [installmentPayNote, setInstallmentPayNote] = useState('');
  const [installmentUseExistingReceipt, setInstallmentUseExistingReceipt] = useState(false);
  const [installmentExistingReceiptNo, setInstallmentExistingReceiptNo] = useState('');
  const [installmentIssueReceipt, setInstallmentIssueReceipt] = useState(false);
  const [selectedInstallmentNo, setSelectedInstallmentNo] = useState<number | null>(null);
  const [installmentPaymentMode, setInstallmentPaymentMode] = useState<'next' | 'specific' | 'close'>('next');
  const [showBackpayModal, setShowBackpayModal] = useState(false);
  const [backpayInstallmentNo, setBackpayInstallmentNo] = useState('');
  const installmentScheduleRef = useRef<HTMLDivElement | null>(null);

  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [locationsLoading, setLocationsLoading] = useState(false);
  const [jobLocationId, setJobLocationId] = useState<string>('customer');
  const [jobManualAddress, setJobManualAddress] = useState('');
  const [billingLocationId, setBillingLocationId] = useState<string>('customer');
  const [billingManualAddress, setBillingManualAddress] = useState('');
  const [billingDifferentFromJob, setBillingDifferentFromJob] = useState(false);
  const [showAddLocationModal, setShowAddLocationModal] = useState(false);
  const [savingLocation, setSavingLocation] = useState(false);
  const [locationError, setLocationError] = useState<string | null>(null);
  const [addressPrefsReady, setAddressPrefsReady] = useState(false);
  const [addressPrefsSaving, setAddressPrefsSaving] = useState(false);
  const [addressPrefsSaveError, setAddressPrefsSaveError] = useState<string | null>(null);
  const [locationForm, setLocationForm] = useState({
    name: '',
    address: '',
    google_maps_link: '',
    contact_person: '',
    contact_phone: '',
    is_default: false,
  });

  const round2 = (n: number) => Math.round((n + Number.EPSILON) * 100) / 100;

  const formatMoney = (n: number) => n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

  const isLegacyInstallmentOrder = (o: Order) => {
    if (!o) return false;
    if (o.payment_method === 'installment' || !!o.paymentPlan) return false;
    const items = o.items || [];
    return items.some((it) => {
      const name = String(it?.product?.name || '');
      const sku = String(it?.product?.sku || '');
      return /INSTALLMENT/i.test(sku) || name.includes('ผ่อน') || name.includes('งวด');
    });
  };

  const normalizeOrder = (raw: any): Order => {
    const paymentPlan = raw?.paymentPlan ?? raw?.payment_plan ?? null;
    const payments = raw?.payments ?? raw?.order_payments ?? [];
    const items = raw?.items ?? [];
    const documents = raw?.documents ?? [];
    return {
      ...raw,
      paymentPlan,
      payments,
      items,
      documents,
    } as Order;
  };

  const getOrderStorageKey = (key: string) => `vendia:order:${id || 'unknown'}:${key}`;

  const extractLatLngFromGoogleMapsLink = (value: string) => {
    try {
      const trimmed = value.trim();
      if (!trimmed) return null;

      let url: URL | null = null;
      if (trimmed.startsWith('http')) {
        try {
          url = new URL(trimmed);
        } catch {
          url = null;
        }
      }

      if (url) {
        const q = url.searchParams.get('q') || url.searchParams.get('query');
        if (q) {
          const match = q.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
          if (match) {
            return {
              lat: parseFloat(match[1]),
              lng: parseFloat(match[3]),
            };
          }
        }

        const pathMatch = url.pathname.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
        if (pathMatch) {
          return {
            lat: parseFloat(pathMatch[1]),
            lng: parseFloat(pathMatch[3]),
          };
        }
      }

      const match = trimmed.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
      if (match) {
        return {
          lat: parseFloat(match[1]),
          lng: parseFloat(match[3]),
        };
      }
      return null;
    } catch {
      return null;
    }
  };

  const fetchCustomerLocations = async (customerId: number) => {
    setLocationsLoading(true);
    try {
      const res = await api.get(`/customers/${customerId}/locations`);
      const rows = Array.isArray(res.data) ? (res.data as CustomerLocation[]) : [];
      setCustomerLocations(rows);
      return rows;
    } catch (err) {
      console.error(err);
      setCustomerLocations([]);
      return [];
    } finally {
      setLocationsLoading(false);
    }
  };

  const findLocationById = (locId: string, locations: CustomerLocation[]) => {
    const n = Number(locId);
    if (!Number.isFinite(n)) return null;
    return locations.find((l) => Number(l.id) === n) || null;
  };

  const getBillingOverrides = (
    o: Order,
    locations: CustomerLocation[],
    locationId: string,
    manualAddress: string
  ) => {
    let address = '';
    let attention = '';
    if (locationId === 'manual') {
      address = manualAddress.trim();
    } else if (locationId !== 'customer') {
      const loc = findLocationById(locationId, locations);
      if (loc) {
        address = String(loc.address || '').trim();
        const aParts: string[] = [];
        if (loc.contact_person) aParts.push(String(loc.contact_person));
        if (loc.contact_phone) aParts.push(String(loc.contact_phone));
        attention = aParts.join(' ').trim();
      }
    }
    if (!address) address = String(o.customer?.address || '').trim();
    if (!attention) attention = String(o.customer?.contact_name || '').trim();
    return { address, attention };
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
      setOrder(normalizeOrder(res.data));
    } catch (error) {
      console.error('Failed to fetch order:', error);
      setUiMessage({ type: 'danger', text: t('orders.fetch_failed', 'ไม่สามารถดึงข้อมูลออเดอร์ได้') });
    } finally {
      setLoading(false);
    }
  };

  const getInstallmentPaidSum = (o: Order) => {
    const payments = o.payments || [];
    return payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  };

  const installmentData = useMemo(() => {
    if (!order) return null;
    const plan = order.paymentPlan || null;
    if (!plan) return null;

    const total = Number(plan.total || 0);
    const paid = getInstallmentPaidSum(order);
    const remaining = round2(total - paid);
    const count = plan.installment_count;
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

    const allPayments = (order.payments || []).slice().sort((a, b) => {
      const da = new Date(a.paid_at).getTime();
      const db = new Date(b.paid_at).getTime();
      if (da !== db) return da - db;
      return a.id - b.id;
    });
    const paymentsByNo = new Map<number, OrderPayment>();
    const unassigned: OrderPayment[] = [];
    for (const p of allPayments) {
      if (p.installment_no === null || p.installment_no === undefined) {
        unassigned.push(p);
      } else {
        paymentsByNo.set(Number(p.installment_no), p);
      }
    }

    const schedule: Array<{
      installment_no: number;
      label: string;
      due_date: Date | null;
      expected_amount: number;
    }> = [];
    if (down > 0) {
      schedule.push({
        installment_no: 0,
        label: t('orders.down_payment', 'เงินดาวน์'),
        due_date: startDate,
        expected_amount: expectedForNo(0),
      });
    }
    for (let i = 1; i <= count; i += 1) {
      schedule.push({
        installment_no: i,
        label: `${t('orders.installment_no', 'งวดที่')} ${i}/${count}`,
        due_date: toDueDate(i - 1),
        expected_amount: expectedForNo(i),
      });
    }

    const paidCount = schedule.filter((s) => paymentsByNo.has(s.installment_no)).length;
    const nextRow = schedule.find((s) => !paymentsByNo.has(s.installment_no)) || null;
    const today = new Date();
    const todayDate = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const overdueRows = schedule.filter((s) => {
      const isPaid = paymentsByNo.has(s.installment_no);
      if (isPaid) return false;
      if (!s.due_date) return false;
      return s.due_date < todayDate;
    });
    const overdueNos = new Set<number>(overdueRows.map((r) => r.installment_no));
    const overdueCount = overdueRows.length;
    const overdueAmount = round2(overdueRows.reduce((sum, r) => sum + Number(r.expected_amount || 0), 0));

    return {
      plan,
      total,
      paid,
      remaining,
      schedule,
      paymentsByNo,
      unassigned,
      paidCount,
      nextRow,
      overdueRows,
      overdueNos,
      overdueCount,
      overdueAmount,
    };
  }, [order, t]);

  const isInstallmentOrder = useMemo(() => {
    if (!order) return false;
    return order.payment_method === 'installment' || !!order.paymentPlan || isLegacyInstallmentOrder(order);
  }, [order]);

  const openInstallmentPlan = () => {
    if (!order) return;
    const existing = order.paymentPlan || null;
    setPlanInstallmentCount(String(existing?.installment_count || 12));
    setPlanDownPayment(existing?.down_payment ? String(existing.down_payment) : '');
    setPlanInstallmentAmount(existing?.installment_amount ? String(existing.installment_amount) : '');
    const start = existing?.start_date ? new Date(existing.start_date) : new Date(order.created_at);
    const startStr = new Date(start.getFullYear(), start.getMonth(), start.getDate()).toISOString().slice(0, 10);
    setPlanStartDate(existing?.start_date ? String(existing.start_date).slice(0, 10) : startStr);
    const due = existing?.due_day ?? start.getDate();
    setPlanDueDay(String(due));
    setShowInstallmentPlanModal(true);
  };

  const saveInstallmentPlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;

    const count = Math.max(1, Math.min(120, Number(planInstallmentCount || 1)));
    const down = Math.max(0, Number(planDownPayment || 0));
    const total = Number(order.total || 0);
    const computedAmount = round2(Math.max(0, total - down) / count);
    const amount = planInstallmentAmount.trim() !== '' ? Number(planInstallmentAmount) : computedAmount;
    const dueDayValue =
      planDueDay.trim() !== '' ? Math.max(1, Math.min(31, Number(planDueDay))) : null;

    try {
      const res = await api.post(`/orders/${order.id}/installment-plan`, {
        total,
        down_payment: down,
        installment_count: count,
        installment_amount: amount,
        start_date: planStartDate.trim() !== '' ? planStartDate : null,
        due_day: dueDayValue,
      });
      setOrder(normalizeOrder(res.data));
      setShowInstallmentPlanModal(false);
      setUiMessage({ type: 'success', text: t('common.success', 'สำเร็จ') });
    } catch (err) {
      console.error(err);
      setUiMessage({ type: 'danger', text: t('common.error', 'ไม่สำเร็จ') });
    }
  };

  const openInstallmentPayment = (installmentNo?: number | null) => {
    if (!order) return;
    const plan = order.paymentPlan;
    if (!plan) return;

    const count = plan.installment_count;
    const total = Number(plan.total || 0);
    const down = Number(plan.down_payment || 0);
    const base = Number(plan.installment_amount || 0);
    const installmentTotal = round2(Math.max(0, total - down));
    const lastAmount = round2(Math.max(0, installmentTotal - base * Math.max(0, count - 1)));
    const expectedForNo = (no: number) => {
      if (no === 0) return round2(down);
      if (no === count) return lastAmount;
      return round2(base);
    };
    const payments = order.payments || [];
    const paidNos = new Set<number>(payments.filter((p) => p.installment_no !== null && p.installment_no !== undefined).map((p) => Number(p.installment_no)));
    const nextNo = (() => {
      if (down > 0 && !paidNos.has(0)) return 0;
      for (let i = 1; i <= count; i += 1) {
        if (!paidNos.has(i)) return i;
      }
      return null;
    })();
    const targetNo = installmentNo !== undefined ? installmentNo : nextNo;
    setSelectedInstallmentNo(targetNo);
    setInstallmentPaymentMode(installmentNo === null ? 'close' : installmentNo === undefined ? 'next' : 'specific');

    const paidSum = getInstallmentPaidSum(order);
    const remaining = round2(total - paidSum);
    const suggested = installmentNo === null
      ? Math.max(0, remaining)
      : targetNo === null
        ? Math.min(Math.max(0, remaining), base || Math.max(0, remaining))
        : Math.min(expectedForNo(targetNo), Math.max(0, remaining));
    setInstallmentPayAmount(String(round2(suggested || 0)));
    setInstallmentPayMethod('cash');
    setInstallmentPayDate(new Date().toISOString().slice(0, 10));
    setInstallmentPayNote('');
    setInstallmentUseExistingReceipt(false);
    setInstallmentExistingReceiptNo('');
    setInstallmentIssueReceipt(false);
    setShowInstallmentPaymentModal(true);
  };

  const openBackpay = () => {
    if (!installmentData) return;
    if (installmentData.overdueRows.length === 0) return;
    setBackpayInstallmentNo(String(installmentData.overdueRows[0].installment_no));
    setShowBackpayModal(true);
  };

  const submitBackpaySelection = (e: React.FormEvent) => {
    e.preventDefault();
    const no = Number(backpayInstallmentNo);
    if (!Number.isFinite(no)) return;
    setShowBackpayModal(false);
    openInstallmentPayment(no);
  };

  const submitInstallmentPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order) return;
    try {
      const noteParts: string[] = [];
      if (installmentUseExistingReceipt && installmentExistingReceiptNo.trim() !== '') {
        noteParts.push(`${t('orders.existing_receipt', 'ใบเสร็จเดิม')}: ${installmentExistingReceiptNo.trim()}`);
      }
      if (installmentPayNote.trim() !== '') noteParts.push(installmentPayNote.trim());
      const note = noteParts.join(' · ');

      const res = await api.post(`/orders/${order.id}/installment-payments`, {
        amount: Number(installmentPayAmount || 0),
        method: installmentPayMethod,
        paid_at: installmentPayDate || null,
        installment_no: selectedInstallmentNo,
        issue_receipt: installmentIssueReceipt,
        issued_date: installmentPayDate || null,
        note: note === '' ? null : note,
      });
      setOrder(normalizeOrder(res.data));
      setShowInstallmentPaymentModal(false);
      setUiMessage({ type: 'success', text: t('orders.payment_success', 'รับชำระสำเร็จ') });
    } catch (err) {
      console.error(err);
      setUiMessage({ type: 'danger', text: t('orders.payment_failed', 'รับชำระไม่สำเร็จ') });
    }
  };

  const openReceiptPrintByDocId = (docId: number) => {
    if (!order) return;
    const params = new URLSearchParams();
    params.set('type', 'receipt');
    params.set('edit', '1');
    params.set('doc_id', String(docId));
    const effectiveBillingLocationId = billingDifferentFromJob ? billingLocationId : jobLocationId;
    const effectiveBillingManualAddress = billingDifferentFromJob ? billingManualAddress : jobManualAddress;
    const billing = getBillingOverrides(order, customerLocations, effectiveBillingLocationId, effectiveBillingManualAddress);
    if (billing.address) params.set('customer_address', billing.address);
    if (billing.attention) params.set('customer_attention', billing.attention);
    window.open(`/print/order/${order.id}?${params.toString()}`, '_blank');
  };

  const issueReceiptForPayment = async (paymentId: number) => {
    if (!order) return;
    try {
      const res = await api.post(`/order-payments/${paymentId}/issue-receipt`, {});
      const docId = res.data?.id;
      await fetchOrder();
      if (docId) {
        openReceiptPrintByDocId(Number(docId));
      }
    } catch (err) {
      console.error(err);
      setUiMessage({ type: 'danger', text: t('common.error', 'ไม่สำเร็จ') });
    }
  };

  const deleteReceiptForPayment = async (paymentId: number) => {
    if (!order) return;
    try {
      await api.post(`/order-payments/${paymentId}/delete-receipt`, {});
      await fetchOrder();
      setUiMessage({ type: 'success', text: t('common.success', 'สำเร็จ') });
    } catch (err) {
      console.error(err);
      setUiMessage({ type: 'danger', text: t('common.error', 'ไม่สำเร็จ') });
    }
  };

  const getPaymentReceiptDoc = (p: OrderPayment) => {
    const docs = p.documents || [];
    return docs.find((d) => d.type === 'receipt' && d.status !== 'cancelled') || docs.find((d) => d.type === 'receipt') || null;
  };

  useEffect(() => {
    fetchOrder();
  }, [id]);

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      try {
        if (event.origin !== window.location.origin) return;
        const data: any = event.data;
        if (!data || data.type !== 'vendia:order_updated') return;
        const incomingId = Number(data.orderId);
        if (!Number.isFinite(incomingId)) return;
        if (Number(id) !== incomingId) return;
        fetchOrder();
      } catch {
      }
    };
    window.addEventListener('message', onMessage);
    return () => window.removeEventListener('message', onMessage);
  }, [id]);

  useEffect(() => {
    if (!order?.customer?.id) return;
    const customerId = Number(order.customer.id);
    if (!Number.isFinite(customerId)) return;

    const init = async () => {
      setAddressPrefsReady(false);
      const locations = await fetchCustomerLocations(customerId);
      const defaultLoc = locations.find((l) => l.is_default) || locations[0] || null;

      const raw: any = order;
      const normalizeText = (v: any) => (v === null || v === undefined ? '' : String(v)).trim();
      const normalizeKey = (v: string) => v.trim().replace(/\s+/g, ' ').toLowerCase();
      const findLocationByAddress = (address: string) => {
        const key = normalizeKey(address);
        if (!key) return null;
        return locations.find((l) => normalizeKey(l.address || '') === key) || null;
      };

      const serverJobLocId =
        raw?.job_location_id ?? raw?.jobLocationId ?? raw?.job_customer_location_id ?? raw?.jobCustomerLocationId ?? null;
      const serverJobAddress =
        normalizeText(raw?.job_address ?? raw?.job_site_address ?? raw?.service_address ?? raw?.job_address_text ?? '');
      const serverBillingLocId =
        raw?.billing_location_id ?? raw?.billingLocationId ?? raw?.billing_customer_location_id ?? raw?.billingCustomerLocationId ?? null;
      const serverBillingAddress =
        normalizeText(raw?.billing_address ?? raw?.invoice_address ?? raw?.billing_address_text ?? '');

      const storedJob = localStorage.getItem(getOrderStorageKey('job_location_id'));
      const storedJobManual = localStorage.getItem(getOrderStorageKey('job_manual_address')) || '';
      const storedBilling = localStorage.getItem(getOrderStorageKey('billing_location_id'));
      const storedBillingManual = localStorage.getItem(getOrderStorageKey('billing_manual_address')) || '';
      const storedBillingDiff = localStorage.getItem(getOrderStorageKey('billing_diff'));
      const storedBillingDiffBool = storedBillingDiff === '1' || storedBillingDiff === 'true';

      const customerAddress = normalizeText(order.customer?.address || '');

      const jobNext = (() => {
        if (serverJobLocId) {
          const s = String(serverJobLocId);
          if (findLocationById(s, locations)) return s;
        }
        if (serverJobAddress && serverJobAddress !== customerAddress) {
          const matched = findLocationByAddress(serverJobAddress);
          if (matched) return String(matched.id);
          setJobManualAddress(serverJobAddress);
          return 'manual';
        }
        if (defaultLoc && (storedJob === 'customer' || (storedJob === 'manual' && storedJobManual.trim() === ''))) {
          return String(defaultLoc.id);
        }
        if (storedJob && (storedJob === 'customer' || storedJob === 'manual' || !!findLocationById(storedJob, locations))) {
          return storedJob;
        }
        return defaultLoc ? String(defaultLoc.id) : 'customer';
      })();

      const billingNext = (() => {
        if (serverBillingLocId) {
          const s = String(serverBillingLocId);
          if (findLocationById(s, locations)) return s;
        }
        if (serverBillingAddress && serverBillingAddress !== customerAddress) {
          const matched = findLocationByAddress(serverBillingAddress);
          if (matched) return String(matched.id);
          setBillingManualAddress(serverBillingAddress);
          return 'manual';
        }
        if (defaultLoc && (storedBilling === 'customer' || (storedBilling === 'manual' && storedBillingManual.trim() === ''))) {
          return String(defaultLoc.id);
        }
        if (storedBilling && (storedBilling === 'customer' || storedBilling === 'manual' || !!findLocationById(storedBilling, locations))) {
          return storedBilling;
        }
        return defaultLoc ? String(defaultLoc.id) : 'customer';
      })();

      setJobLocationId(jobNext);
      if (!(serverJobAddress && serverJobAddress !== customerAddress)) setJobManualAddress(storedJobManual);
      setBillingLocationId(billingNext);
      if (!(serverBillingAddress && serverBillingAddress !== customerAddress)) setBillingManualAddress(storedBillingManual);
      const serverHasBilling = !!serverBillingLocId || (serverBillingAddress && serverBillingAddress !== '');
      const serverHasJob = !!serverJobLocId || (serverJobAddress && serverJobAddress !== '');
      const inferredServerDiff = serverHasBilling
        ? (() => {
            if (serverHasJob) {
              const jobLocKey = serverJobLocId ? String(serverJobLocId) : '';
              const billingLocKey = serverBillingLocId ? String(serverBillingLocId) : '';
              if (jobLocKey && billingLocKey) return jobLocKey !== billingLocKey;
              const jobAddrKey = normalizeKey(serverJobAddress || customerAddress || '');
              const billingAddrKey = normalizeKey(serverBillingAddress || customerAddress || '');
              return jobAddrKey !== '' && billingAddrKey !== '' && jobAddrKey !== billingAddrKey;
            }
            return true;
          })()
        : storedBillingDiffBool;
      setBillingDifferentFromJob(Boolean(inferredServerDiff));
      setAddressPrefsReady(true);
    };

    init();
  }, [order?.customer?.id]);

  useEffect(() => {
    if (!order?.id) return;
    if (!addressPrefsReady) return;
    if (!order?.customer?.id) return;
    const tmr = window.setTimeout(async () => {
      try {
        setAddressPrefsSaving(true);
        setAddressPrefsSaveError(null);

        const jobLocIdOut =
          jobLocationId !== 'customer' && jobLocationId !== 'manual' && Number.isFinite(Number(jobLocationId))
            ? Number(jobLocationId)
            : null;
        const jobLocOut = jobLocIdOut ? findLocationById(String(jobLocIdOut), customerLocations) : null;
        const jobAddressOut =
          jobLocationId === 'manual'
            ? jobManualAddress.trim() || null
            : jobLocOut?.address
              ? String(jobLocOut.address).trim() || null
              : null;

        const effectiveBillingLocationId = billingDifferentFromJob ? billingLocationId : jobLocationId;
        const effectiveBillingManualAddress = billingDifferentFromJob ? billingManualAddress : jobManualAddress;
        const billingLocIdOut =
          effectiveBillingLocationId !== 'customer' && effectiveBillingLocationId !== 'manual' && Number.isFinite(Number(effectiveBillingLocationId))
            ? Number(effectiveBillingLocationId)
            : null;
        const billing = getBillingOverrides(order, customerLocations, effectiveBillingLocationId, effectiveBillingManualAddress);

        const payload: any = {
          job_location_id: jobLocIdOut,
          job_address: jobAddressOut,
          billing_location_id: billingLocIdOut,
          billing_address: billing.address || null,
          billing_attention: billing.attention || null,
        };

        if (jobLocOut?.google_maps_link) payload.job_google_maps_link = jobLocOut.google_maps_link;
        if (jobLocOut?.contact_person) payload.job_contact_person = jobLocOut.contact_person;
        if (jobLocOut?.contact_phone) payload.job_contact_phone = jobLocOut.contact_phone;

        await api.put(`/orders/${order.id}`, payload);
      } catch (err) {
        console.error(err);
        setAddressPrefsSaveError(t('orders.address_save_failed', 'บันทึกที่อยู่ลงออเดอร์ไม่สำเร็จ (ระบบจะจำไว้ในเครื่องแทน)'));
      } finally {
        setAddressPrefsSaving(false);
      }
    }, 600);
    return () => window.clearTimeout(tmr);
  }, [
    order?.id,
    addressPrefsReady,
    order?.customer?.id,
    jobLocationId,
    jobManualAddress,
    billingLocationId,
    billingManualAddress,
    billingDifferentFromJob,
    customerLocations,
  ]);

  useEffect(() => {
    if (!id) return;
    if (!addressPrefsReady) return;
    try {
      localStorage.setItem(getOrderStorageKey('job_location_id'), jobLocationId);
      localStorage.setItem(getOrderStorageKey('job_manual_address'), jobManualAddress);
      localStorage.setItem(getOrderStorageKey('billing_location_id'), billingLocationId);
      localStorage.setItem(getOrderStorageKey('billing_manual_address'), billingManualAddress);
      localStorage.setItem(getOrderStorageKey('billing_diff'), billingDifferentFromJob ? '1' : '0');
    } catch {
    }
  }, [id, jobLocationId, jobManualAddress, billingLocationId, billingManualAddress, billingDifferentFromJob, addressPrefsReady]);

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

  const getDocumentHistory = (o: Order, type: 'quotation' | 'billing_note' | 'invoice' | 'receipt') => {
    const docsAll = (o.documents || []).filter(d => d.type === type);
    const docs = type === 'receipt' ? docsAll.filter((d) => !d.order_payment_id) : docsAll;
    const currentNumber =
      type === 'quotation'
        ? o.quotation_number
        : type === 'billing_note'
          ? o.billing_note_number
          : type === 'invoice'
            ? o.invoice_number
            : o.receipt_number;
    const currentStatus =
      type === 'quotation'
        ? o.quotation_status
        : type === 'billing_note'
          ? o.billing_note_status
          : type === 'invoice'
            ? o.invoice_status
            : o.receipt_status;

    if (!currentNumber || docs.some(d => d.number === currentNumber)) return docs;

    return [
      {
        id: -o.id * 10 - (type === 'quotation' ? 1 : type === 'billing_note' ? 2 : type === 'invoice' ? 3 : 4),
        type,
        number: currentNumber,
        status: currentStatus || 'active',
        created_at: o.created_at,
      },
      ...docs,
    ];
  };

  const handlePrint = async (o: Order, type: 'receipt' | 'quotation' | 'billing_note' | 'invoice') => {
    const currentNumber =
      type === 'quotation'
        ? o.quotation_number
        : type === 'billing_note'
          ? o.billing_note_number
          : type === 'invoice'
            ? o.invoice_number
            : o.receipt_number;

    let docId = o.documents?.find((d) => d.type === type && d.number === currentNumber)?.id;
    if (!docId && currentNumber) {
      try {
        let page = 1;
        let lastPage = 3;
        while (!docId && page <= lastPage && page <= 3) {
          const params = new URLSearchParams();
          params.set('page', String(page));
          params.set('per_page', '200');
          params.set('type', type);
          params.set('status', 'active');
          const res = await api.get(`/documents?${params.toString()}`);
          const apiData = (res as any)?.data;
          const rowsRaw = apiData?.data ?? apiData;
          const rows = Array.isArray(rowsRaw) ? rowsRaw : [];
          const matched = rows.find((d: any) => {
            return d?.type === type && String(d?.number) === String(currentNumber) && Number(d?.order?.id) === Number(o.id);
          });
          docId = matched?.id ? Number(matched.id) : docId;
          if (typeof apiData?.last_page === 'number' && Number.isFinite(apiData.last_page)) {
            lastPage = apiData.last_page;
          }
          page += 1;
        }
      } catch {
      }
    }
    const params = new URLSearchParams();
    params.set('type', type);
    params.set('edit', '1');
    const effectiveBillingLocationId = billingDifferentFromJob ? billingLocationId : jobLocationId;
    const effectiveBillingManualAddress = billingDifferentFromJob ? billingManualAddress : jobManualAddress;
    const billing = getBillingOverrides(o, customerLocations, effectiveBillingLocationId, effectiveBillingManualAddress);
    if (billing.address) params.set('customer_address', billing.address);
    if (billing.attention) params.set('customer_attention', billing.attention);
    if (docId) params.set('doc_id', String(docId));
    window.open(`/print/order/${o.id}?${params.toString()}`, '_blank');
  };

  const handleIssueDocument = async (orderId: number, type: 'quotation' | 'billing_note' | 'invoice' | 'receipt') => {
    try {
      await api.post(`/orders/${orderId}/issue-document`, { type });
      await fetchOrder();
      setUiMessage({ type: 'success', text: t('orders.update_success') });
    } catch (error) {
      console.error('Failed to issue document:', error);
      setUiMessage({ type: 'danger', text: t('orders.update_failed') });
    }
  };

  const handleCancelDocument = async (orderId: number, type: 'quotation' | 'billing_note' | 'invoice' | 'receipt') => {
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

  const openAddLocation = () => {
    setLocationError(null);
    setLocationForm({
      name: '',
      address: '',
      google_maps_link: '',
      contact_person: '',
      contact_phone: '',
      is_default: false,
    });
    setShowAddLocationModal(true);
  };

  const saveLocation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!order?.customer?.id) return;
    const customerId = Number(order.customer.id);
    if (!Number.isFinite(customerId)) return;
    if (!locationForm.address.trim()) {
      setLocationError(t('customers.locations.address_required', 'กรุณากรอกที่อยู่'));
      return;
    }
    setSavingLocation(true);
    setLocationError(null);
    try {
      const coords = extractLatLngFromGoogleMapsLink(locationForm.google_maps_link);
      const res = await api.post('/customer-locations', {
        customer_id: customerId,
        name: locationForm.name.trim() || null,
        address: locationForm.address.trim(),
        latitude: coords ? coords.lat : null,
        longitude: coords ? coords.lng : null,
        google_maps_link: locationForm.google_maps_link.trim() || null,
        contact_person: locationForm.contact_person.trim() || null,
        contact_phone: locationForm.contact_phone.trim() || null,
        is_default: !!locationForm.is_default,
      });
      const createdId = res?.data?.id ? String(res.data.id) : null;
      await fetchCustomerLocations(customerId);
      if (createdId) setJobLocationId(createdId);
      setShowAddLocationModal(false);
      setUiMessage({ type: 'success', text: t('common.success', 'สำเร็จ') });
    } catch (err) {
      console.error(err);
      setLocationError(t('customers.locations.save_failed', 'ไม่สามารถบันทึกที่อยู่ได้'));
    } finally {
      setSavingLocation(false);
    }
  };

  const customer = order?.customer;

  if (loading) return <div className="p-4 text-center">{t('common.loading')}</div>;
  if (!order) return <div className="p-4 text-center text-muted">{t('orders.not_found', 'ไม่พบออเดอร์')}</div>;

  const installmentReceiptCount = (order.documents || []).filter((d) => d.type === 'receipt' && d.order_payment_id).length;
  const jobLoc = jobLocationId !== 'customer' && jobLocationId !== 'manual' ? findLocationById(jobLocationId, customerLocations) : null;
  const jobDisplayAddress =
    jobLocationId === 'manual' ? jobManualAddress.trim() : (jobLoc?.address ? String(jobLoc.address) : (customer?.address || '')).trim();
  const effectiveBillingLocationId = billingDifferentFromJob ? billingLocationId : jobLocationId;
  const effectiveBillingManualAddress = billingDifferentFromJob ? billingManualAddress : jobManualAddress;
  const billingLoc =
    effectiveBillingLocationId !== 'customer' && effectiveBillingLocationId !== 'manual'
      ? findLocationById(effectiveBillingLocationId, customerLocations)
      : null;
  const billingPreview = getBillingOverrides(order, customerLocations, effectiveBillingLocationId, effectiveBillingManualAddress);
  const totalSummary = Number(order.total || 0);
  const paidSummary = installmentData ? Number(installmentData.paid || 0) : order.status === 'completed' ? totalSummary : 0;
  const remainingSummary = installmentData ? Math.max(0, Number(installmentData.remaining || 0)) : order.status === 'completed' ? 0 : totalSummary;

  const subtotalForTaxRaw = Number(order.subtotal ?? order.total ?? 0);
  const subtotalForTax = Number.isFinite(subtotalForTaxRaw) ? subtotalForTaxRaw : 0;
  const vatRateRawUncast = Number(order.vat_rate || 0);
  const vatRateRaw = Number.isFinite(vatRateRawUncast) ? vatRateRawUncast : 0;
  const vatPercent = vatRateRaw > 0 && vatRateRaw <= 1 ? vatRateRaw * 100 : vatRateRaw;
  const vatAmount =
    order.vat_amount !== undefined && order.vat_amount !== null && String(order.vat_amount).trim() !== ''
      ? Number(order.vat_amount)
      : round2(subtotalForTax * (vatPercent / 100));
  const withholdingRateRawUncast = Number(order.withholding_rate || 0);
  const withholdingRateRaw = Number.isFinite(withholdingRateRawUncast) ? withholdingRateRawUncast : 0;
  const withholdingPercent = withholdingRateRaw > 0 && withholdingRateRaw <= 1 ? withholdingRateRaw * 100 : withholdingRateRaw;
  const withholdingAmount =
    order.withholding_amount !== undefined && order.withholding_amount !== null && String(order.withholding_amount).trim() !== ''
      ? Number(order.withholding_amount)
      : round2(subtotalForTax * (withholdingPercent / 100));
  const payableAfterTax = round2(subtotalForTax + vatAmount - withholdingAmount);

  const jobLat = jobLoc?.latitude !== null && jobLoc?.latitude !== undefined && String(jobLoc.latitude).trim() !== '' ? Number(jobLoc.latitude) : null;
  const jobLng = jobLoc?.longitude !== null && jobLoc?.longitude !== undefined && String(jobLoc.longitude).trim() !== '' ? Number(jobLoc.longitude) : null;
  const jobMapEmbedSrc =
    jobLat !== null && jobLng !== null && Number.isFinite(jobLat) && Number.isFinite(jobLng)
      ? `https://www.google.com/maps?q=${jobLat},${jobLng}&output=embed`
      : jobDisplayAddress
        ? `https://www.google.com/maps?q=${encodeURIComponent(jobDisplayAddress)}&output=embed`
        : '';
  const jobMapLinkHref = jobLoc?.google_maps_link
    ? String(jobLoc.google_maps_link)
    : jobDisplayAddress
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(jobDisplayAddress)}`
      : '';
  const issuedDocumentsBody = (
    <>
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
              <span className="fw-bold">{t('orders.invoice', 'ใบแจ้งหนี้')}</span>
              {(!order.invoice_number || order.invoice_status === 'cancelled') && (
                <button
                  className="btn btn-outline-primary p-0 d-inline-flex align-items-center justify-content-center"
                  onClick={() => handleIssueDocument(order.id, 'invoice')}
                  title={t('orders.create')}
                  style={{ width: '40px', height: '40px' }}
                >
                  <i className="bi bi-plus-lg" style={{ fontSize: '1.1rem' }}></i>
                </button>
              )}
            </div>

            {getDocumentHistory(order, 'invoice').map(doc => (
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
                        onClick={() => handlePrint(order, 'invoice')}
                        title={t('orders.print')}
                        style={{ width: '40px', height: '40px' }}
                      >
                        <i className="bi bi-printer" style={{ fontSize: '1.05rem' }}></i>
                      </button>
                      <button
                        className="btn btn-outline-danger p-0 d-inline-flex align-items-center justify-content-center"
                        onClick={() => setConfirmAction({ kind: 'cancel-document', docType: 'invoice', number: doc.number })}
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
            {getDocumentHistory(order, 'invoice').length === 0 && (
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
            {installmentReceiptCount > 0 && (
              <div className="small text-muted ps-2 mt-2">
                {t('orders.installment_receipts', 'ใบเสร็จรายงวด')}: {installmentReceiptCount}
              </div>
            )}
          </li>
        </ul>
      </div>

      <div className="d-block d-md-none">
        <div className="d-flex flex-column gap-2">
          {(['quotation', 'billing_note', 'invoice', 'receipt'] as const).map((docType) => {
            const title =
              docType === 'quotation'
                ? t('orders.quotation')
                : docType === 'billing_note'
                  ? t('orders.billing_note')
                  : docType === 'invoice'
                    ? t('orders.invoice', 'ใบแจ้งหนี้')
                  : t('orders.receipt');
            const canCreate =
              docType === 'quotation'
                ? !order.quotation_number || order.quotation_status === 'cancelled'
                : docType === 'billing_note'
                  ? !order.billing_note_number || order.billing_note_status === 'cancelled'
                  : docType === 'invoice'
                    ? !order.invoice_number || order.invoice_status === 'cancelled'
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
                  {history.length > 0 ? (
                    <div className="d-flex flex-column gap-2">
                      {history.map((doc) => (
                        <div key={doc.id} className="border rounded p-2">
                          <div className="d-flex justify-content-between align-items-start gap-2">
                            <div style={{ minWidth: 0 }}>
                              <div className={`font-monospace small ${doc.status === 'cancelled' ? 'text-danger text-decoration-line-through' : 'text-success'}`}>
                                {doc.number}
                              </div>
                              <div className="small text-muted">
                                {new Date(doc.created_at).toLocaleDateString()}
                              </div>
                            </div>
                            <div className="d-flex gap-2">
                              {doc.status !== 'cancelled' ? (
                                <>
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary btn-sm"
                                    onClick={() => handlePrint(order, docType)}
                                  >
                                    {t('orders.print', 'พิมพ์')}
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger btn-sm"
                                    onClick={() => setConfirmAction({ kind: 'cancel-document', docType, number: doc.number })}
                                  >
                                    {t('common.cancel', 'ยกเลิก')}
                                  </button>
                                </>
                              ) : (
                                <span className="badge bg-danger" style={{ fontSize: '0.7em' }}>{t('orders.document_cancelled')}</span>
                              )}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="text-muted small">{t('orders.not_issued')}</div>
                  )}
                  {docType === 'receipt' && installmentReceiptCount > 0 && (
                    <div className="small text-muted mt-2">
                      {t('orders.installment_receipts', 'ใบเสร็จรายงวด')}: {installmentReceiptCount}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </>
  );

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
              : confirmAction.kind === 'delete-installment-receipt'
                ? t('orders.confirm_delete_document', { number: confirmAction.number, defaultValue: `ต้องการลบเอกสาร ${confirmAction.number} ถาวรใช่ไหม?` })
              : confirmAction.kind === 'cancel-order-migration'
                ? t('orders.confirm_cancel_order_migration', 'ต้องการยกเลิกออเดอร์นี้เพื่อไม่ให้นับยอดซ้ำ (ใช้สำหรับย้ายข้อมูล) ใช่ไหม?')
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
            } else if (confirmAction.kind === 'delete-installment-receipt') {
              await deleteReceiptForPayment(confirmAction.paymentId);
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
              {user?.role === 'admin' && order.status === 'completed' && isLegacyInstallmentOrder(order) && (
                <li>
                  <button
                    className="dropdown-item text-danger"
                    type="button"
                    onClick={() => {
                      setMoreMenuOpen(false);
                      setConfirmAction({ kind: 'cancel-order-migration' });
                    }}
                  >
                    {t('orders.cancel_for_migration', 'ยกเลิกเพื่อไม่ให้นับยอด (ย้ายข้อมูล)')}
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
                    className={`dropdown-item text-danger${isLegacyInstallmentOrder(order) ? ' disabled' : ''}`}
                    type="button"
                    disabled={isLegacyInstallmentOrder(order)}
                    onClick={() => {
                      if (isLegacyInstallmentOrder(order)) return;
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

      <div className="d-none d-md-flex flex-wrap gap-2 mb-4 justify-content-end">
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
            {user?.role === 'admin' && order.status === 'completed' && isLegacyInstallmentOrder(order) && (
              <li>
                <button
                  className="dropdown-item text-danger"
                  type="button"
                  onClick={() => {
                    setMoreMenuOpen(false);
                    setConfirmAction({ kind: 'cancel-order-migration' });
                  }}
                >
                  {t('orders.cancel_for_migration', 'ยกเลิกเพื่อไม่ให้นับยอด (ย้ายข้อมูล)')}
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
                  className={`dropdown-item text-danger${isLegacyInstallmentOrder(order) ? ' disabled' : ''}`}
                  type="button"
                  disabled={isLegacyInstallmentOrder(order)}
                  onClick={() => {
                    if (isLegacyInstallmentOrder(order)) return;
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

      <div className="row g-3 mb-4">
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="small text-muted">{t('orders.total', 'ยอดรวม')}</div>
              <div className="fw-bold fs-4 text-primary">฿{formatMoney(totalSummary)}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="small text-muted">{t('orders.paid', 'ชำระแล้ว')}</div>
              <div className="fw-bold fs-4 text-success">฿{formatMoney(paidSummary)}</div>
            </div>
          </div>
        </div>
        <div className="col-12 col-md-4">
          <div className="card border-0 shadow-sm h-100">
            <div className="card-body">
              <div className="small text-muted">{t('orders.remaining', 'คงเหลือ')}</div>
              <div className="fw-bold fs-4 text-danger">฿{formatMoney(remainingSummary)}</div>
            </div>
          </div>
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

      {showInstallmentPlanModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('orders.setup_installment', 'ตั้งผ่อนชำระ')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowInstallmentPlanModal(false)}></button>
              </div>
              <form onSubmit={saveInstallmentPlan}>
                <div className="modal-body">
                  <div className="alert alert-light border small mb-3">
                    <div className="d-flex justify-content-between">
                      <span className="text-muted">{t('orders.total', 'ยอดรวม')}</span>
                      <span className="fw-bold">฿{formatMoney(Number(order.total || 0))}</span>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('orders.installment_count', 'จำนวนงวด')}</label>
                    <input
                      type="number"
                      min={1}
                      max={120}
                      className="form-control"
                      value={planInstallmentCount}
                      onChange={(e) => setPlanInstallmentCount(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('orders.down_payment', 'เงินดาวน์')}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="form-control"
                      value={planDownPayment}
                      onChange={(e) => setPlanDownPayment(e.target.value)}
                      placeholder="0"
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('orders.installment_amount', 'ยอดต่องวด')}</label>
                    <input
                      type="number"
                      min={0}
                      step="0.01"
                      className="form-control"
                      value={planInstallmentAmount}
                      onChange={(e) => setPlanInstallmentAmount(e.target.value)}
                      placeholder={(() => {
                        const count = Math.max(1, Math.min(120, Number(planInstallmentCount || 1)));
                        const down = Math.max(0, Number(planDownPayment || 0));
                        const total = Number(order.total || 0);
                        return String(round2(Math.max(0, total - down) / count));
                      })()}
                    />
                    <div className="form-text">
                      {t('orders.installment_amount_hint', 'เว้นว่างเพื่อให้ระบบคำนวณให้')}
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('orders.start_date', 'วันที่เริ่มผ่อน')}</label>
                    <input
                      type="date"
                      className="form-control"
                      value={planStartDate}
                      onChange={(e) => setPlanStartDate(e.target.value)}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('orders.due_day', 'วันครบกำหนด (ของทุกเดือน)')}</label>
                    <input
                      type="number"
                      min={1}
                      max={31}
                      className="form-control"
                      value={planDueDay}
                      onChange={(e) => setPlanDueDay(e.target.value)}
                      placeholder={t('orders.due_day_hint', 'เช่น 10')}
                    />
                    <div className="form-text">
                      {t('orders.due_day_note', 'ถ้าเดือนไหนไม่มีวันนั้น ระบบจะเลื่อนไปวันสุดท้ายของเดือน')}
                    </div>
                  </div>
                </div>
                <div className="modal-footer d-grid gap-2 d-md-flex justify-content-end">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowInstallmentPlanModal(false)}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t('common.save', 'บันทึก')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showBackpayModal && installmentData && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('orders.backpay', 'ชำระย้อนหลัง')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowBackpayModal(false)}></button>
              </div>
              <form onSubmit={submitBackpaySelection}>
                <div className="modal-body">
                  <div className="small text-muted mb-2">{t('orders.backpay_hint', 'เลือกงวดที่ค้างชำระ')}</div>
                  <select
                    className="form-select"
                    value={backpayInstallmentNo}
                    onChange={(e) => setBackpayInstallmentNo(e.target.value)}
                    required
                  >
                    {installmentData.overdueRows.map((row) => {
                      const dueText = row.due_date
                        ? row.due_date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                        : '-';
                      return (
                        <option key={row.installment_no} value={row.installment_no}>
                          {row.label} · {dueText} · ฿{formatMoney(Number(row.expected_amount || 0))}
                        </option>
                      );
                    })}
                  </select>
                </div>
                <div className="modal-footer d-grid gap-2 d-md-flex justify-content-end">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowBackpayModal(false)}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-danger">
                    {t('orders.receive_payment', 'รับชำระ')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showInstallmentPaymentModal && order.paymentPlan && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {selectedInstallmentNo === 0
                    ? t('orders.down_payment', 'เงินดาวน์')
                    : selectedInstallmentNo
                      ? `${t('orders.installment', 'ผ่อนชำระ')} · ${t('orders.installment_no', 'งวดที่')} ${selectedInstallmentNo}/${order.paymentPlan.installment_count}`
                      : installmentPaymentMode === 'close'
                        ? t('orders.close_account', 'ปิดบัญชี')
                        : t('orders.receive_payment', 'รับชำระงวด')}
                </h5>
                <button type="button" className="btn-close" onClick={() => { setShowInstallmentPaymentModal(false); setInstallmentPaymentMode('next'); }}></button>
              </div>
              <form onSubmit={submitInstallmentPayment}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('pos.payment_method')}</label>
                    <div className="btn-group w-100" role="group">
                      <input
                        type="radio"
                        className="btn-check"
                        name="installmentPayMethod"
                        id="installmentPayCash"
                        autoComplete="off"
                        checked={installmentPayMethod === 'cash'}
                        onChange={() => setInstallmentPayMethod('cash')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="installmentPayCash">{t('pos.cash')}</label>
                      <input
                        type="radio"
                        className="btn-check"
                        name="installmentPayMethod"
                        id="installmentPayTransfer"
                        autoComplete="off"
                        checked={installmentPayMethod === 'transfer'}
                        onChange={() => setInstallmentPayMethod('transfer')}
                      />
                      <label className="btn btn-outline-primary" htmlFor="installmentPayTransfer">{t('pos.transfer')}</label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('orders.payment_date', 'วันที่ชำระ')}</label>
                    <input
                      type="date"
                      className="form-control"
                      value={installmentPayDate}
                      onChange={(e) => setInstallmentPayDate(e.target.value)}
                      required
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('orders.amount', 'จำนวนเงิน')}</label>
                    <input
                      type="number"
                      min={0.01}
                      step="0.01"
                      className="form-control form-control-lg"
                      value={installmentPayAmount}
                      onChange={(e) => setInstallmentPayAmount(e.target.value)}
                      required
                      autoFocus
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('common.note', 'หมายเหตุ')}</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={installmentPayNote}
                      onChange={(e) => setInstallmentPayNote(e.target.value)}
                      placeholder={t('orders.payment_note_placeholder', 'เช่น ย้ายข้อมูลจากออเดอร์เดิม #123 (งวด 2)')}
                    />
                  </div>

                  <div className="mb-3">
                    <div className="form-check">
                      <input
                        className="form-check-input"
                        type="checkbox"
                        id="installmentUseExistingReceipt"
                        checked={installmentUseExistingReceipt}
                        onChange={(e) => {
                          const checked = e.target.checked;
                          setInstallmentUseExistingReceipt(checked);
                          if (checked) setInstallmentIssueReceipt(false);
                        }}
                      />
                      <label className="form-check-label fw-bold" htmlFor="installmentUseExistingReceipt">
                        {t('orders.use_existing_receipt', 'มีใบเสร็จเดิม (ไม่ออกใหม่)')}
                      </label>
                    </div>
                    {installmentUseExistingReceipt && (
                      <input
                        className="form-control mt-2"
                        value={installmentExistingReceiptNo}
                        onChange={(e) => setInstallmentExistingReceiptNo(e.target.value)}
                        placeholder={t('orders.existing_receipt_placeholder', 'เลขที่ใบเสร็จเดิม เช่น RC-2024-000123')}
                      />
                    )}
                  </div>

                  <div className="form-check">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="installmentIssueReceipt"
                      checked={installmentIssueReceipt}
                      onChange={(e) => {
                        const checked = e.target.checked;
                        setInstallmentIssueReceipt(checked);
                        if (checked) setInstallmentUseExistingReceipt(false);
                      }}
                    />
                    <label className="form-check-label fw-bold" htmlFor="installmentIssueReceipt">
                      {t('orders.issue_receipt', 'ออกใบเสร็จงวดนี้')}
                    </label>
                  </div>
                </div>
                <div className="modal-footer d-grid gap-2 d-md-flex justify-content-end">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => { setShowInstallmentPaymentModal(false); setInstallmentPaymentMode('next'); }}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary">
                    {t('orders.confirm_payment', 'ยืนยันการชำระเงิน')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {showAddLocationModal && customer?.id && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-fullscreen-sm-down">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('customers.locations.add_title', 'เพิ่มที่อยู่')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddLocationModal(false)}></button>
              </div>
              <form onSubmit={saveLocation}>
                <div className="modal-body">
                  {locationError && <div className="alert alert-danger py-2 mb-3">{locationError}</div>}
                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('customers.locations.name_label', 'ชื่อสถานที่ (เช่น บ้าน, ออฟฟิศ)')}</label>
                    <input
                      className="form-control"
                      value={locationForm.name}
                      onChange={(e) => setLocationForm((p) => ({ ...p, name: e.target.value }))}
                      placeholder={t('customers.locations.name_placeholder', 'บ้าน')}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('customers.locations.address_label', 'ที่อยู่')}</label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={locationForm.address}
                      onChange={(e) => setLocationForm((p) => ({ ...p, address: e.target.value }))}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('customers.locations.google_maps_link', 'ลิงก์ Google Maps')}</label>
                    <input
                      className="form-control"
                      value={locationForm.google_maps_link}
                      onChange={(e) => setLocationForm((p) => ({ ...p, google_maps_link: e.target.value }))}
                      placeholder="https://maps.google.com/..."
                    />
                  </div>
                  <div className="row g-3">
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold">{t('customers.locations.contact_person', 'ชื่อผู้ติดต่อ (ไม่บังคับ)')}</label>
                      <input
                        className="form-control"
                        value={locationForm.contact_person}
                        onChange={(e) => setLocationForm((p) => ({ ...p, contact_person: e.target.value }))}
                      />
                    </div>
                    <div className="col-12 col-md-6">
                      <label className="form-label fw-bold">{t('customers.locations.contact_phone', 'เบอร์โทรผู้ติดต่อ (ไม่บังคับ)')}</label>
                      <input
                        className="form-control"
                        value={locationForm.contact_phone}
                        onChange={(e) => setLocationForm((p) => ({ ...p, contact_phone: e.target.value }))}
                      />
                    </div>
                  </div>
                  <div className="form-check mt-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="addCustomerLocationDefault"
                      checked={locationForm.is_default}
                      onChange={(e) => setLocationForm((p) => ({ ...p, is_default: e.target.checked }))}
                    />
                    <label className="form-check-label fw-bold" htmlFor="addCustomerLocationDefault">
                      {t('customers.locations.set_default', 'ตั้งเป็นที่อยู่หลัก')}
                    </label>
                  </div>
                </div>
                <div className="modal-footer d-grid gap-2 d-md-flex justify-content-end">
                  <button type="button" className="btn btn-outline-secondary" onClick={() => setShowAddLocationModal(false)}>
                    {t('common.cancel')}
                  </button>
                  <button type="submit" className="btn btn-primary" disabled={savingLocation}>
                    {savingLocation ? t('common.loading') : t('common.save', 'บันทึก')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      <div className="row g-3 mb-4">
        <div className={`col-12${customer?.id ? ' col-lg-3' : ' col-lg-6'}`}>
          <div className="card border-0 shadow-sm h-100">
            <div
              className="card-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2"
              style={{ backgroundColor: '#F4F5FF' }}
            >
              <div className="fw-bold d-flex align-items-center gap-2">
                <i className="bi bi-person"></i>
                <span>{t('orders.customer', 'ลูกค้า')}</span>
              </div>
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
        </div>

        <div className={`col-12${customer?.id ? ' col-lg-3' : ' col-lg-6'}`}>
          <div className="card border-0 shadow-sm h-100">
            <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#F4F5FF' }}>
              <div className="fw-bold d-flex align-items-center gap-2">
                <i className="bi bi-receipt"></i>
                <span>{t('orders.order_details', 'รายละเอียดออเดอร์')}</span>
              </div>
            </div>
            <div className="card-body">
              <div className="row g-3">
                <div className="col-12 col-md-6 col-lg-12">
                  <div className="small text-muted">{t('orders.payment_method', 'วิธีชำระ')}</div>
                  <div className="fw-semibold">
                    {order.payment_method === 'cash'
                      ? t('pos.cash', 'เงินสด')
                      : order.payment_method === 'transfer'
                        ? t('pos.transfer', 'โอนเงิน')
                        : order.payment_method === 'installment'
                          ? t('orders.installment', 'ผ่อนชำระ')
                          : order.payment_method || '-'}
                  </div>
                </div>
                <div className="col-12 col-md-6 col-lg-12">
                  <div className="small text-muted">{t('orders.staff', 'พนักงาน')}</div>
                  <div className="fw-semibold">{order.user?.name || '-'}</div>
                </div>
              </div>

              <div className="border-top mt-3 pt-3">
                <div className="d-flex justify-content-between">
                  <span className="text-muted">{t('pos.subtotal_before_tax', 'ยอดก่อนภาษี')}</span>
                  <span className="fw-semibold">฿{formatMoney(subtotalForTax)}</span>
                </div>
                <div className="d-flex justify-content-between mt-1">
                  <span className="text-muted">{t('orders.vat', 'VAT')}</span>
                  <span className={`fw-semibold ${vatAmount > 0 ? '' : 'text-muted'}`}>฿{formatMoney(Math.max(0, vatAmount))}</span>
                </div>
                <div className="d-flex justify-content-between mt-1">
                  <span className="text-muted">{t('orders.withholding', 'หัก ณ ที่จ่าย')}</span>
                  <span className={`fw-semibold ${withholdingAmount > 0 ? '' : 'text-muted'}`}>-฿{formatMoney(Math.max(0, withholdingAmount))}</span>
                </div>
                <div className="d-flex justify-content-between mt-2">
                  <span className="fw-bold">{t('orders.total', 'ยอดรวม')}</span>
                  <span className="fw-bold text-primary">฿{formatMoney(payableAfterTax)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {customer?.id && (
          <div className="col-12 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div
                className="card-header d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2"
                style={{ backgroundColor: '#F4F5FF' }}
              >
                <div className="fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-geo-alt"></i>
                  <span>{t('customers.locations.title', 'ที่อยู่จัดส่ง')}</span>
                </div>
                <div className="d-flex gap-2 flex-wrap">
                  {addressPrefsSaving ? (
                    <span className="small text-muted align-self-center">{t('common.saving', 'กำลังบันทึก...')}</span>
                  ) : addressPrefsSaveError ? (
                    <span className="small text-danger align-self-center">{addressPrefsSaveError}</span>
                  ) : (
                    <span className="small text-muted align-self-center">{t('common.saved', 'บันทึกแล้ว')}</span>
                  )}
                  <button className="btn btn-outline-primary btn-sm" onClick={openAddLocation}>
                    {t('customers.locations.add_btn', 'เพิ่มที่อยู่')}
                  </button>
                  <button
                    className="btn btn-outline-secondary btn-sm"
                    disabled={locationsLoading}
                    onClick={() => fetchCustomerLocations(Number(customer.id))}
                  >
                    {locationsLoading ? t('common.loading') : t('common.refresh', 'รีเฟรช')}
                  </button>
                </div>
              </div>
              <div className="card-body">
                <div className="row g-3">
                  <div className="col-12">
                    <div className="fw-semibold mb-2">{t('orders.job_site_address', 'ที่อยู่เข้าหน้างาน')}</div>
                    <select
                      className="form-select"
                      value={jobLocationId}
                      onChange={(e) => setJobLocationId(e.target.value)}
                      disabled={locationsLoading}
                    >
                      <option value="customer">{t('customers.address', 'ที่อยู่ลูกค้า')}</option>
                      {customerLocations.map((loc) => (
                        <option key={loc.id} value={String(loc.id)}>
                          {(loc.name || t('customers.locations.title', 'ที่อยู่จัดส่ง')) + (loc.is_default ? ` · ${t('common.default', 'หลัก')}` : '')}
                        </option>
                      ))}
                      <option value="manual">{t('common.custom', 'กำหนดเอง')}</option>
                    </select>
                    {jobLocationId === 'manual' && (
                      <textarea
                        className="form-control mt-2"
                        rows={3}
                        value={jobManualAddress}
                        onChange={(e) => setJobManualAddress(e.target.value)}
                        placeholder={t('orders.job_site_address_placeholder', 'กรอกที่อยู่หน้างาน')}
                      />
                    )}
                    <div className="small text-muted mt-2" style={{ whiteSpace: 'pre-line' }}>
                      {jobDisplayAddress || '-'}
                    </div>
                    {jobLoc?.google_maps_link && (
                      <a
                        href={jobLoc.google_maps_link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="btn btn-sm btn-outline-info mt-2"
                      >
                        <i className="bi bi-geo-alt-fill me-1"></i>
                        {t('customers.locations.google_maps_link', 'Map')}
                      </a>
                    )}
                  </div>

                  <div className="col-12">
                    <div className="border-top pt-3">
                      <div className="form-check">
                        <input
                          className="form-check-input"
                          type="checkbox"
                          id="billingDifferentFromJob"
                          checked={billingDifferentFromJob}
                          onChange={(e) => setBillingDifferentFromJob(e.target.checked)}
                        />
                        <label className="form-check-label fw-semibold" htmlFor="billingDifferentFromJob">
                          {t('orders.billing_different_from_job', 'ใช้ที่อยู่ออกบิล/ใบกำกับคนละที่กับหน้างาน')}
                        </label>
                      </div>

                      {billingDifferentFromJob ? (
                        <div className="mt-3">
                          <div className="fw-semibold mb-2">{t('orders.billing_address', 'ที่อยู่ออกบิล/ใบกำกับ')}</div>
                          <select
                            className="form-select"
                            value={billingLocationId}
                            onChange={(e) => setBillingLocationId(e.target.value)}
                            disabled={locationsLoading}
                          >
                            <option value="customer">{t('customers.address', 'ที่อยู่ลูกค้า')}</option>
                            {customerLocations.map((loc) => (
                              <option key={loc.id} value={String(loc.id)}>
                                {(loc.name || t('customers.locations.title', 'ที่อยู่จัดส่ง')) + (loc.is_default ? ` · ${t('common.default', 'หลัก')}` : '')}
                              </option>
                            ))}
                            <option value="manual">{t('common.custom', 'กำหนดเอง')}</option>
                          </select>
                          {billingLocationId === 'manual' && (
                            <textarea
                              className="form-control mt-2"
                              rows={3}
                              value={billingManualAddress}
                              onChange={(e) => setBillingManualAddress(e.target.value)}
                              placeholder={t('orders.billing_address_placeholder', 'กรอกที่อยู่ออกบิล/ใบกำกับ')}
                            />
                          )}
                        </div>
                      ) : (
                        <div className="mt-2 small text-muted">
                          {t('orders.billing_same_as_job', 'ที่อยู่ออกบิล/ใบกำกับ: ใช้ที่อยู่เดียวกับหน้างาน')}
                        </div>
                      )}

                      {billingDifferentFromJob && (
                        <>
                          <div className="small text-muted mt-2" style={{ whiteSpace: 'pre-line' }}>
                            {billingPreview.address || '-'}
                          </div>
                          {billingLoc?.contact_person || billingLoc?.contact_phone ? (
                            <div className="small text-muted" style={{ whiteSpace: 'pre-line' }}>
                              {(billingLoc?.contact_person ? `${t('customers.locations.contact_person', 'ผู้ติดต่อ')}: ${billingLoc.contact_person}` : '') +
                                (billingLoc?.contact_person && billingLoc?.contact_phone ? ' · ' : '') +
                                (billingLoc?.contact_phone ? `${t('customers.locations.contact_phone', 'เบอร์โทร')}: ${billingLoc.contact_phone}` : '')}
                            </div>
                          ) : null}
                          <div className="small text-muted mt-1">
                            {t('orders.billing_address_hint', 'ระบบจะนำไปเติมในแบบฟอร์มเอกสารตอนพิมพ์/แก้ไข')}
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {customer?.id && (
          <div className="col-12 col-lg-3">
            <div className="card border-0 shadow-sm h-100">
              <div className="card-header d-flex justify-content-between align-items-center" style={{ backgroundColor: '#F4F5FF' }}>
                <div className="fw-bold d-flex align-items-center gap-2">
                  <i className="bi bi-map"></i>
                  <span>{t('orders.job_site', 'สถานที่ติดตั้ง')}</span>
                </div>
                {jobMapLinkHref ? (
                  <a className="btn btn-outline-primary btn-sm" href={jobMapLinkHref} target="_blank" rel="noopener noreferrer">
                    {t('orders.navigate', 'นำทาง')}
                  </a>
                ) : null}
              </div>
              <div className="card-body">
                {jobMapEmbedSrc ? (
                  <div className="ratio ratio-16x9">
                    <iframe src={jobMapEmbedSrc} loading="lazy"></iframe>
                  </div>
                ) : (
                  <div className="text-muted small">{t('orders.no_location', 'ยังไม่มีข้อมูลสถานที่')}</div>
                )}
                <div className="small text-muted mt-2" style={{ whiteSpace: 'pre-line' }}>
                  {jobDisplayAddress || '-'}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="row g-3">
        <div className="col-12 col-lg-8">
          <div className="d-flex flex-column gap-3">
          <div className="card border-0 shadow-sm">
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
                    {(order.items || []).map((item) => (
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
                  {(order.items || []).map((item) => {
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

          {installmentData ? (
            <div ref={installmentScheduleRef} className="card border-0 shadow-sm">
              <div className="card-header bg-white d-flex justify-content-between align-items-center">
                <div className="fw-bold">{t('orders.installment_table', 'ตารางผ่อนชำระ')}</div>
                <span className="badge bg-light text-dark border">
                  {installmentData.paidCount}/{installmentData.schedule.length}
                </span>
              </div>
              <div className="card-body">
                <div className="d-none d-md-block table-responsive">
                  <table className="table table-sm align-middle mb-2">
                    <thead className="table-light">
                      <tr>
                        <th style={{ width: '22%' }}>{t('orders.installment', 'งวด')}</th>
                        <th style={{ width: '16%' }}>{t('orders.due_date', 'ครบกำหนด')}</th>
                        <th className="text-end" style={{ width: '14%' }}>{t('orders.amount', 'จำนวนเงิน')}</th>
                        <th style={{ width: '20%' }}>{t('orders.status', 'สถานะ')}</th>
                        <th style={{ width: '20%' }}>{t('orders.receipt', 'ใบเสร็จ')}</th>
                        <th style={{ width: '8%' }}></th>
                      </tr>
                    </thead>
                    <tbody>
                      {installmentData.schedule.map((row) => {
                        const p = installmentData.paymentsByNo.get(row.installment_no) || null;
                        const doc = p ? getPaymentReceiptDoc(p) : null;
                        const isPaid = !!p;
                        const isOverdue = !isPaid && installmentData.overdueNos.has(row.installment_no);
                        const dueText = row.due_date
                          ? row.due_date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                          : '-';
                        return (
                          <tr key={row.installment_no}>
                            <td className="fw-semibold">{row.label}</td>
                            <td>{dueText}</td>
                            <td className="text-end">฿{formatMoney(Number(row.expected_amount || 0))}</td>
                            <td>
                              {isPaid ? (
                                <span className="badge bg-success">{t('orders.paid', 'ชำระแล้ว')}</span>
                              ) : isOverdue ? (
                                <span className="badge bg-danger">{t('orders.overdue', 'ค้างชำระ')}</span>
                              ) : (
                                <span className="badge bg-secondary">{t('orders.unpaid', 'ยังไม่ชำระ')}</span>
                              )}
                              {p?.paid_at && <div className="small text-muted mt-1">{formatOrderDateTime(p.paid_at)}</div>}
                              {p?.method && <div className="small text-muted">{p.method === 'cash' ? t('pos.cash', 'เงินสด') : t('pos.transfer', 'โอนเงิน')}</div>}
                              {p?.note && String(p.note).trim() !== '' && <div className="small text-muted">{String(p.note).trim()}</div>}
                            </td>
                            <td>
                              {doc?.number ? (
                                <div>
                                  <div className={`font-monospace small ${doc.status === 'cancelled' ? 'text-danger text-decoration-line-through' : 'text-success'}`}>
                                    {doc.number}
                                  </div>
                                  <div className="text-muted" style={{ fontSize: '0.7em' }}>
                                    {new Date(doc.created_at).toLocaleDateString('th-TH')}
                                  </div>
                                </div>
                              ) : (
                                <span className="text-muted small">-</span>
                              )}
                            </td>
                            <td className="text-end">
                              {isPaid ? (
                                doc?.id ? (
                                  <div className="btn-group">
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary p-0 d-inline-flex align-items-center justify-content-center"
                                      onClick={() => openReceiptPrintByDocId(doc.id)}
                                      title={t('orders.print', 'พิมพ์')}
                                      style={{ width: '40px', height: '40px' }}
                                    >
                                      <i className="bi bi-printer" style={{ fontSize: '1.05rem' }}></i>
                                    </button>
                                    <button
                                      type="button"
                                      className="btn btn-outline-danger p-0 d-inline-flex align-items-center justify-content-center"
                                      onClick={() => setConfirmAction({ kind: 'delete-installment-receipt', paymentId: p!.id, number: doc.number })}
                                      title={t('common.delete', 'ลบ')}
                                      style={{ width: '40px', height: '40px' }}
                                    >
                                      <i className="bi bi-x-lg" style={{ fontSize: '1.05rem' }}></i>
                                    </button>
                                  </div>
                                ) : (
                                  <button
                                    type="button"
                                    className="btn btn-outline-primary p-0 d-inline-flex align-items-center justify-content-center"
                                    onClick={() => issueReceiptForPayment(p!.id)}
                                    title={t('orders.create_receipt', 'ออกใบเสร็จ')}
                                    style={{ width: '40px', height: '40px' }}
                                  >
                                    <i className="bi bi-plus-lg" style={{ fontSize: '1.05rem' }}></i>
                                  </button>
                                )
                              ) : (
                                <span className="text-muted small">-</span>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                <div className="d-block d-md-none d-flex flex-column gap-2">
                  {installmentData.schedule.map((row) => {
                    const p = installmentData.paymentsByNo.get(row.installment_no) || null;
                    const doc = p ? getPaymentReceiptDoc(p) : null;
                    const isPaid = !!p;
                    const isOverdue = !isPaid && installmentData.overdueNos.has(row.installment_no);
                    const dueText = row.due_date
                      ? row.due_date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                      : '-';
                    return (
                      <div key={row.installment_no} className="border rounded p-2">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div style={{ minWidth: 0 }}>
                            <div className="fw-bold text-truncate">{row.label}</div>
                            <div className="small text-muted">{t('orders.due_date', 'ครบกำหนด')}: {dueText}</div>
                            <div className="fw-bold mt-1">฿{formatMoney(Number(row.expected_amount || 0))}</div>
                            <div className="mt-1">
                              {isPaid ? (
                                <span className="badge bg-success">{t('orders.paid', 'ชำระแล้ว')}</span>
                              ) : isOverdue ? (
                                <span className="badge bg-danger">{t('orders.overdue', 'ค้างชำระ')}</span>
                              ) : (
                                <span className="badge bg-secondary">{t('orders.unpaid', 'ยังไม่ชำระ')}</span>
                              )}
                            </div>
                            {p?.paid_at && <div className="small text-muted mt-1">{formatOrderDateTime(p.paid_at)}</div>}
                            {p?.note && String(p.note).trim() !== '' && <div className="small text-muted">{String(p.note).trim()}</div>}
                            {doc?.number && (
                              <div>
                                <div className={`small font-monospace ${doc.status === 'cancelled' ? 'text-danger text-decoration-line-through' : 'text-success'}`}>
                                  {doc.number}
                                </div>
                                <div className="text-muted" style={{ fontSize: '0.7em' }}>
                                  {new Date(doc.created_at).toLocaleDateString('th-TH')}
                                </div>
                              </div>
                            )}
                          </div>
                          <div className="text-end">
                            {isPaid ? (
                              doc?.id ? (
                                <div className="btn-group">
                                  <button
                                    type="button"
                                    className="btn btn-outline-secondary p-0 d-inline-flex align-items-center justify-content-center"
                                    onClick={() => openReceiptPrintByDocId(doc.id)}
                                    title={t('orders.print', 'พิมพ์')}
                                    style={{ width: '44px', height: '44px' }}
                                  >
                                    <i className="bi bi-printer" style={{ fontSize: '1.05rem' }}></i>
                                  </button>
                                  <button
                                    type="button"
                                    className="btn btn-outline-danger p-0 d-inline-flex align-items-center justify-content-center"
                                    onClick={() => setConfirmAction({ kind: 'delete-installment-receipt', paymentId: p!.id, number: doc.number })}
                                    title={t('common.delete', 'ลบ')}
                                    style={{ width: '44px', height: '44px' }}
                                  >
                                    <i className="bi bi-x-lg" style={{ fontSize: '1.05rem' }}></i>
                                  </button>
                                </div>
                              ) : (
                                <button
                                  type="button"
                                  className="btn btn-outline-primary p-0 d-inline-flex align-items-center justify-content-center"
                                  onClick={() => issueReceiptForPayment(p!.id)}
                                  title={t('orders.create_receipt', 'ออกใบเสร็จ')}
                                  style={{ width: '44px', height: '44px' }}
                                >
                                  <i className="bi bi-plus-lg" style={{ fontSize: '1.05rem' }}></i>
                                </button>
                              )
                            ) : (
                              <span className="text-muted small">-</span>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {installmentData.unassigned.length > 0 && (
                  <details className="mt-3">
                    <summary className="small text-muted">{t('orders.unassigned_payments', 'รายการชำระที่ยังไม่ผูกงวด')}</summary>
                    <div className="d-flex flex-column gap-2 mt-2">
                      {installmentData.unassigned.map((p) => {
                        const doc = getPaymentReceiptDoc(p);
                        return (
                          <div key={p.id} className="border rounded p-2">
                            <div className="d-flex justify-content-between align-items-start gap-2">
                              <div style={{ minWidth: 0 }}>
                                <div className="fw-bold text-truncate">{t('orders.unassigned', 'ไม่ระบุงวด')}</div>
                                <div className="small text-muted">{formatOrderDateTime(p.paid_at)} · {p.method === 'cash' ? t('pos.cash', 'เงินสด') : t('pos.transfer', 'โอนเงิน')}</div>
                                {doc?.number && (
                                  <div className={`small font-monospace ${doc.status === 'cancelled' ? 'text-danger text-decoration-line-through' : 'text-success'}`}>
                                    {doc.number}
                                  </div>
                                )}
                              </div>
                              <div className="text-end">
                                <div className="fw-bold">฿{formatMoney(Number(p.amount || 0))}</div>
                                <div className="d-flex justify-content-end gap-2 mt-1">
                                  {doc?.id ? (
                                    <button
                                      type="button"
                                      className="btn btn-outline-secondary btn-sm"
                                      onClick={() => openReceiptPrintByDocId(doc.id)}
                                    >
                                      {t('orders.print', 'พิมพ์')}
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      className="btn btn-outline-primary btn-sm"
                                      onClick={() => issueReceiptForPayment(p.id)}
                                    >
                                      {t('orders.create_receipt', 'ออกใบเสร็จ')}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </details>
                )}
              </div>
            </div>
          ) : null}

          </div>
        </div>
        <div className="col-12 col-lg-4">
          <div className="d-flex flex-column gap-3">
            {(order.payment_method === 'installment' || order.paymentPlan) ? (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white d-flex justify-content-between align-items-center">
                  <span className="fw-bold">{t('orders.installment', 'ผ่อนชำระ')}</span>
                  <div className="d-flex gap-2">
                    <button type="button" className="btn btn-outline-secondary btn-sm" onClick={openInstallmentPlan}>
                      {t('common.settings', 'ตั้งค่า')}
                    </button>
                  </div>
                </div>
                <div className="card-body">
                  {installmentData ? (
                    <>
                      <div className="d-flex justify-content-between align-items-start gap-2">
                        <div style={{ minWidth: 0 }}>
                          <div className="small text-muted">{t('orders.paid', 'ชำระแล้ว')}</div>
                          <div className="fw-bold">฿{formatMoney(installmentData.paid)}</div>
                        </div>
                        <div className="text-end">
                          <div className="small text-muted">{t('orders.remaining', 'คงเหลือ')}</div>
                          <div className={`fw-bold ${installmentData.remaining <= 0 ? 'text-success' : ''}`}>฿{formatMoney(Math.max(0, installmentData.remaining))}</div>
                        </div>
                      </div>

                      {installmentData.overdueCount > 0 && (
                        <div className="alert alert-danger py-2 px-3 mt-3 mb-0">
                          <div className="fw-bold">
                            {t('orders.overdue', 'ค้างชำระ')} {installmentData.overdueCount} {t('orders.installment_unit', 'งวด')}
                          </div>
                          <div className="small">
                            {t('orders.overdue_amount', 'ยอดค้าง')}: ฿{formatMoney(installmentData.overdueAmount)}
                          </div>
                        </div>
                      )}

                      {installmentData.nextRow && (
                        <div className="border rounded p-2 mt-3">
                          <div className="small text-muted">{t('orders.next_installment', 'งวดถัดไป')}</div>
                          <div className="fw-bold">{installmentData.nextRow.label}</div>
                          <div className="small text-muted">
                            {installmentData.nextRow.due_date
                              ? installmentData.nextRow.due_date.toLocaleDateString('th-TH', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '-'}
                            {' · '}
                            ฿{formatMoney(Number(installmentData.nextRow.expected_amount || 0))}
                          </div>
                        </div>
                      )}

                      <div className="d-grid gap-2 mt-3">
                        {(installmentData.plan.status || 'active') !== 'completed' && order.status !== 'cancelled' && (
                          <button type="button" className="btn btn-primary" onClick={() => openInstallmentPayment()}>
                            {t('orders.receive_next_payment', 'รับชำระงวดถัดไป')}
                          </button>
                        )}
                        {(installmentData.plan.status || 'active') !== 'completed' && order.status !== 'cancelled' && installmentData.overdueCount > 0 && (
                          <button type="button" className="btn btn-outline-danger" onClick={openBackpay}>
                            {t('orders.backpay', 'ชำระย้อนหลัง')}
                          </button>
                        )}
                        {(installmentData.plan.status || 'active') !== 'completed' && order.status !== 'cancelled' && installmentData.remaining > 0 && (
                          <button type="button" className="btn btn-outline-success" onClick={() => openInstallmentPayment(null)}>
                            {t('orders.close_account', 'ปิดบัญชี')}
                          </button>
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="d-grid">
                      <button type="button" className="btn btn-primary" onClick={openInstallmentPlan}>
                        {t('orders.setup_installment', 'ตั้งผ่อนชำระ')}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ) : null}

            {!isInstallmentOrder && (
              <div className="card border-0 shadow-sm">
                <div className="card-header bg-white fw-bold">{t('orders.issued_documents')}</div>
                <div className="card-body">
                  {issuedDocumentsBody}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
