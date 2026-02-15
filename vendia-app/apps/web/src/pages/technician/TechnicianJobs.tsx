import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, format } from 'date-fns';
import { api, useAuthStore } from '@vendia/shared';
import { AppointmentCalendar } from '../admin/AppointmentCalendar';
import { AppointmentMap } from '../admin/AppointmentMap';

interface Job {
  id: number;
  title: string;
  start_time: string;
  end_time: string | null;
  status: string;
  customer: {
    name: string;
  };
  address: string;
  location_name: string | null;
}

export const TechnicianJobs = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'history'>('today');
  const [viewMode, setViewMode] = useState<'list' | 'calendar' | 'map'>('list');
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [calendarJobs, setCalendarJobs] = useState<Job[]>([]);
  const [calendarLoading, setCalendarLoading] = useState(false);
  const [mapJobs, setMapJobs] = useState<Job[]>([]);
  const [mapLoading, setMapLoading] = useState(false);

  useEffect(() => {
    if (user) {
      if (viewMode === 'list') {
        fetchJobs();
      }
    }
  }, [user, filter, viewMode]);

  useEffect(() => {
    if (user && viewMode === 'calendar') {
      fetchCalendarJobs();
    }
  }, [user, viewMode, currentMonth]);

  useEffect(() => {
    if (user && viewMode === 'map') {
      fetchMapJobs();
    }
  }, [user, viewMode, selectedDate]);

  const fetchJobs = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('technician_id', user!.id.toString());
      
      const today = new Date().toISOString().split('T')[0];
      
      if (filter === 'today') {
        params.append('start_date', `${today} 00:00:00`);
        params.append('end_date', `${today} 23:59:59`);
      } else if (filter === 'upcoming') {
        // Start from tomorrow
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        params.append('start_date', `${tomorrow.toISOString().split('T')[0]} 00:00:00`);
        // No end date for upcoming
        params.append('end_date', '2099-12-31 23:59:59'); 
      } else if (filter === 'history') {
        // Until yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        params.append('end_date', `${yesterday.toISOString().split('T')[0]} 23:59:59`);
        // Maybe limit history to last 30 days?
        const lastMonth = new Date();
        lastMonth.setDate(lastMonth.getDate() - 30);
        params.append('start_date', `${lastMonth.toISOString().split('T')[0]} 00:00:00`);
      }

      const response = await api.get(`/appointments?${params.toString()}`);
      setJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch jobs', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchCalendarJobs = async () => {
    setCalendarLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('technician_id', user!.id.toString());

      const start = startOfWeek(startOfMonth(currentMonth));
      const end = endOfWeek(endOfMonth(currentMonth));
      params.append('start_date', format(start, 'yyyy-MM-dd'));
      params.append('end_date', format(end, 'yyyy-MM-dd'));

      const response = await api.get(`/appointments?${params.toString()}`);
      setCalendarJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch calendar jobs', error);
    } finally {
      setCalendarLoading(false);
    }
  };

  const fetchMapJobs = async () => {
    setMapLoading(true);
    try {
      const params = new URLSearchParams();
      params.append('technician_id', user!.id.toString());

      const dateStr = format(selectedDate, 'yyyy-MM-dd');
      params.append('start_date', `${dateStr} 00:00:00`);
      params.append('end_date', `${dateStr} 23:59:59`);

      const response = await api.get(`/appointments?${params.toString()}`);
      setMapJobs(response.data);
    } catch (error) {
      console.error('Failed to fetch map jobs', error);
    } finally {
      setMapLoading(false);
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

  const calendarAppointments = calendarJobs.map((job: any) => ({
    id: job.id,
    title: job.title,
    start_time: job.start_time,
    end_time: job.end_time,
    status: job.status,
    customer: {
      id: job.customer?.id ?? 0,
      name: job.customer?.name ?? '',
      first_name: job.customer?.first_name ?? job.customer?.name ?? '',
      last_name: job.customer?.last_name ?? '',
      company_name: job.customer?.company_name,
    },
    technicians: job.technicians && Array.isArray(job.technicians) && job.technicians.length > 0
      ? job.technicians
      : [
          {
            id: user?.id ?? 0,
            first_name: (user as any)?.first_name,
            last_name: (user as any)?.last_name,
            pivot: { is_lead: true },
          },
        ],
    location_name: job.location_name,
    address: job.address,
    latitude: job.latitude,
    longitude: job.longitude,
  }));

  const mapAppointments = mapJobs.map((job: any) => ({
    id: job.id,
    title: job.title,
    start_time: job.start_time,
    end_time: job.end_time,
    status: job.status,
    customer: {
      id: job.customer?.id ?? 0,
      name: job.customer?.name ?? '',
      first_name: job.customer?.first_name ?? job.customer?.name ?? '',
      last_name: job.customer?.last_name ?? '',
      company_name: job.customer?.company_name,
    },
    location_name: job.location_name,
    address: job.address,
    latitude: job.latitude,
    longitude: job.longitude,
  }));

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{t('technician.jobs.title')}</h2>
        <div className="btn-group">
          <button
            className={`btn ${viewMode === 'list' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('list')}
          >
            <i className="bi bi-list-ul me-2"></i>
            {t('appointments.view_list', 'List')}
          </button>
          <button
            className={`btn ${viewMode === 'calendar' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('calendar')}
          >
            <i className="bi bi-calendar3 me-2"></i>
            {t('appointments.view_calendar', 'Calendar')}
          </button>
          <button
            className={`btn ${viewMode === 'map' ? 'btn-primary' : 'btn-outline-primary'}`}
            onClick={() => setViewMode('map')}
          >
            <i className="bi bi-map me-2"></i>
            {t('appointments.view_map', 'Map')}
          </button>
        </div>
      </div>

      {viewMode === 'list' && (
        <>
          <ul className="nav nav-pills mb-4">
            <li className="nav-item">
              <button
                className={`nav-link ${filter === 'today' ? 'active' : ''}`}
                onClick={() => setFilter('today')}
              >
                {t('technician.jobs.filter.today')}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${filter === 'upcoming' ? 'active' : ''}`}
                onClick={() => setFilter('upcoming')}
              >
                {t('technician.jobs.filter.upcoming')}
              </button>
            </li>
            <li className="nav-item">
              <button
                className={`nav-link ${filter === 'history' ? 'active' : ''}`}
                onClick={() => setFilter('history')}
              >
                {t('technician.jobs.filter.history')}
              </button>
            </li>
          </ul>

          {loading ? (
            <div className="text-center p-5">{t('technician.jobs.loading')}</div>
          ) : jobs.length === 0 ? (
            <div className="alert alert-info">{t('technician.jobs.no_jobs')}</div>
          ) : (
            <div className="row g-3">
              {jobs.map(job => (
                <div key={job.id} className="col-12 col-md-6 col-lg-4">
                  <div
                    className="card h-100 shadow-sm"
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/appointments/${job.id}`)}
                  >
                    <div className="card-body">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h5 className="card-title mb-0 text-truncate">{job.title}</h5>
                        <span className={`badge ${getStatusBadge(job.status)}`}>
                          {t(`appointments.status.${job.status}`, job.status)}
                        </span>
                      </div>

                      <p className="card-text text-muted mb-2">
                        <i className="bi bi-clock me-2"></i>
                        {new Date(job.start_time).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </p>

                      <p className="card-text mb-1">
                        <i className="bi bi-person me-2"></i>
                        {job.customer.name}
                      </p>

                      <p className="card-text text-truncate">
                        <i className="bi bi-geo-alt me-2"></i>
                        {job.location_name || job.address}
                      </p>
                    </div>
                    <div className="card-footer bg-white border-top-0 text-end">
                      <small className="text-primary">
                        {t('technician.jobs.view_details')} <i className="bi bi-chevron-right"></i>
                      </small>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {viewMode === 'calendar' && (
        <>
          {calendarLoading ? (
            <div className="text-center p-5">{t('technician.jobs.loading')}</div>
          ) : (
            <AppointmentCalendar
              appointments={calendarAppointments}
              currentDate={currentMonth}
              onDateChange={setCurrentMonth}
              loading={calendarLoading}
            />
          )}
        </>
      )}

      {viewMode === 'map' && (
        <>
          {mapLoading ? (
            <div className="text-center p-5">{t('technician.jobs.loading')}</div>
          ) : (
            <AppointmentMap
              currentDate={selectedDate}
              onDateChange={setSelectedDate}
              appointments={mapAppointments}
            />
          )}
        </>
      )}
    </div>
  );
};
