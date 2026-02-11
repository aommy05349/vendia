import React, { useEffect, useState } from 'react';
import { api, useAuthStore } from '@vendia/shared';
import { useTranslation } from 'react-i18next';
import { format, differenceInHours, differenceInMinutes, startOfMonth, endOfMonth, eachDayOfInterval, isSameDay, getDate, isWeekend, addMonths, subMonths } from 'date-fns';
import { th, enUS } from 'date-fns/locale';

const formatDuration = (startDate: string) => {
  const start = new Date(startDate).getTime();
  const now = new Date().getTime();
  const diff = now - start;
  
  if (diff < 0) return "00:00:00";

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

const isLate = (checkIn: string) => {
    if (!checkIn) return false;
    const d = new Date(checkIn);
    // Late if after 9:00 AM
    return d.getHours() > 9 || (d.getHours() === 9 && d.getMinutes() > 0);
};

interface User {
    id: number;
    name: string;
    email: string;
    first_name?: string;
    last_name?: string;
}

interface Attendance {
    id: number;
    user_id: number;
    check_in: string;
    check_out: string | null;
    status: string;
    reason?: string;
    date: string;
    user: User;
}

export const AttendanceHistory = ({ embedded = false, defaultView = 'list' }: { embedded?: boolean, defaultView?: 'list' | 'timesheet' | 'dashboard' | 'card' | 'monitor' }) => {
    const { t, i18n } = useTranslation();
    const locale = i18n.language === 'th' ? th : enUS;
    const { user } = useAuthStore();
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
    // Timesheet State
    const [viewMode, setViewMode] = useState<'list' | 'timesheet' | 'dashboard' | 'card' | 'monitor'>(defaultView);
    const [currentMonth, setCurrentMonth] = useState(new Date());
    const [timesheetData, setTimesheetData] = useState<Attendance[]>([]);
    const [timesheetPage, setTimesheetPage] = useState(1);
    const TIMESHEET_PER_PAGE = 10;

    // Monitor State
    const [monitorData, setMonitorData] = useState<any[]>([]);
    const [monitorLoading, setMonitorLoading] = useState(true);
    const [currentTime, setCurrentTime] = useState(new Date());
    
    // Absent Modal State (Monitor)
    const [showAbsentModal, setShowAbsentModal] = useState(false);
    const [absentTech, setAbsentTech] = useState<any>(null);
    const [absentType, setAbsentType] = useState('weekly_off');
    const [absentReason, setAbsentReason] = useState('');
    const [absentLoading, setAbsentLoading] = useState(false);
    
    // History Modal State (Monitor)
    const [showHistoryModal, setShowHistoryModal] = useState(false);
    const [historyTech, setHistoryTech] = useState<any>(null);
    const [historyData, setHistoryData] = useState<any[]>([]);
    const [historyLoading, setHistoryLoading] = useState(false);
    const [historyPage, setHistoryPage] = useState(1);
    const [historyTotalPages, setHistoryTotalPages] = useState(1);

    // Summary Stats
    const [summary, setSummary] = useState({
        days_worked: 0,
        total_hours: 0,
        absent_days: 0,
        weekly_off_days: 0
    });

    // Edit Modal State
    const [showEditModal, setShowEditModal] = useState(false);
    const [editingAttendance, setEditingAttendance] = useState<Attendance | null>(null);
    const [editCheckIn, setEditCheckIn] = useState('');
    const [editCheckOut, setEditCheckOut] = useState('');
    const [editStatus, setEditStatus] = useState('');
    const [editReason, setEditReason] = useState('');

    useEffect(() => {
        fetchUsers();
        // Clock for Monitor View
        const timer = setInterval(() => setCurrentTime(new Date()), 1000);
        return () => clearInterval(timer);
    }, []);

    useEffect(() => {
        if (viewMode === 'list') {
            fetchAttendance();
            fetchSummary();
        } else if (viewMode === 'timesheet' || viewMode === 'dashboard' || viewMode === 'card') {
            fetchTimesheet();
        } else if (viewMode === 'monitor') {
            fetchMonitorData();
            const poll = setInterval(fetchMonitorData, 60000); // Poll every minute
            return () => clearInterval(poll);
        }
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, [page, selectedUser, startDate, endDate, viewMode, currentMonth]);

    const fetchMonitorData = async () => {
        try {
            const response = await api.get('/attendance/overview');
            setMonitorData(response.data);
        } catch (error) {
            console.error('Failed to fetch monitor data', error);
        } finally {
            setMonitorLoading(false);
        }
    };

    const fetchHistory = async (userId: number, page: number = 1) => {
        setHistoryLoading(true);
        try {
            const response = await api.get(`/attendance/history/${userId}?page=${page}`);
            setHistoryData(response.data.data);
            setHistoryPage(response.data.current_page);
            setHistoryTotalPages(response.data.last_page);
        } catch (error) {
            console.error('Failed to fetch history', error);
        } finally {
            setHistoryLoading(false);
        }
    };

    const handleCardClick = (tech: any) => {
        setHistoryTech(tech);
        setShowHistoryModal(true);
        fetchHistory(tech.user.id, 1);
    };

    const handleAbsentClick = (e: React.MouseEvent, tech: any) => {
        e.stopPropagation();
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
                status: absentType
            });
            setShowAbsentModal(false);
            fetchMonitorData();
        } catch (error) {
            console.error('Failed to mark absent', error);
            alert('Failed to mark absent');
        } finally {
            setAbsentLoading(false);
        }
    };


    const fetchTimesheet = async () => {
        setLoading(true);
        try {
            const start = format(startOfMonth(currentMonth), 'yyyy-MM-dd');
            const end = format(endOfMonth(currentMonth), 'yyyy-MM-dd');
            let query = `/attendance?per_page=1000&start_date=${start}&end_date=${end}`;
            if (selectedUser) query += `&user_id=${selectedUser}`;
            
            const response = await api.get(query);
            setTimesheetData(response.data.data);
            
            // Also update summary for the month
            let summaryQuery = `/attendance/summary?start_date=${start}&end_date=${end}`;
            if (selectedUser) summaryQuery += `&user_id=${selectedUser}`;
            const summaryRes = await api.get(summaryQuery);
            setSummary(summaryRes.data);
        } catch (error) {
            console.error('Failed to fetch timesheet', error);
        } finally {
            setLoading(false);
        }
    };

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users?role=technician&per_page=1000');
            setUsers(response.data.data || response.data); // Adjust based on API response structure
        } catch (error) {
            console.error('Failed to fetch users', error);
        }
    };

    const fetchSummary = async () => {
        try {
            let query = '/attendance/summary?';
            if (selectedUser) query += `user_id=${selectedUser}&`;
            if (startDate) query += `start_date=${startDate}&`;
            if (endDate) query += `end_date=${endDate}&`;
            
            const response = await api.get(query);
            setSummary(response.data);
        } catch (error) {
            console.error('Failed to fetch summary', error);
        }
    };

    const fetchAttendance = async () => {
        setLoading(true);
        try {
            let query = `/attendance?page=${page}`;
            if (selectedUser) query += `&user_id=${selectedUser}`;
            if (startDate) query += `&start_date=${startDate}`;
            if (endDate) query += `&end_date=${endDate}`;

            const response = await api.get(query);
            setAttendances(response.data.data);
            setPage(response.data.current_page);
            setTotalPages(response.data.last_page);
        } catch (error) {
            console.error('Failed to fetch attendance', error);
        } finally {
            setLoading(false);
        }
    };

    const handleEditClick = (attendance: Attendance) => {
        setEditingAttendance(attendance);
        // Format for datetime-local input: YYYY-MM-DDTHH:mm
        setEditCheckIn(format(new Date(attendance.check_in), "yyyy-MM-dd'T'HH:mm"));
        setEditCheckOut(attendance.check_out ? format(new Date(attendance.check_out), "yyyy-MM-dd'T'HH:mm") : '');
        setEditStatus(attendance.status);
        setEditReason(attendance.reason || '');
        setShowEditModal(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAttendance) return;

        try {
            await api.put(`/attendance/${editingAttendance.id}`, {
                check_in: editCheckIn,
                check_out: editCheckOut || null,
                status: editStatus,
                reason: editReason
            });
            setShowEditModal(false);
            fetchAttendance();
            // Show success message (optional)
        } catch (error) {
            console.error('Failed to update attendance', error);
            alert(t('attendance.history.update_failed'));
        }
    };

    const calculateDuration = (start: string, end: string | null) => {
        if (!end) return { text: '-', minutes: 0, percentage: 0 };
        const startDate = new Date(start);
        const endDate = new Date(end);
        const totalMinutes = Math.abs(differenceInMinutes(endDate, startDate));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        // Assume 9 hours (540 mins) is full day
        const percentage = Math.min((totalMinutes / 540) * 100, 100);
        return { text: `${hours}h ${minutes}m`, minutes: totalMinutes, percentage };
    };

    const renderDashboard = () => {
        // Calculate Monthly Stats based on timesheetData
        const totalWorkDays = timesheetData.filter(a => a.status === 'working' || a.status === 'completed').length;
        const totalLate = timesheetData.filter(a => (a.status === 'working' || a.status === 'completed') && isLate(a.check_in)).length;
        const totalLeave = timesheetData.filter(a => ['leave', 'sick_leave', 'personal_leave'].includes(a.status)).length;
        
        // Calculate per-user stats
        const userStats = users.map(u => {
            const userAtts = timesheetData.filter(a => a.user_id === u.id);
            const present = userAtts.filter(a => a.status === 'working' || a.status === 'completed').length;
            const late = userAtts.filter(a => (a.status === 'working' || a.status === 'completed') && isLate(a.check_in)).length;
            const absent = userAtts.filter(a => a.status === 'absent').length; 
            const leave = userAtts.filter(a => ['leave', 'sick_leave', 'personal_leave'].includes(a.status)).length;
            return { ...u, present, late, absent, leave };
        });

        // Sort by present days (desc)
        const topPresent = [...userStats].sort((a, b) => b.present - a.present);
        
        // Sort by late (desc)
        const topLate = [...userStats].sort((a, b) => b.late - a.late);

        // Sort by leave (desc)
        const topLeave = [...userStats].sort((a, b) => b.leave - a.leave);

        // Sort by absent (desc)
        const topAbsent = [...userStats].sort((a, b) => b.absent - a.absent);

        return (
            <div className="container-fluid p-0">
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card shadow-sm border-start border-primary border-4">
                            <div className="card-body">
                                <h6 className="card-subtitle mb-2 text-muted">{t('attendance.history.dashboard.total_work_days', 'Total Work Days')}</h6>
                                <h2 className="card-title mb-0 text-primary">{totalWorkDays}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card shadow-sm border-start border-warning border-4">
                            <div className="card-body">
                                <h6 className="card-subtitle mb-2 text-muted">{t('attendance.history.dashboard.total_late', 'Late Arrivals')}</h6>
                                <h2 className="card-title mb-0 text-warning">{totalLate}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card shadow-sm border-start border-info border-4">
                            <div className="card-body">
                                <h6 className="card-subtitle mb-2 text-muted">{t('attendance.history.dashboard.total_leave', 'Total Leaves')}</h6>
                                <h2 className="card-title mb-0 text-info">{totalLeave}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card shadow-sm border-start border-success border-4">
                            <div className="card-body">
                                <h6 className="card-subtitle mb-2 text-muted">{t('attendance.history.dashboard.active_technicians', 'Active Technicians')}</h6>
                                <h2 className="card-title mb-0 text-success">{users.length}</h2>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="row g-3">
                    <div className="col-xl-3 col-md-6">
                        <div className="card shadow-sm h-100">
                            <div className="card-header bg-white">
                                <h5 className="mb-0 card-title">{t('attendance.history.dashboard.top_attendance', 'Top Attendance')}</h5>
                            </div>
                            <div className="card-body p-0 overflow-auto" style={{ maxHeight: '400px' }}>
                                <ul className="list-group list-group-flush">
                                    {topPresent.map(u => (
                                        <li key={u.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            {u.name}
                                            <span className="badge bg-primary rounded-pill">{u.present} days</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <div className="card shadow-sm h-100">
                            <div className="card-header bg-white">
                                <h5 className="mb-0 card-title">{t('attendance.history.dashboard.most_late', 'Most Late')}</h5>
                            </div>
                            <div className="card-body p-0 overflow-auto" style={{ maxHeight: '400px' }}>
                                <ul className="list-group list-group-flush">
                                    {topLate.map(u => (
                                        <li key={u.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            {u.name}
                                            <span className="badge bg-warning text-dark rounded-pill">{u.late} times</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <div className="card shadow-sm h-100">
                            <div className="card-header bg-white">
                                <h5 className="mb-0 card-title">{t('attendance.history.dashboard.most_leave', 'Most Leave')}</h5>
                            </div>
                            <div className="card-body p-0 overflow-auto" style={{ maxHeight: '400px' }}>
                                <ul className="list-group list-group-flush">
                                    {topLeave.map(u => (
                                        <li key={u.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            {u.name}
                                            <span className="badge bg-info rounded-pill">{u.leave} days</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                    <div className="col-xl-3 col-md-6">
                        <div className="card shadow-sm h-100">
                            <div className="card-header bg-white">
                                <h5 className="mb-0 card-title">{t('attendance.history.dashboard.most_absent', 'Most Absent')}</h5>
                            </div>
                            <div className="card-body p-0 overflow-auto" style={{ maxHeight: '400px' }}>
                                <ul className="list-group list-group-flush">
                                    {topAbsent.map(u => (
                                        <li key={u.id} className="list-group-item d-flex justify-content-between align-items-center">
                                            {u.name}
                                            <span className="badge bg-danger rounded-pill">{u.absent} days</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        );
    };

    const renderMonitorView = () => {
        return (
            <div className="container-fluid p-0">
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h2 className="h4 mb-0">{t('attendance.dashboard.title', 'Live Monitor')}</h2>
                    <div className="text-muted">
                        {currentTime.toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                        {' '}
                        {currentTime.toLocaleTimeString()}
                    </div>
                </div>

                {monitorLoading ? (
                    <div className="text-center p-5">
                        <div className="spinner-border text-primary" role="status"></div>
                    </div>
                ) : (
                    <div className="overflow-auto px-1 pb-3 mb-4 custom-scrollbar">
                        <div className="row g-4">
                            {monitorData.length === 0 ? (
                                <div className="col-12 text-center text-muted p-5">
                                    {t('attendance.dashboard.no_technicians', 'No technicians found')}
                                </div>
                            ) : (
                                monitorData.map((tech) => (
                                    <div className="col-md-6 col-lg-4 col-xl-3" key={tech.user.id}>
                                        <div 
                                            className={`card h-100 shadow-sm border-${tech.status === 'working' ? 'success' : (tech.status === 'absent' ? 'danger' : (tech.status === 'weekly_off' ? 'warning' : 'light'))} cursor-pointer`} 
                                            style={{ borderLeftWidth: tech.status === 'working' ? '4px' : '1px', cursor: 'pointer', transition: 'transform 0.2s', fontSize: '0.9rem' }}
                                            onClick={() => handleCardClick(tech)}
                                            onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-3px)'}
                                            onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
                                        >
                                            <div className="card-header bg-white d-flex justify-content-between align-items-center py-2 px-3">
                                                <div className="d-flex align-items-center" style={{ minWidth: 0 }}>
                                                    <div className={`rounded-circle d-flex align-items-center justify-content-center text-white me-2 fw-bold ${tech.status === 'working' ? 'bg-success' : (tech.status === 'absent' ? 'bg-danger' : (tech.status === 'weekly_off' ? 'bg-warning text-dark' : 'bg-secondary'))}`} style={{ width: '32px', height: '32px', minWidth: '32px', fontSize: '0.85rem' }}>
                                                        {tech.user.first_name?.charAt(0) || tech.user.name.charAt(0)}
                                                    </div>
                                                    <div className="text-truncate">
                                                        <h6 className="mb-0 text-truncate fw-bold" style={{ fontSize: '0.9rem' }}>{tech.user.first_name || tech.user.name}</h6>
                                                    </div>
                                                </div>
                                                <span className={`badge ${tech.status === 'working' ? 'bg-success' : (tech.status === 'absent' ? 'bg-danger' : (tech.status === 'weekly_off' ? 'bg-warning text-dark' : 'bg-secondary'))}`} style={{ fontSize: '0.7rem' }}>
                                                    {tech.status === 'working' ? 'ON' : (tech.status === 'absent' ? 'ABS' : (tech.status === 'weekly_off' ? 'OFF' : 'OFF'))}
                                                </span>
                                            </div>
                                            <div className="card-body text-center d-flex flex-column justify-content-center p-2">
                                                {tech.status === 'working' ? (
                                                    <div>
                                                        <div className="text-muted mb-1 small text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>{t('attendance.dashboard.checked_in', 'Checked In')}</div>
                                                        <div className="fw-bold mb-2 text-dark" style={{ fontSize: '1.1rem' }}>
                                                            {new Date(tech.check_in).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </div>
                                                        <div className="text-muted mb-1 small text-uppercase fw-bold" style={{ fontSize: '0.7rem' }}>{t('attendance.dashboard.duration', 'Duration')}</div>
                                                        <div className="fw-bold text-success font-monospace" style={{ fontSize: '1.4rem' }}>
                                                            <LiveDuration startTime={tech.check_in} />
                                                        </div>
                                                    </div>
                                                ) : tech.status === 'absent' || tech.status === 'weekly_off' ? (
                                                    <div className={`${tech.status === 'absent' ? 'text-danger' : 'text-warning'} py-2`}>
                                                        <div className="fw-bold mb-1" style={{ fontSize: '1rem' }}>
                                                            {tech.status === 'weekly_off' ? t('attendance.dashboard.weekly_off', 'Weekly Off') : t('attendance.dashboard.absent', 'Absent')}
                                                        </div>
                                                        <div className={`text-muted fst-italic text-truncate`} style={{ fontSize: '0.8rem', maxWidth: '100%' }}>{tech.reason || t('attendance.dashboard.no_reason', 'No Reason')}</div>
                                                    </div>
                                                ) : (
                                                    <div className="text-muted py-2">
                                                        {tech.last_seen ? (
                                                            <>
                                                                <div className="small text-uppercase fw-bold mb-1" style={{ fontSize: '0.7rem' }}>{t('attendance.dashboard.last_seen', 'Last Seen')}</div>
                                                                <div className="fw-bold" style={{ fontSize: '1rem' }}>{new Date(tech.last_seen).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' })}</div>
                                                            </>
                                                        ) : (
                                                            <div className="d-flex flex-column gap-2">
                                                                <span className="fst-italic small">{t('attendance.dashboard.no_activity', 'No Activity')}</span>
                                                                <button 
                                                                    className="btn btn-sm btn-outline-danger mx-auto"
                                                                    style={{ fontSize: '0.75rem', padding: '0.2rem 0.5rem' }}
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleAbsentClick(e, tech);
                                                                    }}
                                                                >
                                                                    {t('attendance.dashboard.mark_absent', 'Mark Absent')}
                                                                </button>
                                                            </div>
                                                        )}
                                                    </div>
                                                )}
                                            </div>
                                            <div className={`card-footer py-1 px-2 small ${tech.status === 'working' ? 'bg-success text-white' : 'bg-light'}`} style={{ fontSize: '0.75rem' }}>
                                                <div className="d-flex justify-content-between align-items-center">
                                                    <span>{t('attendance.dashboard.weekly_off', 'Weekly Off')}:</span>
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
                    </div>
                )}
            </div>
        );
    };

    const renderCardView = () => {
        // Calculate per-user stats (Same as Dashboard but used for display)
        const userStats = users.map(u => {
            const userAtts = timesheetData.filter(a => a.user_id === u.id);
            const present = userAtts.filter(a => a.status === 'working' || a.status === 'completed').length;
            const late = userAtts.filter(a => (a.status === 'working' || a.status === 'completed') && isLate(a.check_in)).length;
            const absent = userAtts.filter(a => a.status === 'absent').length;
            const leave = userAtts.filter(a => ['leave', 'sick_leave', 'personal_leave'].includes(a.status)).length;
            
            // Calculate attendance rate
            const daysInMonth = getDate(endOfMonth(currentMonth)); // Simple approximation or use filtered range
            // Better: use passed days in month so far if current month, or total days if past month
            // For now, simple percentage of worked days vs total possible days (excluding weekends?)
            // Let's just show counts.
            
            return { ...u, present, late, absent, leave };
        });

        // Filter if selectedUser is set
        const displayUsers = selectedUser 
            ? userStats.filter(u => u.id === Number(selectedUser))
            : userStats;

        return (
            <div className="container-fluid p-0">
                 <div className="row g-4">
                    {displayUsers.length === 0 ? (
                        <div className="col-12 text-center text-muted p-5">
                            {t('attendance.history.table.no_records')}
                        </div>
                    ) : (
                        displayUsers.map(u => (
                            <div className="col-md-6 col-lg-4 col-xl-3" key={u.id}>
                                <div className="card h-100 shadow-sm hover-shadow transition-all">
                                    <div className="card-body">
                                        <div className="d-flex align-items-center mb-3">
                                            <div className="rounded-circle bg-primary text-white d-flex align-items-center justify-content-center fw-bold me-3" style={{ width: '48px', height: '48px', fontSize: '1.2rem' }}>
                                                {u.name.charAt(0)}
                                            </div>
                                            <div>
                                                <h5 className="card-title mb-0 text-truncate">{u.name}</h5>
                                                <small className="text-muted">{u.email}</small>
                                            </div>
                                        </div>
                                        
                                        <div className="row g-2 text-center">
                                            <div className="col-6">
                                                <div className="p-2 bg-success bg-opacity-10 rounded">
                                                    <div className="small text-muted mb-1">{t('attendance.history.summary.days_worked', 'Worked')}</div>
                                                    <div className="h4 mb-0 text-success">{u.present}</div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="p-2 bg-warning bg-opacity-10 rounded">
                                                    <div className="small text-muted mb-1">{t('attendance.dashboard.total_late', 'Late')}</div>
                                                    <div className="h4 mb-0 text-warning">{u.late}</div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="p-2 bg-info bg-opacity-10 rounded">
                                                    <div className="small text-muted mb-1">{t('attendance.dashboard.total_leave', 'Leave')}</div>
                                                    <div className="h4 mb-0 text-info">{u.leave}</div>
                                                </div>
                                            </div>
                                            <div className="col-6">
                                                <div className="p-2 bg-danger bg-opacity-10 rounded">
                                                    <div className="small text-muted mb-1">{t('attendance.history.summary.absent', 'Absent')}</div>
                                                    <div className="h4 mb-0 text-danger">{u.absent}</div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    <div className="card-footer bg-white text-center">
                                        <button 
                                            className="btn btn-sm btn-outline-primary w-100"
                                            onClick={() => {
                                                setSelectedUser(u.id.toString());
                                                setViewMode('list');
                                            }}
                                        >
                                            {t('attendance.history.view.list')} <i className="bi bi-arrow-right ms-1"></i>
                                        </button>
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                 </div>
            </div>
        );
    };

    const renderTimesheet = () => {
        const days = eachDayOfInterval({
            start: startOfMonth(currentMonth),
            end: endOfMonth(currentMonth)
        });

        // Group by user
        const userAttendance: Record<number, Record<string, Attendance>> = {};
        timesheetData.forEach(att => {
            if (!userAttendance[att.user_id]) userAttendance[att.user_id] = {};
            const dateKey = format(new Date(att.date), 'yyyy-MM-dd');
            userAttendance[att.user_id][dateKey] = att;
        });
        
        // Use filtered users or all users
        const displayUsers = selectedUser 
            ? users.filter(u => u.id === Number(selectedUser))
            : users;

        // Pagination
        const totalTimesheetPages = Math.ceil(displayUsers.length / TIMESHEET_PER_PAGE);
        const paginatedUsers = displayUsers.slice((timesheetPage - 1) * TIMESHEET_PER_PAGE, timesheetPage * TIMESHEET_PER_PAGE);

        return (
            <div className="card shadow-sm">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-bordered table-sm mb-0" style={{ fontSize: '0.8rem' }}>
                            <thead className="bg-light text-center">
                                <tr>
                                    <th className="sticky-start bg-light ps-3 text-start" style={{ minWidth: '150px', left: 0, zIndex: 10 }}>{t('attendance.history.table.technician')}</th>
                                    {days.map(day => (
                                        <th key={day.toString()} className={isWeekend(day) ? 'bg-warning-subtle' : ''} style={{ minWidth: '65px' }}>
                                            <div>{getDate(day)}</div>
                                            <div style={{ fontSize: '0.6rem' }}>{format(day, 'EEE', { locale })}</div>
                                        </th>
                                    ))}
                                    <th style={{ minWidth: '60px' }}>{t('attendance.history.summary.days_worked')}</th>
                                    <th style={{ minWidth: '60px' }}>{t('attendance.history.summary.absent')}</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedUsers.map(user => {
                                    let workedDays = 0;
                                    let absentDays = 0;
                                    return (
                                        <tr key={user.id}>
                                            <td className="sticky-start bg-white fw-bold ps-3 text-start" style={{ left: 0, zIndex: 10 }}>
                                                <div className="text-truncate" style={{ maxWidth: '140px' }}>{user.name}</div>
                                            </td>
                                            {days.map(day => {
                                                const dateKey = format(day, 'yyyy-MM-dd');
                                                const att = userAttendance[user.id]?.[dateKey];
                                                let cellClass = '';
                                                let content: React.ReactNode = '-';
                                                
                                                if (att) {
                                                    if (att.status === 'working' || att.status === 'completed') {
                                                        cellClass = 'bg-success text-white';
                                                        content = (
                                                            <div style={{ lineHeight: '1.1', fontSize: '0.75rem' }}>
                                                                <div>{format(new Date(att.check_in), 'HH:mm')}</div>
                                                                <div style={{ opacity: 0.8 }}>{att.check_out ? format(new Date(att.check_out), 'HH:mm') : '...'}</div>
                                                            </div>
                                                        );
                                                        workedDays++;
                                                    } else if (att.status === 'absent') {
                                                        cellClass = 'bg-danger text-white';
                                                        content = 'ABS';
                                                        absentDays++;
                                                    } else if (att.status === 'weekly_off') {
                                                        cellClass = 'bg-secondary text-white';
                                                        content = 'OFF';
                                                    }
                                                }
                                                
                                                return (
                                                    <td key={day.toString()} className={`text-center align-middle p-1 ${cellClass}`} title={att ? `${att.status}\n${att.reason || ''}\n${att.check_in ? format(new Date(att.check_in), 'HH:mm') : ''} - ${att.check_out ? format(new Date(att.check_out), 'HH:mm') : ''}` : ''}>
                                                        {content}
                                                    </td>
                                                );
                                            })}
                                            <td className="text-center fw-bold align-middle">{workedDays}</td>
                                            <td className="text-center fw-bold align-middle text-danger">{absentDays}</td>
                                        </tr>
                                    );
                                })}
                                {displayUsers.length === 0 && (
                                    <tr>
                                        <td colSpan={days.length + 3} className="text-center py-4 text-muted">
                                            {t('attendance.history.table.no_records')}
                                        </td>
                                    </tr>
                                )}
                            </tbody>
                        </table>
                    </div>
                    
                    {/* Pagination Controls */}
                    {totalTimesheetPages > 1 && (
                        <div className="d-flex justify-content-between align-items-center p-3 border-top bg-light">
                            <div className="text-muted small">
                                {t('common.pagination.showing', 'Showing')} {(timesheetPage - 1) * TIMESHEET_PER_PAGE + 1} {t('common.pagination.to', 'to')} {Math.min(timesheetPage * TIMESHEET_PER_PAGE, displayUsers.length)} {t('common.pagination.of', 'of')} {displayUsers.length}
                            </div>
                            <nav>
                                <ul className="pagination pagination-sm mb-0">
                                    <li className={`page-item ${timesheetPage === 1 ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setTimesheetPage(p => Math.max(1, p - 1))}>
                                            <i className="bi bi-chevron-left"></i>
                                        </button>
                                    </li>
                                    {[...Array(totalTimesheetPages)].map((_, i) => {
                                        // Show limited pages if too many
                                        if (totalTimesheetPages > 7 && Math.abs(timesheetPage - (i + 1)) > 2 && i !== 0 && i !== totalTimesheetPages - 1) {
                                            if (Math.abs(timesheetPage - (i + 1)) === 3) return <li key={i} className="page-item disabled"><span className="page-link">...</span></li>;
                                            return null;
                                        }
                                        return (
                                            <li key={i + 1} className={`page-item ${timesheetPage === i + 1 ? 'active' : ''}`}>
                                                <button className="page-link" onClick={() => setTimesheetPage(i + 1)}>{i + 1}</button>
                                            </li>
                                        );
                                    })}
                                    <li className={`page-item ${timesheetPage === totalTimesheetPages ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setTimesheetPage(p => Math.min(totalTimesheetPages, p + 1))}>
                                            <i className="bi bi-chevron-right"></i>
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

    return (
        <div className={embedded ? "mt-4" : "container-fluid p-4"}>
            {!embedded && (
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h3">{t('attendance.history.title')}</h1>
                </div>
            )}

            {/* Filters */}
            <div className="card shadow-sm mb-4">
                <div className="card-header bg-white">
                    <ul className="nav nav-tabs card-header-tabs">
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${viewMode === 'monitor' ? 'active' : ''}`}
                                onClick={() => setViewMode('monitor')}
                            >
                                <i className="bi bi-people-fill me-2"></i>{t('attendance.history.view.monitor', 'Live Monitor')}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${viewMode === 'dashboard' ? 'active' : ''}`}
                                onClick={() => setViewMode('dashboard')}
                            >
                                <i className="bi bi-speedometer2 me-2"></i>{t('attendance.history.view.dashboard', 'Dashboard')}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${viewMode === 'card' ? 'active' : ''}`}
                                onClick={() => setViewMode('card')}
                            >
                                <i className="bi bi-grid-fill me-2"></i>{t('attendance.history.view.card', 'Card View')}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${viewMode === 'list' ? 'active' : ''}`}
                                onClick={() => setViewMode('list')}
                            >
                                <i className="bi bi-list-ul me-2"></i>{t('attendance.history.view.list', 'List View')}
                            </button>
                        </li>
                        <li className="nav-item">
                            <button 
                                className={`nav-link ${viewMode === 'timesheet' ? 'active' : ''}`}
                                onClick={() => setViewMode('timesheet')}
                            >
                                <i className="bi bi-calendar3 me-2"></i>{t('attendance.history.view.timesheet', 'Monthly Timesheet')}
                            </button>
                        </li>
                    </ul>
                </div>
                <div className="card-body">
                    <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-3">
                        {(viewMode === 'timesheet' || viewMode === 'dashboard' || viewMode === 'card') && (
                            <div className="d-flex align-items-center gap-2">
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => setCurrentMonth(prev => subMonths(prev, 1))}>
                                    <i className="bi bi-chevron-left"></i>
                                </button>
                                <span className="fw-bold fs-5 px-3 text-center" style={{ minWidth: '180px' }}>
                                    {format(currentMonth, 'MMMM yyyy', { locale })}
                                </span>
                                <button className="btn btn-outline-secondary btn-sm" onClick={() => setCurrentMonth(prev => addMonths(prev, 1))}>
                                    <i className="bi bi-chevron-right"></i>
                                </button>
                            </div>
                        )}
                    </div>
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">{t('attendance.history.filter.technician')}</label>
                            <select 
                                className="form-select"
                                value={selectedUser}
                                onChange={(e) => {
                                    setSelectedUser(e.target.value);
                                    setPage(1);
                                    setTimesheetPage(1);
                                }}
                            >
                                <option value="">{t('attendance.history.filter.all_technicians')}</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        {viewMode === 'list' && (
                            <>
                                <div className="col-md-3">
                                    <label className="form-label">{t('attendance.history.filter.start_date')}</label>
                                    <input 
                                        type="date" 
                                        className="form-control"
                                        value={startDate}
                                        onChange={(e) => {
                                            setStartDate(e.target.value);
                                            setPage(1);
                                        }}
                                    />
                                </div>
                                <div className="col-md-3">
                                    <label className="form-label">{t('attendance.history.filter.end_date')}</label>
                                    <input 
                                        type="date" 
                                        className="form-control"
                                        value={endDate}
                                        onChange={(e) => {
                                            setEndDate(e.target.value);
                                            setPage(1);
                                        }}
                                    />
                                </div>
                                <div className="col-md-3 d-flex align-items-end">
                                    <button 
                                        className="btn btn-outline-secondary w-100"
                                        onClick={() => {
                                            setSelectedUser('');
                                            setStartDate('');
                                            setEndDate('');
                                            setPage(1);
                                        }}
                                    >
                                        {t('attendance.history.filter.clear')}
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>
            </div>

            {/* Summary Cards - Only show in List View */}
            {selectedUser && viewMode === 'list' && (
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card bg-primary text-white h-100">
                            <div className="card-body text-center">
                                <h6 className="card-title text-uppercase small opacity-75">{t('attendance.history.summary.days_worked')}</h6>
                                <h2 className="display-6 fw-bold mb-0">{summary.days_worked}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-info text-white h-100">
                            <div className="card-body text-center">
                                <h6 className="card-title text-uppercase small opacity-75">{t('attendance.history.summary.total_hours')}</h6>
                                <h2 className="display-6 fw-bold mb-0">{summary.total_hours}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-success text-white h-100">
                            <div className="card-body text-center">
                                <h6 className="card-title text-uppercase small opacity-75">{t('attendance.history.summary.weekly_off')}</h6>
                                <h2 className="display-6 fw-bold mb-0">{summary.weekly_off_days}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-danger text-white h-100">
                            <div className="card-body text-center">
                                <h6 className="card-title text-uppercase small opacity-75">{t('attendance.history.summary.absent')}</h6>
                                <h2 className="display-6 fw-bold mb-0">{summary.absent_days}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* View Content */}
            {viewMode === 'monitor' ? (
                renderMonitorView()
            ) : viewMode === 'timesheet' ? (
                renderTimesheet()
            ) : viewMode === 'dashboard' ? (
                renderDashboard()
            ) : viewMode === 'card' ? (
                renderCardView()
            ) : (
                <div className="card shadow-sm">
                    <div className="card-body p-0">
                        <div className="table-responsive">
                            <table className="table table-hover align-middle mb-0">
                                <thead className="bg-light">
                                    <tr>
                                        {!selectedUser && <th className="ps-4">{t('attendance.history.table.technician')}</th>}
                                        <th className={selectedUser ? "ps-4" : ""}>{t('attendance.history.table.date')}</th>
                                        <th>{t('attendance.history.table.check_in')}</th>
                                        <th>{t('attendance.history.table.check_out')}</th>
                                        <th style={{ minWidth: '150px' }}>{t('attendance.history.table.duration')}</th>
                                        <th>{t('attendance.history.table.status')}</th>
                                        {user?.role === 'admin' && <th className="text-end pe-4">{t('attendance.history.table.actions')}</th>}
                                    </tr>
                                </thead>
                                <tbody>
                                    {loading ? (
                                        <tr>
                                            <td colSpan={selectedUser ? 6 : 7} className="text-center py-5">
                                                <div className="spinner-border text-primary" role="status"></div>
                                            </td>
                                        </tr>
                                    ) : attendances.length === 0 ? (
                                        <tr>
                                            <td colSpan={selectedUser ? 6 : 7} className="text-center py-5 text-muted">
                                                {t('attendance.history.table.no_records')}
                                            </td>
                                        </tr>
                                    ) : (
                                        attendances.map((record) => {
                                            const duration = calculateDuration(record.check_in, record.check_out);
                                            const isNonWorking = record.status === 'absent' || record.status === 'weekly_off';
                                            
                                            return (
                                            <tr key={record.id} className={isNonWorking ? 'bg-light' : ''}>
                                                {!selectedUser && (
                                                    <td className="ps-4">
                                                        <div className="fw-bold">{record.user.name}</div>
                                                        <div className="small text-muted">{record.user.email}</div>
                                                    </td>
                                                )}
                                                <td className={selectedUser ? "ps-4" : ""}>
                                                    <div className="fw-bold">{format(new Date(record.date), 'dd MMM yyyy', { locale })}</div>
                                                    <div className="small text-muted">{format(new Date(record.date), 'EEEE', { locale })}</div>
                                                </td>
                                                <td>
                                                    <div className="text-success fw-bold d-flex align-items-center gap-2">
                                                        <i className="bi bi-box-arrow-in-right"></i>
                                                        {format(new Date(record.check_in), 'HH:mm')}
                                                    </div>
                                                </td>
                                                <td>
                                                    {record.check_out ? (
                                                        <div className="text-danger fw-bold d-flex align-items-center gap-2">
                                                            <i className="bi bi-box-arrow-left"></i>
                                                            {format(new Date(record.check_out), 'HH:mm')}
                                                        </div>
                                                    ) : (
                                                        <span className="badge bg-warning text-dark">{t('attendance.history.table.active')}</span>
                                                    )}
                                                </td>
                                                <td>
                                                    <div className="d-flex flex-column">
                                                        <span className="fw-bold small mb-1">{duration.text}</span>
                                                        {duration.minutes > 0 && (
                                                            <div className="progress" style={{ height: '6px', width: '100px' }}>
                                                                <div 
                                                                    className={`progress-bar ${duration.minutes < 480 ? 'bg-warning' : 'bg-success'}`} 
                                                                    role="progressbar" 
                                                                    style={{ width: `${duration.percentage}%` }}
                                                                ></div>
                                                            </div>
                                                        )}
                                                    </div>
                                                </td>
                                                <td>
                                                    <span className={`badge ${
                                                        record.status === 'completed' ? 'bg-success' : 
                                                        (record.status === 'absent' ? 'bg-danger' : 
                                                        (record.status === 'weekly_off' ? 'bg-secondary' : 'bg-primary'))
                                                    }`}>
                                                        {t(`attendance.status.${record.status}`, { defaultValue: record.status })}
                                                    </span>
                                                    {(record.status === 'absent' || record.status === 'weekly_off') && record.reason && (
                                                        <div className={`small mt-1 ${record.status === 'absent' ? 'text-danger' : 'text-muted'}`}>
                                                            {t('attendance.history.table.note')}: {record.reason}
                                                        </div>
                                                    )}
                                                </td>
                                                {user?.role === 'admin' && (
                                                    <td className="text-end pe-4">
                                                        <button 
                                                            className="btn btn-sm btn-outline-primary"
                                                            onClick={() => handleEditClick(record)}
                                                        >
                                                            {t('attendance.history.table.edit')}
                                                        </button>
                                                    </td>
                                                )}
                                            </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                    
                    {/* Pagination */}
                    {totalPages > 1 && (
                        <div className="card-footer bg-white d-flex justify-content-end py-3">
                            <nav>
                                <ul className="pagination mb-0">
                                    <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>{t('common.previous')}</button>
                                    </li>
                                    {[...Array(totalPages)].map((_, i) => (
                                        <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                                            <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button>
                                        </li>
                                    ))}
                                    <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>{t('common.next')}</button>
                                    </li>
                                </ul>
                            </nav>
                        </div>
                    )}
                </div>
            )}

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">{t('attendance.history.edit_modal.title')}</h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">{t('attendance.history.table.technician')}</label>
                                        <input type="text" className="form-control" value={editingAttendance?.user.name} disabled />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">{t('attendance.history.edit_modal.check_in_time')}</label>
                                        <input 
                                            type="datetime-local" 
                                            className="form-control" 
                                            value={editCheckIn}
                                            onChange={(e) => setEditCheckIn(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">{t('attendance.history.edit_modal.check_out_time')}</label>
                                        <input 
                                            type="datetime-local" 
                                            className="form-control" 
                                            value={editCheckOut}
                                            onChange={(e) => setEditCheckOut(e.target.value)}
                                        />
                                        <div className="form-text">{t('attendance.history.edit_modal.leave_empty')}</div>
                                    </div>
                                    
                                    <div className="mb-3">
                                        <label className="form-label">{t('attendance.history.table.status')}</label>
                                        <select 
                                            className="form-select"
                                            value={editStatus}
                                            onChange={(e) => setEditStatus(e.target.value)}
                                        >
                                            <option value="working">{t('attendance.status.working')}</option>
                                            <option value="completed">{t('attendance.status.completed')}</option>
                                            <option value="absent">{t('attendance.status.absent')}</option>
                                            <option value="weekly_off">{t('attendance.status.weekly_off')}</option>
                                        </select>
                                    </div>

                                    {(editStatus === 'absent' || editStatus === 'weekly_off') && (
                                        <div className="mb-3">
                                            <label className="form-label">{t('attendance.dashboard.mark_absent_modal.reason')}</label>
                                            <textarea 
                                                className="form-control"
                                                value={editReason}
                                                onChange={(e) => setEditReason(e.target.value)}
                                                rows={2}
                                            />
                                        </div>
                                    )}
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>{t('attendance.history.edit_modal.cancel')}</button>
                                    <button type="submit" className="btn btn-primary">{t('attendance.history.edit_modal.save')}</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
