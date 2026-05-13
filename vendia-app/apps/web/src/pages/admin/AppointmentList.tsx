import React, { useState, useEffect } from 'react';
import { api } from '@vendia/shared';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { th, enUS } from 'date-fns/locale';
import { AppointmentCalendar } from './AppointmentCalendar';
import { AppointmentMap } from './AppointmentMap';
import { MessageModal } from '../../components/MessageModal';

interface Appointment {
  id: number;
  title: string;
  start_time: string;
  end_time: string | null;
  status: string;
  customer: {
    id: number;
    name: string;
    first_name?: string;
    last_name?: string;
    company_name?: string;
  };
  technicians: {
    id: number;
    first_name?: string;
    last_name?: string;
    pivot: {
      is_lead: boolean;
    };
  }[];
  location_name: string | null;
  address: string;
  latitude?: string | number | null;
  longitude?: string | number | null;
}

export const AppointmentList = () => {
  const { t, i18n } = useTranslation();
  const locale = i18n.language === 'th' ? th : enUS;
  const location = useLocation() as any;
  const navigate = useNavigate();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [filters, setFilters] = useState({
    status: '',
    start_date: '',
    end_date: '',
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [perPage] = useState(10);
  const [totalItems, setTotalItems] = useState(0);

  useEffect(() => {
    if (viewMode !== 'map') {
      fetchAppointments();
    }
  }, [filters, viewMode, currentMonth, currentPage]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);

      if (viewMode === 'calendar') {
        const start = startOfWeek(startOfMonth(currentMonth));
        const end = endOfWeek(endOfMonth(currentMonth));
        params.append('start_date', format(start, 'yyyy-MM-dd'));
        params.append('end_date', format(end, 'yyyy-MM-dd'));
        
        const response = await api.get(`/appointments?${params.toString()}`);
        setAppointments(response.data);
      } else if (viewMode === 'list') {
        if (filters.start_date) params.append('start_date', filters.start_date);
        if (filters.end_date) params.append('end_date', filters.end_date);
        
        // Add pagination params
        params.append('per_page', perPage.toString());
        params.append('page', currentPage.toString());
        
        const response = await api.get(`/appointments?${params.toString()}`);
        
        if (response.data.data) {
            // Paginated response
            setAppointments(response.data.data);
            setTotalPages(response.data.last_page);
            setTotalItems(response.data.total);
            setCurrentPage(response.data.current_page);
        } else {
            // Fallback for non-paginated response (should not happen if per_page is set)
            setAppointments(response.data);
        }
      } else {
         // Map view usually handles its own fetching or we can fetch all
         // For now, let's keep it simple or let the map component handle it if it does
         // But the original code didn't fetch for map in this effect if viewMode === 'map'
      }

    } catch (error) {
      console.error('Failed to fetch appointments', error);
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary';
      case 'en_route': return 'bg-info text-dark';
      case 'in_progress': return 'bg-warning text-dark';
      case 'completed': return 'bg-success';
      case 'cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  const getStatusLabel = (status: string) => {
    return t(`appointments.status.${status}`, status.replace('_', ' ').toUpperCase());
  };

  const showCreatedAlert = location.state?.appointmentCreated;
  const showDetailErrorAlert = location.state?.appointmentDetailLoadError;
  const showEditErrorAlert = location.state?.appointmentEditLoadError;
  const messageModal = showCreatedAlert
    ? { type: 'success' as const, text: t('appointments.create.success') }
    : showDetailErrorAlert
      ? { type: 'danger' as const, text: t('appointments.detail.load_failed') }
      : showEditErrorAlert
        ? { type: 'danger' as const, text: t('appointments.edit.failed_update') }
        : null;

  return (
    <div className="container-fluid p-4">
      <MessageModal
        open={messageModal !== null}
        type={messageModal?.type || 'danger'}
        title={
          messageModal?.type === 'success'
            ? t('common.success_title', 'สำเร็จ')
            : t('common.error_title', 'ไม่สำเร็จ')
        }
        message={messageModal?.text || ''}
        okLabel={t('common.ok', 'ตกลง')}
        onClose={() => {
          navigate(`${location.pathname}${location.search || ''}`, {
            replace: true,
            state: {},
          });
        }}
      />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{t('appointments.title')}</h2>
        <div className="d-flex gap-2">
            <div className="btn-group">
                <button 
                    className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewMode('list')}
                >
                    <i className="bi bi-list-ul me-2"></i>{t('appointments.view_list', 'List')}
                </button>
                <button 
                    className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewMode('calendar')}
                >
                    <i className="bi bi-calendar3 me-2"></i>{t('appointments.view_calendar', 'Calendar')}
                </button>
                <button 
                    className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setViewMode('map')}
                >
                    <i className="bi bi-map me-2"></i>{t('appointments.view_map', 'Map')}
                </button>
            </div>
        </div>
      </div>

      {viewMode === 'list' && (
      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">{t('appointments.filter_status')}</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => {
                    setFilters({ ...filters, status: e.target.value });
                    setCurrentPage(1);
                }}
              >
                <option value="">{t('appointments.status.all')}</option>
                <option value="scheduled">{t('appointments.status.scheduled')}</option>
                <option value="en_route">{t('appointments.status.en_route')}</option>
                <option value="in_progress">{t('appointments.status.in_progress')}</option>
                <option value="completed">{t('appointments.status.completed')}</option>
                <option value="cancelled">{t('appointments.status.cancelled')}</option>
              </select>
            </div>
            <div className="col-md-3">
              <label className="form-label">{t('appointments.start_date')}</label>
              <input
                type="date"
                className="form-control"
                value={filters.start_date}
                onChange={(e) => {
                    setFilters({ ...filters, start_date: e.target.value });
                    setCurrentPage(1);
                }}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">{t('appointments.end_date')}</label>
              <input
                type="date"
                className="form-control"
                value={filters.end_date}
                onChange={(e) => {
                    setFilters({ ...filters, end_date: e.target.value });
                    setCurrentPage(1);
                }}
              />
            </div>
            <div className="col-md-3 d-flex align-items-end">
                 <button className="btn btn-outline-secondary w-100" onClick={() => {
                     setFilters({status: '', start_date: '', end_date: ''});
                     setCurrentPage(1);
                 }}>{t('appointments.clear_filters')}</button>
            </div>
          </div>
        </div>
      </div>
      )}

      {viewMode === 'map' ? (
        <AppointmentMap 
            currentDate={selectedDate}
            onDateChange={setSelectedDate}
        />
      ) : viewMode === 'calendar' ? (
        <AppointmentCalendar 
            appointments={appointments}
            currentDate={currentMonth}
            onDateChange={setCurrentMonth}
            loading={loading}
        />
      ) : (
      loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">{t('appointments.loading')}</p>
        </div>
      ) : (
        <>
        <div className="table-responsive card">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th>{t('appointments.table.date_time')}</th>
                <th>{t('appointments.table.title')}</th>
                <th>{t('appointments.table.customer')}</th>
                <th>{t('appointments.table.location')}</th>
                <th>{t('appointments.table.technicians')}</th>
                <th>{t('appointments.table.status')}</th>
                <th>{t('appointments.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {appointments.length > 0 ? (
                appointments.map((apt) => (
                  <tr key={apt.id}>
                    <td>
                      <div>
                        {format(new Date(apt.start_time), 'dd/MM/yyyy', { locale })}
                      </div>
                      <small className="text-muted">
                        {format(new Date(apt.start_time), 'HH:mm', { locale })}
                      </small>
                    </td>
                    <td>{apt.title}</td>
                    <td>
                      {apt.customer.company_name || (apt.customer.first_name ? `${apt.customer.first_name} ${apt.customer.last_name || ''}` : apt.customer.name)}
                      {apt.customer.company_name && <div className="text-muted small">{apt.customer.company_name}</div>}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '200px' }} title={apt.address}>
                      {apt.location_name && <strong>{apt.location_name}: </strong>}
                      {apt.address}
                      {apt.latitude && apt.longitude && (
                        <div className="small text-muted mt-1">
                            <i className="bi bi-geo-alt-fill text-danger me-1"></i>
                            {Number(apt.latitude).toFixed(4)}, {Number(apt.longitude).toFixed(4)}
                        </div>
                      )}
                    </td>
                    <td>
                      {apt.technicians.map((tech) => {
                        const hasValidFirstName =
                          tech.first_name &&
                          tech.first_name !== '0' &&
                          tech.first_name !== '1';

                        return (
                          <div key={tech.id} className="d-flex align-items-center gap-1">
                            {tech.pivot.is_lead && (
                              <span
                                className="badge bg-warning text-dark"
                                style={{ fontSize: '0.6rem' }}
                              >
                                {t('appointments.table.lead')}
                              </span>
                            )}
                            <small>{hasValidFirstName ? tech.first_name : ''}</small>
                          </div>
                        );
                      })}
                    </td>
                    <td>
                      <span className={`badge ${getStatusBadge(apt.status)}`}>
                        {getStatusLabel(apt.status)}
                      </span>
                    </td>
                    <td>
                      <Link to={`/appointments/${apt.id}`} className="btn btn-sm btn-outline-primary">
                        {t('appointments.view')}
                      </Link>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-4 text-muted">
                    {t('appointments.no_appointments')}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {viewMode === 'list' && totalPages > 1 && (
            <div className="d-flex justify-content-between align-items-center mt-3">
                <div className="text-muted small">
                    Showing {(currentPage - 1) * perPage + 1} to {Math.min(currentPage * perPage, totalItems)} of {totalItems} entries
                </div>
                <nav>
                    <ul className="pagination justify-content-end mb-0">
                        <li className={`page-item ${currentPage === 1 ? 'disabled' : ''}`}>
                            <button 
                                className="page-link" 
                                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                disabled={currentPage === 1}
                            >
                                <i className="bi bi-chevron-left"></i>
                            </button>
                        </li>
                        
                        {[...Array(totalPages)].map((_, i) => {
                            const page = i + 1;
                            if (
                                page === 1 || 
                                page === totalPages || 
                                (page >= currentPage - 1 && page <= currentPage + 1)
                            ) {
                                return (
                                    <li key={page} className={`page-item ${currentPage === page ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setCurrentPage(page)}>
                                            {page}
                                        </button>
                                    </li>
                                );
                            } else if (
                                (page === currentPage - 2 && page > 2) || 
                                (page === currentPage + 2 && page < totalPages - 1)
                            ) {
                                return <li key={page} className="page-item disabled"><span className="page-link">...</span></li>;
                            }
                            return null;
                        })}

                        <li className={`page-item ${currentPage === totalPages ? 'disabled' : ''}`}>
                            <button 
                                className="page-link" 
                                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                disabled={currentPage === totalPages}
                            >
                                <i className="bi bi-chevron-right"></i>
                            </button>
                        </li>
                    </ul>
                </nav>
            </div>
        )}
        </>
      )
      )}
    </div>
  );
};
