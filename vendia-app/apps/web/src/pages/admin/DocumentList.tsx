import React, { useEffect, useRef, useState } from 'react';
import { api, Customer } from '@vendia/shared';
import { useTranslation } from 'react-i18next';
import { useLocation, useNavigate } from 'react-router-dom';

type DocumentType = 'quotation' | 'billing_note' | 'invoice' | 'receipt';
type DocumentStatus = 'active' | 'cancelled';

type DocumentRow = {
  id: number;
  type: DocumentType;
  number: string;
  status: DocumentStatus;
  issued_date: string | null;
  created_at: string;
  order?: {
    id: number;
    total?: string;
    customer?: Customer;
  };
};

type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

type DocumentsTab = 'documents' | 'billing' | 'receipt';
type RemindersScope = 'all' | 'range';

type ReminderCustomerRow = {
  customer_id: number | null;
  customer_name: string | null;
  customer_is_company?: boolean | null;
  count: number;
  total: number;
};

type RemindersResponse = {
  scope: RemindersScope;
  start_date: string | null;
  end_date: string | null;
  billing_unpaid: {
    total: number;
    count: number;
    top_customers: ReminderCustomerRow[];
    orders?: Array<{
      id: number;
      customer_id: number | null;
      created_at: string;
      total: number;
      billing_note_number: string | null;
    }>;
  };
  missing_receipt: {
    total: number;
    count: number;
    top_customers: ReminderCustomerRow[];
    orders?: Array<{
      id: number;
      customer_id: number | null;
      created_at: string;
      total: number;
      receipt_number: string | null;
      receipt_status: string | null;
    }>;
  };
};

export const DocumentList = () => {
  const { t } = useTranslation();
  const location = useLocation();
  const navigate = useNavigate();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [totalDocuments, setTotalDocuments] = useState(0);
  const [type, setType] = useState<'all' | DocumentType>('all');
  const [status, setStatus] = useState<'all' | DocumentStatus>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [searchText, setSearchText] = useState('');
  const [appliedSearchText, setAppliedSearchText] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [tab, setTab] = useState<DocumentsTab>(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get('tab') || '').trim();
    if (raw === 'documents' || raw === 'billing' || raw === 'receipt') return raw;
    return 'documents';
  });

  const [remindersScope, setRemindersScope] = useState<RemindersScope>('all');
  const [reminderStartDate, setReminderStartDate] = useState('');
  const [reminderEndDate, setReminderEndDate] = useState('');
  const [reminders, setReminders] = useState<RemindersResponse | null>(null);
  const [remindersLoading, setRemindersLoading] = useState(false);
  const [remindersError, setRemindersError] = useState('');
  const remindersRequestIdRef = useRef(0);

  const formatThaiDate = (value: string) => {
    const v = value.includes('T') ? value.slice(0, 10) : value;
    const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(v);
    if (!m) return value;
    const dd = m[3];
    const mm = m[2];
    const yyyy = String(Number(m[1]) + 543);
    return `${dd}/${mm}/${yyyy}`;
  };

  const typeLabel = (docType: DocumentType) => {
    if (docType === 'quotation') return t('print.quotation.title', 'ใบเสนอราคา');
    if (docType === 'billing_note') return t('print.billing_note.title', 'ใบวางบิล');
    if (docType === 'invoice') return t('print.invoice.title', 'ใบแจ้งหนี้');
    return t('print.receipt.title', 'ใบเสร็จรับเงิน');
  };

  const typeBadgeStyle = (docType: DocumentType): React.CSSProperties => {
    if (docType === 'receipt') return { background: 'var(--vendia-status-receipt)', color: '#fff' };
    if (docType === 'billing_note') return { background: 'var(--vendia-status-billing)', color: '#111827' };
    if (docType === 'invoice') return { background: 'var(--vendia-brand)', color: '#fff' };
    return { background: 'var(--vendia-status-quotation)', color: '#fff' };
  };

  const formatMoney = (v: number | string) => {
    const n = typeof v === 'number' ? v : Number(v || 0);
    return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  };

  const openDocumentWindow = (doc: DocumentRow, options?: { edit?: boolean; download?: boolean }) => {
    if (!doc.order?.id) return;
    const params = new URLSearchParams();
    params.set('type', doc.type);
    params.set('doc_id', String(doc.id));
    if (options?.edit) params.set('edit', '1');
    if (options?.download) params.set('download', '1');
    window.open(`/print/order/${doc.order.id}?${params.toString()}`, '_blank');
  };

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const raw = (params.get('tab') || '').trim();
    if (raw === 'documents' || raw === 'billing' || raw === 'receipt') {
      setTab(raw);
    } else {
      setTab('documents');
    }
  }, [location.search]);

  const selectTab = (next: DocumentsTab) => {
    const params = new URLSearchParams(location.search);
    params.set('tab', next);
    navigate(`${location.pathname}?${params.toString()}`, { replace: true });
  };

  const fetchDocuments = async (pageNo: number) => {
    setLoading(true);
    setError('');
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNo));
      params.set('per_page', '20');
      if (type !== 'all') params.set('type', type);
      if (status !== 'all') params.set('status', status);
      if (startDate.trim() !== '') params.set('start_date', startDate.trim());
      if (endDate.trim() !== '') params.set('end_date', endDate.trim());
      if (appliedSearchText.trim() !== '') params.set('search', appliedSearchText.trim());

      const res = await api.get<PaginatedResponse<DocumentRow>>(`/documents?${params.toString()}`);
      setDocuments(res.data.data);
      setTotalPages(res.data.last_page);
      setPage(res.data.current_page);
      setTotalDocuments(res.data.total || 0);
    } catch (err) {
      setError(t('common.fetch_failed', 'โหลดข้อมูลไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (tab !== 'documents') return;
    fetchDocuments(page);
  }, [tab, page, type, status, startDate, endDate, appliedSearchText]);

  useEffect(() => {
    setPage(1);
  }, [type, status, startDate, endDate, appliedSearchText]);

  const fetchReminders = async () => {
    const requestId = (remindersRequestIdRef.current += 1);
    setRemindersLoading(true);
    setRemindersError('');
    try {
      const params = new URLSearchParams();
      params.set('scope', remindersScope);
      if (tab === 'billing' || tab === 'receipt') params.set('include_orders', '1');
      if (remindersScope === 'range') {
        if (reminderStartDate.trim() !== '') params.set('start_date', reminderStartDate.trim());
        if (reminderEndDate.trim() !== '') params.set('end_date', reminderEndDate.trim());
      }
      const res = await api.get<RemindersResponse>(`/orders/reminders?${params.toString()}`);
      if (requestId === remindersRequestIdRef.current) setReminders(res.data);
    } catch {
      if (requestId === remindersRequestIdRef.current) {
        setReminders(null);
        setRemindersError(t('common.fetch_failed', 'โหลดข้อมูลไม่สำเร็จ'));
      }
    } finally {
      if (requestId === remindersRequestIdRef.current) setRemindersLoading(false);
    }
  };

  useEffect(() => {
    fetchReminders();
  }, [tab, remindersScope, reminderStartDate, reminderEndDate]);

  const applySearch = () => {
    const next = searchText.trim();
    setAppliedSearchText(next);
    setPage(1);
  };

  const clearSearch = () => {
    setSearchText('');
    setAppliedSearchText('');
    setPage(1);
  };

  const currentPageTotal = documents.reduce((sum, d) => sum + Number(d.order?.total || 0), 0);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{t('documents.title', 'เอกสาร')}</h2>
      </div>

      <ul className="nav nav-tabs mb-3">
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === 'documents' ? 'active' : ''}`} onClick={() => selectTab('documents')}>
            {t('documents.tabs.documents', 'เอกสาร')}
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === 'billing' ? 'active' : ''}`} onClick={() => selectTab('billing')}>
            {t('documents.tabs.billing', 'ลูกหนี้ใบวางบิล')}
            <span className="badge ms-2 text-dark" style={{ background: '#ffc107' }}>
              {reminders?.billing_unpaid?.count || 0}
            </span>
          </button>
        </li>
        <li className="nav-item">
          <button type="button" className={`nav-link ${tab === 'receipt' ? 'active' : ''}`} onClick={() => selectTab('receipt')}>
            {t('documents.tabs.receipt', 'ใบเสร็จค้างออก')}
            <span className="badge bg-secondary ms-2">{reminders?.missing_receipt?.count || 0}</span>
          </button>
        </li>
      </ul>

      {tab === 'documents' && (
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <div className="row g-2">
              <div className="col-12 col-md-3">
                <label className="form-label fw-bold">{t('documents.filters.type', 'ประเภท')}</label>
                <select className="form-select" value={type} onChange={(e) => setType(e.target.value as any)}>
                  <option value="all">{t('documents.filters.all', 'ทั้งหมด')}</option>
                  <option value="quotation">{t('print.quotation.title', 'ใบเสนอราคา')}</option>
                  <option value="billing_note">{t('print.billing_note.title', 'ใบวางบิล')}</option>
                  <option value="invoice">{t('print.invoice.title', 'ใบแจ้งหนี้')}</option>
                  <option value="receipt">{t('print.receipt.title', 'ใบเสร็จรับเงิน')}</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label fw-bold">{t('documents.filters.status', 'สถานะ')}</label>
                <select className="form-select" value={status} onChange={(e) => setStatus(e.target.value as any)}>
                  <option value="all">{t('documents.filters.all', 'ทั้งหมด')}</option>
                  <option value="active">{t('documents.status.active', 'ใช้งาน')}</option>
                  <option value="cancelled">{t('documents.status.cancelled', 'ยกเลิก')}</option>
                </select>
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label fw-bold">{t('documents.filters.start_date', 'จากวันที่')}</label>
                <input type="date" className="form-control" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div className="col-12 col-md-3">
                <label className="form-label fw-bold">{t('documents.filters.end_date', 'ถึงวันที่')}</label>
                <input type="date" className="form-control" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div className="row g-2 mt-2">
              <div className="col-12 col-md-6">
                <label className="form-label fw-bold">{t('documents.filters.search', 'ค้นหา')}</label>
                <input
                  className="form-control"
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      applySearch();
                    }
                  }}
                  placeholder={t('documents.filters.search_placeholder', 'เลขที่เอกสาร / ชื่อลูกค้า / #เลขออเดอร์')}
                />
              </div>
              <div className="col-12 col-md-6 d-flex align-items-end justify-content-end">
                <div className="d-flex gap-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={applySearch}
                    disabled={loading || searchText.trim() === appliedSearchText.trim()}
                  >
                    {t('common.search', 'ค้นหา')}
                  </button>
                  {(searchText.trim() !== '' || appliedSearchText.trim() !== '') && (
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={clearSearch}
                      disabled={loading}
                    >
                      {t('common.clear', 'ล้าง')}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab !== 'documents' && (
        <div className="card shadow-sm mb-3">
          <div className="card-body">
            <div className="d-flex flex-wrap justify-content-between align-items-end gap-2">
              <div className="d-flex flex-wrap align-items-end gap-2">
                <div style={{ minWidth: 220 }}>
                  <label className="form-label fw-bold">{t('documents.reminders.scope', 'ช่วงข้อมูล')}</label>
                  <select
                    className="form-select"
                    value={remindersScope}
                    onChange={(e) => setRemindersScope((e.target.value as RemindersScope) || 'all')}
                  >
                    <option value="all">{t('dashboard.scope.all', 'ทั้งหมด')}</option>
                    <option value="range">{t('dashboard.scope.range', 'ตามช่วงที่เลือก')}</option>
                  </select>
                </div>
                {remindersScope === 'range' && (
                  <>
                    <div>
                      <label className="form-label fw-bold">{t('documents.reminders.start_date', 'จากวันที่')}</label>
                      <input type="date" className="form-control" value={reminderStartDate} onChange={(e) => setReminderStartDate(e.target.value)} />
                    </div>
                    <div>
                      <label className="form-label fw-bold">{t('documents.reminders.end_date', 'ถึงวันที่')}</label>
                      <input type="date" className="form-control" value={reminderEndDate} onChange={(e) => setReminderEndDate(e.target.value)} />
                    </div>
                  </>
                )}
              </div>
              <div className="d-flex align-items-center gap-2">
                <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/orders')}>
                  {t('dashboard.go_orders', 'ไปหน้ารายการสั่งซื้อ')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === 'documents' && error !== '' && (
        <div className="alert alert-danger" style={{ whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      )}

      {tab === 'documents' && (
        <div className="card shadow-sm">
          <div className="card-body">
            <div className="text-muted small">{t('documents.tabs.documents', 'เอกสาร')}</div>
            <div className="fs-4 fw-bold">฿{formatMoney(currentPageTotal)}</div>
            <div className="small text-muted">{t('dashboard.pending_count', 'จำนวนรายการ')}: {totalDocuments.toLocaleString('en-US')}</div>
            <div className="table-responsive mt-3">
              <table className="table align-top mb-0">
                <thead className="table-light">
                  <tr>
                    <th>{t('documents.fields.customer', 'ลูกค้า')}</th>
                    <th>{t('documents.fields.number', 'เลขที่')}</th>
                    <th>{t('documents.fields.type', 'ประเภท')}</th>
                    <th>{t('documents.fields.status', 'สถานะ')}</th>
                    <th>{t('documents.fields.issued_date', 'วันที่เอกสาร')}</th>
                    <th>{t('documents.fields.order', 'ออเดอร์')}</th>
                    <th className="text-end">{t('orders.total', 'ยอดรวม')}</th>
                    <th className="text-end">{t('documents.fields.actions', 'การทำงาน')}</th>
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    <tr>
                      <td colSpan={8} className="text-center p-4">
                        <div className="spinner-border text-primary" role="status"></div>
                      </td>
                    </tr>
                  ) : documents.length === 0 ? (
                    <tr>
                      <td colSpan={8} className="text-center p-4 text-muted">
                        {t('documents.empty', 'ไม่พบเอกสาร')}
                      </td>
                    </tr>
                  ) : (
                    documents.map((doc) => (
                      <tr key={doc.id}>
                        <td>
                          <div className="d-flex align-items-center gap-3">
                            <div
                              className="d-flex align-items-center justify-content-center"
                              style={{
                                width: 40,
                                height: 40,
                                borderRadius: 10,
                                background: '#e9efff',
                                color: '#3b5bdb',
                                flex: '0 0 auto',
                              }}
                            >
                              <i
                                className={`bi ${doc.order?.customer?.is_company || doc.order?.customer?.company_name ? 'bi-building' : 'bi-person'}`}
                                style={{ fontSize: 18, lineHeight: 1 }}
                              />
                            </div>
                            <div style={{ minWidth: 0 }}>
                              <div className="fw-semibold text-truncate">{doc.order?.customer?.name || t('pos.walk_in', 'ลูกค้าหน้าร้าน')}</div>
                            </div>
                          </div>
                        </td>
                        <td>
                          <button
                            type="button"
                            className="btn btn-link p-0 fw-semibold"
                            style={{ textDecoration: 'none' }}
                            onClick={() => {
                              openDocumentWindow(doc);
                            }}
                            disabled={!doc.order?.id}
                            title={t('orders.print', 'พิมพ์')}
                          >
                            <span className="badge bg-light text-dark border">{doc.number}</span>
                          </button>
                        </td>
                        <td>
                          <span className="badge" style={typeBadgeStyle(doc.type)}>
                            {typeLabel(doc.type)}
                          </span>
                        </td>
                        <td>
                          <span className={`badge ${doc.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                            {doc.status === 'active' ? t('documents.status.active', 'ใช้งาน') : t('documents.status.cancelled', 'ยกเลิก')}
                          </span>
                        </td>
                        <td>{doc.issued_date ? formatThaiDate(doc.issued_date) : '-'}</td>
                        <td>
                          {doc.order?.id ? (
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => navigate(`/orders/${doc.order!.id}`)}
                              title={t('documents.view_order', 'ดูออเดอร์')}
                            >
                              #{doc.order.id}
                            </button>
                          ) : (
                            <span className="text-muted">-</span>
                          )}
                        </td>
                        <td className="text-end">{doc.order?.total ? <>฿{formatMoney(doc.order.total)}</> : <span className="text-muted">-</span>}</td>
                        <td className="text-end">
                          <div className="d-inline-flex align-items-center gap-2">
                            <button
                              type="button"
                              className="btn btn-outline-secondary btn-sm"
                              onClick={() => openDocumentWindow(doc)}
                              disabled={!doc.order?.id}
                              aria-label={t('orders.print', 'พิมพ์')}
                              title={t('orders.print', 'พิมพ์')}
                            >
                              <i className="bi bi-printer" style={{ fontSize: '1.05rem', lineHeight: 1 }} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-outline-primary btn-sm"
                              onClick={() => openDocumentWindow(doc, { download: true })}
                              disabled={!doc.order?.id}
                              aria-label={t('documents.download_pdf', 'ดาวน์โหลด PDF')}
                              title={t('documents.download_pdf', 'ดาวน์โหลด PDF')}
                            >
                              <i className="bi bi-download" style={{ fontSize: '1.05rem', lineHeight: 1 }} />
                            </button>
                            <button
                              type="button"
                              className="btn btn-primary btn-sm"
                              onClick={() => openDocumentWindow(doc, { edit: true })}
                              disabled={!doc.order?.id}
                            >
                              {t('common.edit', 'แก้ไข')}
                            </button>
                          </div>
                          {doc.status === 'cancelled' && (
                            <button
                              className="btn btn-outline-danger ms-2"
                              onClick={async () => {
                                const ok = window.confirm(t('documents.confirm_delete', 'ต้องการลบเอกสารที่ยกเลิกนี้ใช่ไหม?'));
                                if (!ok) return;
                                try {
                                  await api.delete(`/documents/${doc.id}`);
                                  fetchDocuments(page);
                                } catch (err) {
                                  setError(t('common.delete_failed', 'ลบไม่สำเร็จ'));
                                }
                              }}
                            >
                              {t('actions.delete', 'ลบ')}
                            </button>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
          {totalPages > 1 && (
            <div className="card-footer bg-white py-3">
              <nav aria-label="Documents navigation">
                <ul className="pagination justify-content-center mb-0">
                  <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(Math.max(page - 1, 1))} disabled={page === 1}>
                      {t('common.previous', 'ก่อนหน้า')}
                    </button>
                  </li>
                  {Array.from({ length: totalPages }).slice(0, 10).map((_, i) => {
                    const p = i + 1;
                    return (
                      <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                        <button className="page-link" onClick={() => setPage(p)}>
                          {p}
                        </button>
                      </li>
                    );
                  })}
                  <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                    <button className="page-link" onClick={() => setPage(Math.min(page + 1, totalPages))} disabled={page === totalPages}>
                      {t('common.next', 'ถัดไป')}
                    </button>
                  </li>
                </ul>
              </nav>
            </div>
          )}
        </div>
      )}

      {tab !== 'documents' && (
        <>
          {remindersError !== '' && (
            <div className="alert alert-danger" style={{ whiteSpace: 'pre-wrap' }}>
              {remindersError}
            </div>
          )}
          <div className="card shadow-sm">
            <div className="card-body">
              {remindersLoading ? (
                <div className="text-center py-4">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : !reminders ? (
                <div className="text-muted text-center py-4">{t('common.no_data', 'ไม่พบข้อมูล')}</div>
              ) : tab === 'billing' ? (
                <>
                  <div className="text-muted small">{t('dashboard.billing_unpaid_all', 'ใบวางบิลค้างชำระ (ทั้งหมด)')}</div>
                  <div className="fs-4 fw-bold text-warning">฿{formatMoney(reminders.billing_unpaid.total || 0)}</div>
                  <div className="small text-muted">{t('dashboard.pending_count', 'จำนวนรายการ')}: {reminders.billing_unpaid.count || 0}</div>
                  {reminders.billing_unpaid.top_customers.length > 0 && (
                    <div className="table-responsive mt-3">
                      <table className="table align-top mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>{t('orders.customer', 'ลูกค้า')}</th>
                            <th style={{ width: 150 }} className="text-center">{t('documents.billing.count', 'จำนวนบิลค้าง')}</th>
                            <th style={{ width: 320 }}>{t('documents.billing.numbers', 'เลขที่ใบแจ้งหนี้')}</th>
                            <th style={{ width: 180 }} className="text-end">{t('documents.billing.total_due', 'ยอดค้างชำระรวม')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reminders.billing_unpaid.top_customers.map((r, idx) => {
                            const key = `${r.customer_id ?? 'walk_in'}-${idx}`;
                            const orders = (reminders.billing_unpaid.orders || []).filter((o) => {
                              const cid = o.customer_id ?? null;
                              return cid === (r.customer_id ?? null);
                            });
                            const ordersSorted = orders.slice().sort((a, b) => {
                              const da = new Date(a.created_at).getTime();
                              const db = new Date(b.created_at).getTime();
                              if (da !== db) return db - da;
                              return b.id - a.id;
                            });
                            const invoiceRows = ordersSorted
                              .filter((o) => !!o.billing_note_number)
                              .map((o) => ({ id: o.id, number: String(o.billing_note_number) }));
                            const now = new Date();
                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const maxOverdueDays = Math.max(
                              0,
                              ...ordersSorted.map((o) => {
                                const d = new Date(o.created_at);
                                const od = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                return Math.floor((today.getTime() - od.getTime()) / (24 * 60 * 60 * 1000));
                              })
                            );
                            return (
                              <React.Fragment key={key}>
                                <tr>
                                  <td>
                                    <div className="d-flex align-items-center gap-3">
                                      <div
                                        className="d-flex align-items-center justify-content-center"
                                        style={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: 10,
                                          background: '#e9efff',
                                          color: '#3b5bdb',
                                          flex: '0 0 auto',
                                        }}
                                      >
                                        <i
                                          className={`bi ${r.customer_is_company ? 'bi-building' : 'bi-person'}`}
                                          style={{ fontSize: 18, lineHeight: 1 }}
                                        />
                                      </div>
                                      <div style={{ minWidth: 0 }}>
                                        <div className="fw-semibold text-truncate">
                                          {r.customer_name || t('pos.walk_in', 'ลูกค้าหน้าร้าน')}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge" style={{ background: '#ffe8cc', color: '#a44b00' }}>
                                      {Number(r.count || 0).toLocaleString('en-US')} {t('documents.billing.bills', 'บิล')}
                                    </span>
                                  </td>
                                  <td>
                                    {invoiceRows.length === 0 ? (
                                      <span className="text-muted">-</span>
                                    ) : (
                                      <div className="d-flex flex-column gap-1">
                                        {invoiceRows.map((inv) => (
                                          <button
                                            key={`${inv.id}-${inv.number}`}
                                            type="button"
                                            className="btn btn-link p-0 text-start"
                                            style={{ textDecoration: 'none' }}
                                            onClick={() => navigate(`/orders/${inv.id}`)}
                                            title={t('documents.view_order', 'ดูออเดอร์')}
                                          >
                                            <span className="badge bg-light text-dark border">{inv.number}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    <div className="fw-semibold">฿{formatMoney(r.total || 0)}</div>
                                    {maxOverdueDays > 0 ? (
                                      <div className="text-danger small">
                                        {t('documents.billing.overdue', 'เกินกำหนด')} {maxOverdueDays} {t('documents.billing.days', 'วัน')}
                                      </div>
                                    ) : (
                                      <div className="text-muted small">-</div>
                                    )}
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <div className="text-muted small">{t('dashboard.missing_receipt_all', 'ชำระแล้วแต่ยังไม่ออกใบเสร็จ (ทั้งหมด)')}</div>
                  <div className="fs-4 fw-bold text-success">฿{formatMoney(reminders.missing_receipt.total || 0)}</div>
                  <div className="small text-muted">{t('dashboard.completed_count', 'จำนวนรายการ')}: {reminders.missing_receipt.count || 0}</div>
                  {reminders.missing_receipt.top_customers.length > 0 && (
                    <div className="table-responsive mt-3">
                      <table className="table align-top mb-0">
                        <thead className="table-light">
                          <tr>
                            <th>{t('orders.customer', 'ลูกค้า')}</th>
                            <th style={{ width: 140 }} className="text-center">{t('dashboard.completed_count', 'จำนวนรายการ')}</th>
                            <th style={{ width: 320 }}>{t('documents.receipt.numbers', 'เลขที่ใบเสร็จ')}</th>
                            <th style={{ width: 180 }} className="text-end">{t('orders.total', 'ยอดรวม')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {reminders.missing_receipt.top_customers.map((r, idx) => {
                            const key = `${r.customer_id ?? 'walk_in'}-${idx}`;
                            const orders = (reminders.missing_receipt.orders || []).filter((o) => {
                              const cid = o.customer_id ?? null;
                              return cid === (r.customer_id ?? null);
                            });
                            const ordersSorted = orders.slice().sort((a, b) => {
                              const da = new Date(a.created_at).getTime();
                              const db = new Date(b.created_at).getTime();
                              if (da !== db) return db - da;
                              return b.id - a.id;
                            });
                            const orderRows = ordersSorted.map((o) => ({
                              id: o.id,
                              label: o.receipt_number ? String(o.receipt_number) : `#${o.id}`,
                              status: o.receipt_status ? String(o.receipt_status) : null,
                            }));
                            const now = new Date();
                            const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
                            const maxPendingDays = Math.max(
                              0,
                              ...ordersSorted.map((o) => {
                                const d = new Date(o.created_at);
                                const od = new Date(d.getFullYear(), d.getMonth(), d.getDate());
                                return Math.floor((today.getTime() - od.getTime()) / (24 * 60 * 60 * 1000));
                              })
                            );
                            return (
                              <React.Fragment key={key}>
                                <tr>
                                  <td>
                                    <div className="d-flex align-items-center gap-3">
                                      <div
                                        className="d-flex align-items-center justify-content-center"
                                        style={{
                                          width: 40,
                                          height: 40,
                                          borderRadius: 10,
                                          background: '#e9efff',
                                          color: '#3b5bdb',
                                          flex: '0 0 auto',
                                        }}
                                      >
                                        <i className={`bi ${r.customer_is_company ? 'bi-building' : 'bi-person'}`} style={{ fontSize: 18, lineHeight: 1 }} />
                                      </div>
                                      <div style={{ minWidth: 0 }}>
                                        <div className="fw-semibold text-truncate">
                                          {r.customer_name || t('pos.walk_in', 'ลูกค้าหน้าร้าน')}
                                        </div>
                                      </div>
                                    </div>
                                  </td>
                                  <td className="text-center">
                                    <span className="badge" style={{ background: '#e9ecef', color: '#343a40' }}>
                                      {Number(r.count || 0).toLocaleString('en-US')} {t('dashboard.completed_count', 'รายการ')}
                                    </span>
                                  </td>
                                  <td>
                                    {orderRows.length === 0 ? (
                                      <span className="text-muted">-</span>
                                    ) : (
                                      <div className="d-flex flex-column gap-1">
                                        {orderRows.map((o) => (
                                          <button
                                            key={o.id}
                                            type="button"
                                            className="btn btn-link p-0 text-start"
                                            style={{ textDecoration: 'none' }}
                                            onClick={() => navigate(`/orders/${o.id}`)}
                                            title={o.status ? `${o.label} (${o.status})` : o.label}
                                          >
                                            <span className="badge bg-light text-dark border">{o.label}</span>
                                          </button>
                                        ))}
                                      </div>
                                    )}
                                  </td>
                                  <td className="text-end">
                                    <div className="fw-semibold">฿{formatMoney(r.total || 0)}</div>
                                    {maxPendingDays > 0 ? (
                                      <div className="text-danger small">
                                        {t('documents.receipt.pending_days', 'ค้างออก')} {maxPendingDays} {t('documents.billing.days', 'วัน')}
                                      </div>
                                    ) : (
                                      <div className="text-muted small">-</div>
                                    )}
                                  </td>
                                </tr>
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};
