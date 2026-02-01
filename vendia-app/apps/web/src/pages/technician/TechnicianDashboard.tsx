import React, { useState, useEffect } from 'react';
import { api, useAuthStore } from '@vendia/shared';
import { Link } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { AttendanceHistory } from '../admin/AttendanceHistory';

const formatDuration = (startDate: string) => {
  const start = new Date(startDate).getTime();
  const now = new Date().getTime();
  const diff = now - start;
  
  if (diff < 0) return "00:00:00"; // Should not happen usually

  const hours = Math.floor(diff / (1000 * 60 * 60));
  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);
  
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
};

const LiveDuration = ({ startTime }: { startTime: string }) => {
    const [duration, setDuration] = useState(formatDuration(startTime));
    
    useEffect(() => {
        const timer = setInterval(() => {
            setDuration(formatDuration(startTime));
        }, 1000);
        return () => clearInterval(timer);
    }, [startTime]);

    return <>{duration}</>;
};

export const TechnicianDashboard = () => {
  const { t } = useTranslation();
  const { user } = useAuthStore();
  
  // Technician State
  const [status, setStatus] = useState<'checked_in' | 'checked_out' | 'loading'>('loading');
  const [attendance, setAttendance] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Admin State
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [adminLoading, setAdminLoading] = useState(true);
  
  // History Modal State
  const [selectedTech, setSelectedTech] = useState<any>(null);
  const [history, setHistory] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyPage, setHistoryPage] = useState(1);
  const [historyTotalPages, setHistoryTotalPages] = useState(1);

  // Absent Modal State
  const [showAbsentModal, setShowAbsentModal] = useState(false);
  const [absentTech, setAbsentTech] = useState<any>(null);
  const [absentType, setAbsentType] = useState('weekly_off');
  const [absentReason, setAbsentReason] = useState('');
  const [absentLoading, setAbsentLoading] = useState(false);

  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    if (user?.role === 'technician') {
        fetchStatus();
    } else if (user?.role === 'admin') {
        fetchOverview();
        const poll = setInterval(fetchOverview, 60000); // Poll every minute for updates
        return () => clearInterval(poll);
    }
  }, [user]);

  // Technician Functions
  const fetchStatus = async () => {
    try {
      const response = await api.get('/attendance/status');
      setStatus(response.data.status);
      setAttendance(response.data.data);
    } catch (error) {
      console.error('Failed to fetch attendance status', error);
    }
  };

  const handleCheckIn = async () => {
    setLoading(true);
    try {
      await api.post('/attendance/check-in');
      await fetchStatus();
    } catch (error) {
      console.error('Check-in failed', error);
      alert(t('attendance.dashboard.check_in_failed'));
    } finally {
      setLoading(false);
    }
  };

  const handleCheckOut = async () => {
    setLoading(true);
    try {
      await api.post('/attendance/check-out');
      await fetchStatus();
    } catch (error) {
      console.error('Check-out failed', error);
      alert(t('attendance.dashboard.check_out_failed'));
    } finally {
      setLoading(false);
    }
  };

  // Admin Functions
  const fetchOverview = async () => {
      try {
          const response = await api.get('/attendance/overview');
          setTechnicians(response.data);
      } catch (error) {
          console.error('Failed to fetch overview', error);
      } finally {
          setAdminLoading(false);
      }
  };

  const fetchHistory = async (userId: number, page: number = 1) => {
    setHistoryLoading(true);
    try {
        const response = await api.get(`/attendance/history/${userId}?page=${page}`);
        setHistory(response.data.data);
        setHistoryPage(response.data.current_page);
        setHistoryTotalPages(response.data.last_page);
    } catch (error) {
        console.error('Failed to fetch history', error);
    } finally {
        setHistoryLoading(false);
    }
  };

  const handleCardClick = (tech: any) => {
    setSelectedTech(tech);
    fetchHistory(tech.user.id, 1);
  };

  const handleAbsentClick = (e: React.MouseEvent, tech: any) => {
      e.stopPropagation(); // Prevent card click
      setAbsentTech(tech);
      setAbsentType('weekly_off');
      setAbsentReason('');
      setShowAbsentModal(true);
  };

  const submitAbsent = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!absentTech) return;

      const finalReason = absentType === 'weekly_off' ? 'วันหยุดประจำสัปดาห์' : absentReason;

      if (absentType === 'absent' && !finalReason) {
          alert('Please provide a reason');
          return;
      }
      
      setAbsentLoading(true);
      try {
          await api.post('/attendance/absent', {
              user_id: absentTech.user.id,
              reason: finalReason
          });
          setShowAbsentModal(false);
          fetchOverview();
      } catch (error) {
          console.error('Failed to mark absent', error);
          alert('Failed to mark absent');
      } finally {
          setAbsentLoading(false);
      }
  };

  const closeHistoryModal = () => {
    setSelectedTech(null);
    setHistory([]);
    setHistoryPage(1);
  };

  const calculateDuration = (start: string, end: string | null) => {
    if (!end) return 'In Progress';
    const startTime = new Date(start).getTime();
    const endTime = new Date(end).getTime();
    const diff = endTime - startTime;
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    return `${hours}h ${minutes}m`;
  };

  // Render Admin View
  if (user?.role === 'admin') {
      return (
          <div className="container-fluid p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                  <h2 className="h3">{t('attendance.dashboard.title')}</h2>
                  <div className="text-muted">
                      {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                      {' '}
                      {currentTime.toLocaleTimeString()}
                  </div>
              </div>

              {adminLoading ? (
                  <div className="text-center p-5">
                      <div className="spinner-border text-primary" role="status"></div>
                  </div>
              ) : (
                  <>
                    <div className="row g-4">
                        {technicians.length === 0 ? (
                            <div className="col-12 text-center text-muted p-5">
                                {t('attendance.dashboard.no_technicians')}
                            </div>
                        ) : (
                            technicians.map((tech) => (
                                <div className="col-md-4 col-lg-3 col-xl-2" key={tech.user.id}>
                                    <div 
                                        className={`card h-100 shadow-sm border-${tech.status === 'working' ? 'success' : (tech.status === 'absent' ? 'danger' : 'light')} cursor-pointer`} 
                                        style={{ borderLeftWidth: tech.status === 'working' ? '4px' : '1px', cursor: 'pointer', transition: 'transform 0.2s', fontSize: '0.9rem' }}
                                        onClick={() => handleCardClick(tech)}
                                        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                    >
                                        <div className="card-header bg-white d-flex justify-content-between align-items-center py-2 px-3">
                                            <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                <div className={`rounded-circle d-flex align-items-center justify-content-center text-white me-2 fw-bold ${tech.status === 'working' ? 'bg-success' : (tech.status === 'absent' ? 'bg-danger' : 'bg-secondary')}`} style={{ width: '32px', height: '32px', minWidth: '32px', fontSize: '0.85rem' }}>
                                                    {tech.user.first_name.charAt(0)}
                                                </div>
                                                <div className="text-truncate">
                                                    <h6 className="mb-0 text-truncate fw-bold" style={{ fontSize: '0.9rem' }}>{tech.user.first_name}</h6>
                                                </div>
                                            </div>
                                            <span className={`badge ${tech.status === 'working' ? 'bg-success' : (tech.status === 'absent' ? 'bg-danger' : 'bg-secondary')}`} style={{ fontSize: '0.7rem' }}>
                                                {tech.status === 'working' ? 'ON' : (tech.status === 'absent' ? 'ABS' : 'OFF')}
                                            </span>
                                        </div>
                                        <div className="card-body text-center d-flex flex-column justify-content-center p-2">
                                            {tech.status === 'working' ? (
                                                <div>
                                                    <div className="text-muted mb-1 small text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>{t('attendance.dashboard.checked_in')}</div>
                                                    <div className="fw-bold mb-2 text-dark" style={{ fontSize: '1.1rem' }}>
                                                        {new Date(tech.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                    </div>
                                                    <div className="text-muted mb-1 small text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>{t('attendance.dashboard.duration')}</div>
                                                    <div className="fw-bold text-success font-monospace" style={{ fontSize: '1.4rem' }}>
                                                        <LiveDuration startTime={tech.check_in} />
                                                    </div>
                                                </div>
                                            ) : tech.status === 'absent' ? (
                                                <div className="text-danger py-2">
                                                    <div className="fw-bold mb-1" style={{ fontSize: '1rem' }}>{t('attendance.dashboard.absent')}</div>
                                                    <div className="text-muted fst-italic text-truncate" style={{ fontSize: '0.8rem', maxWidth: '100%' }}>{tech.reason || t('attendance.dashboard.no_reason')}</div>
                                                </div>
                                            ) : (
                                                <div className="text-muted py-2">
                                                    {tech.last_seen ? (
                                                        <>
                                                            <div className="small text-uppercase fw-bold mb-1" style={{ fontSize: '0.7rem' }}>{t('attendance.dashboard.last_seen')}</div>
                                                            <div className="fw-bold" style={{ fontSize: '1rem' }}>{new Date(tech.last_seen).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                                                        </>
                                                    ) : (
                                                        <div className="d-flex flex-column gap-2">
                                                            <span className="fst-italic small">{t('attendance.dashboard.no_activity')}</span>
                                                            <button 
                                                                className="btn btn-sm btn-outline-danger mx-auto"
                                                                style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    handleAbsentClick(e, tech);
                                                                }}
                                                            >
                                                                {t('attendance.dashboard.mark_absent')}
                                                            </button>
                                                        </div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                        <div className={`card-footer py-1 px-2 small ${tech.status === 'working' ? 'bg-success text-white' : 'bg-light'}`} style={{ fontSize: '0.75rem' }}>
                                            <div className="d-flex justify-content-between align-items-center">
                                                <span>{t('attendance.dashboard.weekly_off')}:</span>
                                                <span className={`fw-bold ${tech.status !== 'working' && (tech.weekly_off_count >= 1 ? 'text-danger' : 'text-success')}`}>
                                                    {tech.weekly_off_count || 0}/1
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>
                    
                    {/* Attendance History Section (Admin Only) */}
                    <div className="border-top">
                        <AttendanceHistory embedded={true} />
                    </div>

                        {/* Absent Modal */}
                    {showAbsentModal && (
                        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                            <div className="modal-dialog modal-dialog-centered">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">{t('attendance.dashboard.mark_absent_modal.title', { name: `${absentTech?.user.first_name} ${absentTech?.user.last_name}` })}</h5>
                                        <button type="button" className="btn-close" onClick={() => setShowAbsentModal(false)}></button>
                                    </div>
                                    <form onSubmit={submitAbsent}>
                                        <div className="modal-body">
                                            <div className="mb-3">
                                                <label htmlFor="absentType" className="form-label">{t('attendance.dashboard.mark_absent_modal.type')}</label>
                                                <select 
                                                    className="form-select mb-3" 
                                                    id="absentType" 
                                                    value={absentType} 
                                                    onChange={(e) => setAbsentType(e.target.value)}
                                                >
                                                    <option value="weekly_off">{t('attendance.dashboard.mark_absent_modal.types.weekly_off')}</option>
                                                    <option value="absent">{t('attendance.dashboard.mark_absent_modal.types.absent')}</option>
                                                </select>
                                                
                                                {absentType === 'absent' && (
                                                    <div>
                                                        <label htmlFor="reason" className="form-label">{t('attendance.dashboard.mark_absent_modal.reason')}</label>
                                                        <textarea 
                                                            className="form-control" 
                                                            id="reason" 
                                                            rows={3} 
                                                            value={absentReason}
                                                            onChange={(e) => setAbsentReason(e.target.value)}
                                                            required
                                                            placeholder={t('attendance.dashboard.mark_absent_modal.reason_placeholder')}
                                                        ></textarea>
                                                    </div>
                                                )}
                                            </div>
                                        </div>
                                        <div className="modal-footer">
                                            <button type="button" className="btn btn-secondary" onClick={() => setShowAbsentModal(false)}>{t('attendance.dashboard.mark_absent_modal.cancel')}</button>
                                            <button type="submit" className="btn btn-danger" disabled={absentLoading}>
                                                {absentLoading ? <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span> : null}
                                                {t('attendance.dashboard.mark_absent_modal.confirm')}
                                            </button>
                                        </div>
                                    </form>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* History Modal */}
                    {selectedTech && (
                        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
                            <div className="modal-dialog modal-lg modal-dialog-centered">
                                <div className="modal-content">
                                    <div className="modal-header">
                                        <h5 className="modal-title">
                                            {t('attendance.dashboard.history_modal.title', { name: `${selectedTech.user.first_name} ${selectedTech.user.last_name}` })}
                                        </h5>
                                        <button type="button" className="btn-close" onClick={closeHistoryModal}></button>
                                    </div>
                                    <div className="modal-body">
                                        {historyLoading ? (
                                            <div className="text-center p-4">
                                                <div className="spinner-border text-primary" role="status"></div>
                                            </div>
                                        ) : (
                                            <div className="table-responsive">
                                                <table className="table table-hover align-middle">
                                                    <thead className="table-light">
                                                        <tr>
                                                            <th>{t('attendance.history.table.date')}</th>
                                                            <th>{t('attendance.history.table.check_in')}</th>
                                                            <th>{t('attendance.history.table.check_out')}</th>
                                                            <th>{t('attendance.history.table.duration')}</th>
                                                            <th>{t('attendance.history.table.status')}</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        {history.length === 0 ? (
                                                            <tr>
                                                                <td colSpan={5} className="text-center py-4 text-muted">{t('attendance.history.table.no_records')}</td>
                                                            </tr>
                                                        ) : (
                                                            history.map((record: any) => (
                                                                <tr key={record.id}>
                                                                    <td>{new Date(record.date).toLocaleDateString()}</td>
                                                                    <td>{new Date(record.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</td>
                                                                    <td>
                                                                        {record.check_out 
                                                                            ? new Date(record.check_out).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) 
                                                                            : '-'
                                                                        }
                                                                    </td>
                                                                    <td className="fw-bold font-monospace">
                                                                        {calculateDuration(record.check_in, record.check_out)}
                                                                    </td>
                                                                    <td>
                                                                        <span className={`badge ${record.status === 'working' ? 'bg-success' : 'bg-secondary'}`}>
                                                                            {record.status}
                                                                        </span>
                                                                    </td>
                                                                </tr>
                                                            ))
                                                        )}
                                                    </tbody>
                                                </table>
                                            </div>
                                        )}
                                    </div>
                                    <div className="modal-footer justify-content-between">
                                        <div className="text-muted small">
                                            {t('attendance.dashboard.history_modal.page_info', { current: historyPage, total: historyTotalPages })}
                                        </div>
                                        <div>
                                            <button 
                                                className="btn btn-outline-secondary btn-sm me-2" 
                                                onClick={() => fetchHistory(selectedTech.user.id, historyPage - 1)}
                                                disabled={historyPage <= 1 || historyLoading}
                                            >
                                                {t('common.previous')}
                                            </button>
                                            <button 
                                                className="btn btn-outline-secondary btn-sm" 
                                                onClick={() => fetchHistory(selectedTech.user.id, historyPage + 1)}
                                                disabled={historyPage >= historyTotalPages || historyLoading}
                                            >
                                                {t('common.next')}
                                            </button>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                  </>
              )}
          </div>
      );
  }

  // Render Technician View (Original)
  return (
    <div className="container mt-4">
      <div className="row justify-content-center">
        <div className="col-md-8 col-lg-6">
          <div className="card shadow-sm border-0">
            <div className="card-body text-center p-5">
              <h2 className="mb-4">{t('attendance.technician_view.title')}</h2>
              
              <div className="mb-4">
                <div className="display-1 fw-bold text-primary">
                  {currentTime.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
                <div className="text-muted fs-4">
                  {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                </div>
              </div>

              <div className="d-flex justify-content-center mb-4">
                <div className={`badge rounded-pill p-3 fs-5 ${status === 'checked_in' ? 'bg-success' : 'bg-secondary'}`}>
                  {t('attendance.technician_view.status_label', { status: status === 'checked_in' ? t('attendance.technician_view.status_working') : t('attendance.technician_view.status_off_duty') })}
                </div>
              </div>

              {status === 'checked_in' && attendance && (
                <div className="alert alert-info mb-4">
                  <div className="mb-2">{t('attendance.technician_view.checked_in_at', { time: new Date(attendance.check_in).toLocaleTimeString() })}</div>
                  <div className="text-uppercase small fw-bold text-muted mb-1">{t('attendance.technician_view.duration')}</div>
                  <div className="display-4 fw-bold text-success font-monospace">
                     <LiveDuration startTime={attendance.check_in} />
                  </div>
                </div>
              )}

              {status === 'checked_out' && attendance && attendance.check_out && (
                 <div className="alert alert-success mb-4">
                  {t('attendance.technician_view.last_shift', { start: new Date(attendance.check_in).toLocaleTimeString(), end: new Date(attendance.check_out).toLocaleTimeString() })}
                </div>
              )}

              <div className="d-grid gap-3">
                {status === 'checked_out' ? (
                  <button 
                    className="btn btn-success btn-lg py-3 fw-bold" 
                    onClick={handleCheckIn}
                    disabled={loading}
                  >
                    {loading ? t('attendance.technician_view.processing') : t('attendance.technician_view.check_in_button')}
                  </button>
                ) : (
                  <button 
                    className="btn btn-danger btn-lg py-3 fw-bold" 
                    onClick={handleCheckOut}
                    disabled={loading}
                  >
                    {loading ? t('attendance.technician_view.processing') : t('attendance.technician_view.check_out_button')}
                  </button>
                )}
              </div>
              
              <div className="d-grid gap-3 mt-3">
                <Link to="/technician/jobs" className="btn btn-outline-primary btn-lg py-3 fw-bold">
                   <i className="bi bi-calendar-check me-2"></i>{t('attendance.technician_view.my_jobs_button')}
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
