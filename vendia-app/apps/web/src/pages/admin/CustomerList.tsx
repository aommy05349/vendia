import React, { useEffect, useState } from 'react';
import { api, Customer } from '@vendia/shared';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../components/ConfirmModal';
import { MessageModal } from '../../components/MessageModal';

export const CustomerList = () => {
  const { t } = useTranslation();
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [customerType, setCustomerType] = useState<'all' | 'personal' | 'company'>('all');
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const [confirmCustomerId, setConfirmCustomerId] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchCustomers(page);
    if (location.state?.success) {
      setAlertMessage({ type: 'success', text: location.state.success });
      window.history.replaceState({}, document.title);
      setTimeout(() => setAlertMessage(null), 3000);
    }
  }, [location, search, page, customerType]);

  useEffect(() => {
    setPage(1);
  }, [search, customerType]);

  const fetchCustomers = async (pageNo: number) => {
    try {
      const params = new URLSearchParams();
      params.set('search', search);
      params.set('page', String(pageNo));
      if (customerType !== 'all') params.set('type', customerType);

      const response = await api.get(`/customers?${params.toString()}`);
      setCustomers(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error('Failed to fetch customers:', error);
      setAlertMessage({ type: 'danger', text: t('customers.fetch_failed') });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: number) => {
    setConfirmCustomerId(id);
  };

  const isGeneratedEmail = (email?: string) => {
    if (!email) return true;
    const trimmed = email.trim();
    if (trimmed === '') return true;
    return trimmed.startsWith('cust_') || trimmed.endsWith('@vendia.local') || trimmed.endsWith('@example.com');
  };

  const getDisplayName = (customer: Customer) => {
    const isCompany = customer.is_company === true;
    const company = typeof customer.company_name === 'string' ? customer.company_name.trim() : '';
    if (isCompany && company) return company;

    const name = typeof customer.name === 'string' ? customer.name.trim() : '';
    if (name) return name;

    const first = typeof customer.first_name === 'string' ? customer.first_name.trim() : '';
    const last = typeof customer.last_name === 'string' ? customer.last_name.trim() : '';
    const combined = `${first} ${last}`.trim();
    return combined || '-';
  };

  const getDisplayEmail = (customer: Customer) => {
    const email = typeof customer.email === 'string' ? customer.email.trim() : '';
    if (isGeneratedEmail(email || undefined)) return '-';
    return email || '-';
  };

  const getTypeLabel = (customer: Customer) => {
    return customer.is_company ? t('customers.filters.company', 'บริษัท') : t('customers.filters.personal', 'ลูกค้าทั่วไป');
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  const getPageItems = () => {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
    const items: Array<number | '...'> = [];
    const start = Math.max(2, page - 1);
    const end = Math.min(totalPages - 1, page + 1);

    items.push(1);
    if (start > 2) items.push('...');
    for (let p = start; p <= end; p += 1) items.push(p);
    if (end < totalPages - 1) items.push('...');
    items.push(totalPages);
    return items;
  };

  return (
    <div className="container-fluid p-2 p-md-4">
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
      <ConfirmModal
        open={confirmCustomerId !== null}
        title={t('common.confirm_title', 'ยืนยัน')}
        message={t('customers.delete_confirm')}
        confirmLabel={t('actions.delete', 'ลบ')}
        cancelLabel={t('common.cancel', 'ยกเลิก')}
        busy={confirmBusy}
        onCancel={() => setConfirmCustomerId(null)}
        onConfirm={async () => {
          if (confirmCustomerId === null) return;
          setConfirmBusy(true);
          try {
            await api.delete(`/customers/${confirmCustomerId}`);
            setAlertMessage({ type: 'success', text: t('customers.delete_success') });
            fetchCustomers(page);
          } catch (error) {
            console.error('Failed to delete customer:', error);
            setAlertMessage({ type: 'danger', text: t('customers.delete_failed') });
          } finally {
            setConfirmBusy(false);
            setConfirmCustomerId(null);
          }
        }}
      />
      <div className="d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center gap-2 mb-4">
        <h1 className="h3 m-0">{t('customers.management_title')}</h1>
        <div className="d-grid d-md-flex justify-content-md-end w-100 ms-md-auto">
          <button
            onClick={() => navigate('/customers/create')}
            className="btn btn-success"
          >
            {t('customers.create_new')}
          </button>
        </div>
      </div>

      <div className="mb-4">
        <div className="row g-2">
          <div className="col-12 col-md-3">
            <select
              className="form-select"
              value={customerType}
              onChange={(e) => setCustomerType(e.target.value as 'all' | 'personal' | 'company')}
            >
              <option value="all">{t('customers.filters.all', 'ทั้งหมด')}</option>
              <option value="personal">{t('customers.filters.personal', 'ลูกค้าทั่วไป')}</option>
              <option value="company">{t('customers.filters.company', 'บริษัท')}</option>
            </select>
          </div>
          <div className="col-12 col-md-9">
            <input
              type="text"
              className="form-control"
              placeholder={t('customers.search_placeholder')}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <div className="d-none d-md-block table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th className="p-3 border-bottom-2">{t('customers.fields.id')}</th>
                  <th className="p-3 border-bottom-2">{t('customers.fields.name')}</th>
                  <th className="p-3 border-bottom-2">{t('customers.fields.type', 'ประเภท')}</th>
                  <th className="p-3 border-bottom-2">{t('customers.company')}</th>
                  <th className="p-3 border-bottom-2">{t('customers.phone')}</th>
                  <th className="p-3 border-bottom-2">{t('customers.email')}</th>
                  <th className="p-3 border-bottom-2">{t('customers.tax_id')}</th>
                  <th className="p-3 border-bottom-2 text-end">{t('customers.fields.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {customers.length > 0 ? (
                  customers.map((customer) => (
                    <tr
                      key={customer.id}
                      onClick={() => navigate(`/customers/${customer.id}/edit`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <td className="p-3">{customer.id}</td>
                      <td className="p-3">
                        <div className="fw-bold">{getDisplayName(customer)}</div>
                      </td>
                      <td className="p-3">
                        <span className={`badge ${customer.is_company ? 'bg-info' : 'bg-secondary'}`}>
                          {getTypeLabel(customer)}
                        </span>
                      </td>
                      <td className="p-3">{customer.company_name || '-'}</td>
                      <td className="p-3">{customer.phone || '-'}</td>
                      <td className="p-3">{getDisplayEmail(customer)}</td>
                      <td className="p-3">{customer.tax_id || '-'}</td>
                      <td className="p-3 text-end">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/customers/${customer.id}/edit`);
                          }}
                          className="btn btn-sm btn-outline-primary me-2"
                        >
                          {t('actions.edit')}
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDelete(customer.id);
                          }}
                          className="btn btn-sm btn-outline-danger"
                        >
                          {t('actions.delete')}
                        </button>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={8} className="text-center p-4 text-muted">
                      {t('customers.no_customers')}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="d-block d-md-none p-2">
            {customers.length > 0 ? (
              <div className="d-flex flex-column gap-2">
                {customers.map((customer) => {
                  const displayName = getDisplayName(customer);
                  const displayEmail = getDisplayEmail(customer);
                  const isCompany = customer.is_company === true;
                  const typeLabel = getTypeLabel(customer);
                  return (
                    <div
                      key={customer.id}
                      className="card border-0 shadow-sm text-start w-100"
                      onClick={() => navigate(`/customers/${customer.id}/edit`)}
                      role="button"
                      tabIndex={0}
                      style={{ cursor: 'pointer' }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' || e.key === ' ') {
                          e.preventDefault();
                          navigate(`/customers/${customer.id}/edit`);
                        }
                      }}
                    >
                      <div className="card-body py-3">
                        <div className="d-flex justify-content-between align-items-start gap-2">
                          <div style={{ minWidth: 0 }}>
                            <div className="fw-bold text-truncate">{displayName}</div>
                            <div className="small text-muted">
                              {t('customers.fields.id', 'ID')}: {customer.id}
                            </div>
                          </div>
                          <div className="text-end">
                            <span className={`badge ${isCompany ? 'bg-info' : 'bg-secondary'}`}>{typeLabel}</span>
                          </div>
                        </div>

                        {(customer.company_name || customer.phone || displayEmail !== '-' || customer.tax_id) && (
                          <div className="mt-2 small text-muted">
                            {isCompany && customer.company_name && (
                              <div className="text-truncate">{t('customers.company', 'บริษัท')}: {customer.company_name}</div>
                            )}
                            {customer.phone && <div className="text-truncate">{t('customers.phone', 'เบอร์โทร')}: {customer.phone}</div>}
                            {displayEmail !== '-' && <div className="text-truncate">{t('customers.email', 'อีเมล')}: {displayEmail}</div>}
                            {customer.tax_id && <div className="text-truncate">{t('customers.tax_id', 'เลขผู้เสียภาษี')}: {customer.tax_id}</div>}
                          </div>
                        )}

                        <div className="d-flex justify-content-end gap-2 mt-3">
                          <button
                            type="button"
                            className="btn btn-outline-primary btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/customers/${customer.id}/edit`);
                            }}
                          >
                            {t('actions.edit')}
                          </button>
                          <button
                            type="button"
                            className="btn btn-outline-danger btn-sm"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(customer.id);
                            }}
                          >
                            {t('actions.delete')}
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            ) : (
              <div className="text-center p-4 text-muted">
                {t('customers.no_customers')}
              </div>
            )}
          </div>
        </div>
        {totalPages > 1 && (
          <div className="card-footer bg-white py-3">
            <nav aria-label="Page navigation">
              <ul className="pagination justify-content-center mb-0 flex-wrap">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    {t('common.previous')}
                  </button>
                </li>
                {getPageItems().map((p, idx) => (
                  p === '...' ? (
                    <li key={`ellipsis-${idx}`} className="page-item disabled">
                      <span className="page-link">…</span>
                    </li>
                  ) : (
                    <li key={p} className={`page-item ${page === p ? 'active' : ''}`}>
                      <button className="page-link" onClick={() => setPage(p)}>{p}</button>
                    </li>
                  )
                ))}
                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={page === totalPages}
                  >
                    {t('common.next')}
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
