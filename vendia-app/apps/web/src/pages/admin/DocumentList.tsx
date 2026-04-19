import React, { useEffect, useState } from 'react';
import { api, User } from '@vendia/shared';
import { useTranslation } from 'react-i18next';

type DocumentType = 'quotation' | 'billing_note' | 'receipt';
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
    customer?: User;
  };
};

type PaginatedResponse<T> = {
  data: T[];
  current_page: number;
  last_page: number;
  total: number;
};

export const DocumentList = () => {
  const { t } = useTranslation();
  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [type, setType] = useState<'all' | DocumentType>('all');
  const [status, setStatus] = useState<'all' | DocumentStatus>('all');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

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
    return t('print.receipt.title', 'ใบเสร็จรับเงิน');
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

      const res = await api.get<PaginatedResponse<DocumentRow>>(`/documents?${params.toString()}`);
      setDocuments(res.data.data);
      setTotalPages(res.data.last_page);
      setPage(res.data.current_page);
    } catch (err) {
      setError(t('common.fetch_failed', 'โหลดข้อมูลไม่สำเร็จ'));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments(page);
  }, [page, type, status, startDate, endDate]);

  useEffect(() => {
    setPage(1);
  }, [type, status, startDate, endDate]);

  return (
    <div className="container mt-4">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h2 className="mb-0">{t('documents.title', 'เอกสาร')}</h2>
      </div>

      <div className="card shadow-sm mb-3">
        <div className="card-body">
          <div className="row g-2">
            <div className="col-12 col-md-3">
              <label className="form-label fw-bold">{t('documents.filters.type', 'ประเภท')}</label>
              <select className="form-select" value={type} onChange={(e) => setType(e.target.value as any)}>
                <option value="all">{t('documents.filters.all', 'ทั้งหมด')}</option>
                <option value="quotation">{t('print.quotation.title', 'ใบเสนอราคา')}</option>
                <option value="billing_note">{t('print.billing_note.title', 'ใบวางบิล')}</option>
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
        </div>
      </div>

      {error !== '' && (
        <div className="alert alert-danger" style={{ whiteSpace: 'pre-wrap' }}>
          {error}
        </div>
      )}

      <div className="card shadow-sm">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="p-3">{t('documents.fields.number', 'เลขที่')}</th>
                  <th className="p-3">{t('documents.fields.type', 'ประเภท')}</th>
                  <th className="p-3">{t('documents.fields.status', 'สถานะ')}</th>
                  <th className="p-3">{t('documents.fields.issued_date', 'วันที่เอกสาร')}</th>
                  <th className="p-3">{t('documents.fields.customer', 'ลูกค้า')}</th>
                  <th className="p-3 text-end">{t('documents.fields.actions', 'การทำงาน')}</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4">
                      <div className="spinner-border text-primary" role="status"></div>
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="text-center p-4 text-muted">
                      {t('documents.empty', 'ไม่พบเอกสาร')}
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id}>
                      <td className="p-3 fw-bold">{doc.number}</td>
                      <td className="p-3">{typeLabel(doc.type)}</td>
                      <td className="p-3">
                        <span className={`badge ${doc.status === 'active' ? 'bg-success' : 'bg-secondary'}`}>
                          {doc.status === 'active' ? t('documents.status.active', 'ใช้งาน') : t('documents.status.cancelled', 'ยกเลิก')}
                        </span>
                      </td>
                      <td className="p-3">{doc.issued_date ? formatThaiDate(doc.issued_date) : '-'}</td>
                      <td className="p-3">{doc.order?.customer?.name || '-'}</td>
                      <td className="p-3 text-end">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => {
                            if (!doc.order?.id) return;
                            window.open(`/print/order/${doc.order.id}?type=${doc.type}&doc_id=${doc.id}`, '_blank');
                          }}
                          disabled={!doc.order?.id}
                        >
                          {t('orders.print', 'พิมพ์')}
                        </button>
                        <button
                          className="btn btn-primary ms-2"
                          onClick={() => {
                            if (!doc.order?.id) return;
                            window.open(`/print/order/${doc.order.id}?type=${doc.type}&edit=1&doc_id=${doc.id}`, '_blank');
                          }}
                          disabled={!doc.order?.id}
                        >
                          {t('common.edit', 'แก้ไข')}
                        </button>
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
    </div>
  );
};
