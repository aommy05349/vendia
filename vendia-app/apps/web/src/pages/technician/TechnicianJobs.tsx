import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { api, useAuthStore } from '@vendia/shared';

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
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [jobs, setJobs] = useState<Job[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<'today' | 'upcoming' | 'history'>('today');

  useEffect(() => {
    if (user) {
      fetchJobs();
    }
  }, [user, filter]);

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

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>My Jobs</h2>
        <button className="btn btn-outline-secondary" onClick={() => navigate('/')}>
          <i className="bi bi-house me-2"></i>Dashboard
        </button>
      </div>

      {/* Tabs */}
      <ul className="nav nav-pills mb-4">
        <li className="nav-item">
          <button 
            className={`nav-link ${filter === 'today' ? 'active' : ''}`}
            onClick={() => setFilter('today')}
          >
            Today
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${filter === 'upcoming' ? 'active' : ''}`}
            onClick={() => setFilter('upcoming')}
          >
            Upcoming
          </button>
        </li>
        <li className="nav-item">
          <button 
            className={`nav-link ${filter === 'history' ? 'active' : ''}`}
            onClick={() => setFilter('history')}
          >
            History
          </button>
        </li>
      </ul>

      {loading ? (
        <div className="text-center p-5">Loading jobs...</div>
      ) : jobs.length === 0 ? (
        <div className="alert alert-info">No jobs found for this period.</div>
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
                      {job.status.replace('_', ' ').toUpperCase()}
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
                  <small className="text-primary">View Details <i className="bi bi-chevron-right"></i></small>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
