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

  // Technician Leave Request State
  const [showLeaveModal, setShowLeaveModal] = useState(false);
  const [leaveDate, setLeaveDate] = useState<string>('');
  const [leaveReason, setLeaveReason] = useState('');
  const [leaveSubmitting, setLeaveSubmitting] = useState(false);

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
              reason: finalReason,
              status: absentType // 'weekly_off' or 'absent'
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

  const openLeaveModal = () => {
    const today = new Date();
    const yyyy = today.getFullYear();
    const mm = String(today.getMonth() + 1).padStart(2, '0');
    const dd = String(today.getDate()).padStart(2, '0');
    setLeaveDate(`${yyyy}-${mm}-${dd}`);
    setLeaveReason('');
    setShowLeaveModal(true);
  };

  const submitLeaveRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!leaveDate || !leaveReason.trim()) {
      alert(t('attendance.technician_view.leave_reason_required'));
      return;
    }

    setLeaveSubmitting(true);
    try {
      await api.post('/attendance/leave-request', {
        date: leaveDate,
        reason: leaveReason.trim(),
      });
      setShowLeaveModal(false);
      alert(t('attendance.technician_view.leave_request_success'));
    } catch (error) {
      console.error('Failed to submit leave request', error);
      alert(t('attendance.technician_view.leave_request_failed'));
    } finally {
      setLeaveSubmitting(false);
    }
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
      return <AttendanceHistory embedded={false} defaultView="monitor" />;
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
                {status === 'checked_out' && (
                  <button
                    className="btn btn-outline-warning btn-lg py-3 fw-bold"
                    type="button"
                    onClick={openLeaveModal}
                  >
                    <i className="bi bi-file-earmark-text me-2"></i>
                    {t('attendance.technician_view.request_leave_button')}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {showLeaveModal && (
        <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {t('attendance.technician_view.leave_modal_title')}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowLeaveModal(false)}
                ></button>
              </div>
              <form onSubmit={submitLeaveRequest}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      {t('attendance.technician_view.leave_date_label')}
                    </label>
                    <input
                      type="date"
                      className="form-control"
                      value={leaveDate}
                      onChange={(e) => setLeaveDate(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      {t('attendance.technician_view.leave_reason_label')}
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={leaveReason}
                      onChange={(e) => setLeaveReason(e.target.value)}
                      placeholder={t('attendance.technician_view.leave_reason_placeholder')}
                    />
                  </div>
                  <div className="alert alert-warning small mb-0">
                    {t('attendance.technician_view.leave_note')}
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowLeaveModal(false)}
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={leaveSubmitting}
                  >
                    {leaveSubmitting
                      ? t('attendance.technician_view.processing')
                      : t('attendance.technician_view.leave_submit_button')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
