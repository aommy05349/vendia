import React, { useState, useEffect } from 'react';
import { api } from '@vendia/shared';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
}

export const AppointmentList = () => {
  const { t } = useTranslation();
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    status: '',
    start_date: '',
    end_date: '',
  });

  useEffect(() => {
    fetchAppointments();
  }, [filters]);

  const fetchAppointments = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.start_date) params.append('start_date', filters.start_date);
      if (filters.end_date) params.append('end_date', filters.end_date);

      const response = await api.get(`/appointments?${params.toString()}`);
      setAppointments(response.data);
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

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{t('appointments.title')}</h2>
        <Link to="/appointments/create" className="btn btn-primary">
          <i className="bi bi-plus-lg me-2"></i>{t('appointments.create_btn')}
        </Link>
      </div>

      <div className="card mb-4">
        <div className="card-body">
          <div className="row g-3">
            <div className="col-md-3">
              <label className="form-label">{t('appointments.filter_status')}</label>
              <select
                className="form-select"
                value={filters.status}
                onChange={(e) => setFilters({ ...filters, status: e.target.value })}
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
                onChange={(e) => setFilters({ ...filters, start_date: e.target.value })}
              />
            </div>
            <div className="col-md-3">
              <label className="form-label">{t('appointments.end_date')}</label>
              <input
                type="date"
                className="form-control"
                value={filters.end_date}
                onChange={(e) => setFilters({ ...filters, end_date: e.target.value })}
              />
            </div>
             <div className="col-md-3 d-flex align-items-end">
                 <button className="btn btn-outline-secondary w-100" onClick={() => setFilters({status: '', start_date: '', end_date: ''})}>{t('appointments.clear_filters')}</button>
             </div>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="text-center">
          <div className="spinner-border text-primary" role="status"></div>
          <p className="mt-2">{t('appointments.loading')}</p>
        </div>
      ) : (
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
                      <div>{new Date(apt.start_time).toLocaleDateString()}</div>
                      <small className="text-muted">
                        {new Date(apt.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </small>
                    </td>
                    <td>{apt.title}</td>
                    <td>
                      {apt.customer.first_name ? `${apt.customer.first_name} ${apt.customer.last_name || ''}` : apt.customer.name}
                      {apt.customer.company_name && <div className="text-muted small">{apt.customer.company_name}</div>}
                    </td>
                    <td className="text-truncate" style={{ maxWidth: '200px' }} title={apt.address}>
                      {apt.location_name && <strong>{apt.location_name}: </strong>}
                      {apt.address}
                    </td>
                    <td>
                      {apt.technicians.map((tech) => (
                        <div key={tech.id} className="d-flex align-items-center gap-1">
                          {tech.pivot.is_lead && <span className="badge bg-warning text-dark" style={{fontSize: '0.6rem'}}>{t('appointments.table.lead')}</span>}
                          <small>{tech.first_name || tech.id}</small>
                        </div>
                      ))}
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
      )}
    </div>
  );
};
