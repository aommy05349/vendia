import React, { useEffect, useState } from 'react';
import { api, useAuthStore } from '@vendia/shared';
import { format, differenceInHours, differenceInMinutes } from 'date-fns';

interface User {
    id: number;
    name: string;
    email: string;
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

export const AttendanceHistory = ({ embedded = false }: { embedded?: boolean }) => {
    const { user } = useAuthStore();
    const [attendances, setAttendances] = useState<Attendance[]>([]);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);
    const [users, setUsers] = useState<User[]>([]);
    const [selectedUser, setSelectedUser] = useState<string>('');
    const [startDate, setStartDate] = useState<string>('');
    const [endDate, setEndDate] = useState<string>('');
    
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

    useEffect(() => {
        fetchUsers();
    }, []);

    useEffect(() => {
        fetchAttendance();
        fetchSummary();
    }, [page, selectedUser, startDate, endDate]);

    const fetchUsers = async () => {
        try {
            const response = await api.get('/users?role=technician');
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
        setShowEditModal(true);
    };

    const handleUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!editingAttendance) return;

        try {
            await api.put(`/attendance/${editingAttendance.id}`, {
                check_in: editCheckIn,
                check_out: editCheckOut || null
            });
            setShowEditModal(false);
            fetchAttendance();
            // Show success message (optional)
        } catch (error) {
            console.error('Failed to update attendance', error);
            alert('Failed to update attendance');
        }
    };

    const calculateDuration = (start: string, end: string | null) => {
        if (!end) return '-';
        const startDate = new Date(start);
        const endDate = new Date(end);
        const totalMinutes = Math.abs(differenceInMinutes(endDate, startDate));
        const hours = Math.floor(totalMinutes / 60);
        const minutes = totalMinutes % 60;
        return `${hours}h ${minutes}m`;
    };

    return (
        <div className={embedded ? "mt-4" : "container-fluid p-4"}>
            {!embedded && (
                <div className="d-flex justify-content-between align-items-center mb-4">
                    <h1 className="h3">Attendance History</h1>
                </div>
            )}

            {/* Filters */}
            <div className="card shadow-sm mb-4">
                <div className="card-body">
                    <div className="row g-3">
                        <div className="col-md-3">
                            <label className="form-label">Technician</label>
                            <select 
                                className="form-select"
                                value={selectedUser}
                                onChange={(e) => {
                                    setSelectedUser(e.target.value);
                                    setPage(1);
                                }}
                            >
                                <option value="">All Technicians</option>
                                {users.map(u => (
                                    <option key={u.id} value={u.id}>{u.name}</option>
                                ))}
                            </select>
                        </div>
                        <div className="col-md-3">
                            <label className="form-label">Start Date</label>
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
                            <label className="form-label">End Date</label>
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
                                Clear Filters
                            </button>
                        </div>
                    </div>
                </div>
            </div>

            {/* Summary Cards */}
            {selectedUser && (
                <div className="row g-3 mb-4">
                    <div className="col-md-3">
                        <div className="card bg-primary text-white h-100">
                            <div className="card-body text-center">
                                <h6 className="card-title text-uppercase small opacity-75">Days Worked</h6>
                                <h2 className="display-6 fw-bold mb-0">{summary.days_worked}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-info text-white h-100">
                            <div className="card-body text-center">
                                <h6 className="card-title text-uppercase small opacity-75">Total Hours</h6>
                                <h2 className="display-6 fw-bold mb-0">{summary.total_hours}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-success text-white h-100">
                            <div className="card-body text-center">
                                <h6 className="card-title text-uppercase small opacity-75">Weekly Off</h6>
                                <h2 className="display-6 fw-bold mb-0">{summary.weekly_off_days}</h2>
                            </div>
                        </div>
                    </div>
                    <div className="col-md-3">
                        <div className="card bg-danger text-white h-100">
                            <div className="card-body text-center">
                                <h6 className="card-title text-uppercase small opacity-75">Absent (No Reason)</h6>
                                <h2 className="display-6 fw-bold mb-0">{summary.absent_days}</h2>
                            </div>
                        </div>
                    </div>
                </div>
            )}

            {/* Table */}
            <div className="card shadow-sm">
                <div className="card-body p-0">
                    <div className="table-responsive">
                        <table className="table table-hover align-middle mb-0">
                            <thead className="bg-light">
                                <tr>
                                    <th className="ps-4">Technician</th>
                                    <th>Date</th>
                                    <th>Check In</th>
                                    <th>Check Out</th>
                                    <th>Duration</th>
                                    <th>Status</th>
                                    {user?.role === 'admin' && <th className="text-end pe-4">Actions</th>}
                                </tr>
                            </thead>
                            <tbody>
                                {loading ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5">
                                            <div className="spinner-border text-primary" role="status"></div>
                                        </td>
                                    </tr>
                                ) : attendances.length === 0 ? (
                                    <tr>
                                        <td colSpan={7} className="text-center py-5 text-muted">
                                            No attendance records found
                                        </td>
                                    </tr>
                                ) : (
                                    attendances.map((record) => (
                                        <tr key={record.id}>
                                            <td className="ps-4">
                                                <div className="fw-bold">{record.user.name}</div>
                                                <div className="small text-muted">{record.user.email}</div>
                                            </td>
                                            <td>{format(new Date(record.date), 'dd MMM yyyy')}</td>
                                            <td>
                                                <div className="text-success fw-bold">
                                                    {format(new Date(record.check_in), 'HH:mm')}
                                                </div>
                                            </td>
                                            <td>
                                                {record.check_out ? (
                                                    <div className="text-danger fw-bold">
                                                        {format(new Date(record.check_out), 'HH:mm')}
                                                    </div>
                                                ) : (
                                                    <span className="badge bg-warning text-dark">Active</span>
                                                )}
                                            </td>
                                            <td>{calculateDuration(record.check_in, record.check_out)}</td>
                                            <td>
                                                <span className={`badge ${record.status === 'completed' ? 'bg-success' : (record.status === 'absent' ? 'bg-danger' : 'bg-primary')}`}>
                                                    {record.status}
                                                </span>
                                                {record.status === 'absent' && record.reason && (
                                                    <div className="small text-danger mt-1">
                                                        Note: {record.reason}
                                                    </div>
                                                )}
                                            </td>
                                            {user?.role === 'admin' && (
                                                <td className="text-end pe-4">
                                                    <button 
                                                        className="btn btn-sm btn-outline-primary"
                                                        onClick={() => handleEditClick(record)}
                                                    >
                                                        Edit
                                                    </button>
                                                </td>
                                            )}
                                        </tr>
                                    ))
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
                                    <button className="page-link" onClick={() => setPage(p => Math.max(1, p - 1))}>Previous</button>
                                </li>
                                {[...Array(totalPages)].map((_, i) => (
                                    <li key={i} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                                        <button className="page-link" onClick={() => setPage(i + 1)}>{i + 1}</button>
                                    </li>
                                ))}
                                <li className={`page-item ${page === totalPages ? 'disabled' : ''}`}>
                                    <button className="page-link" onClick={() => setPage(p => Math.min(totalPages, p + 1))}>Next</button>
                                </li>
                            </ul>
                        </nav>
                    </div>
                )}
            </div>

            {/* Edit Modal */}
            {showEditModal && (
                <div className="modal fade show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
                    <div className="modal-dialog">
                        <div className="modal-content">
                            <div className="modal-header">
                                <h5 className="modal-title">Edit Attendance</h5>
                                <button type="button" className="btn-close" onClick={() => setShowEditModal(false)}></button>
                            </div>
                            <form onSubmit={handleUpdate}>
                                <div className="modal-body">
                                    <div className="mb-3">
                                        <label className="form-label">Technician</label>
                                        <input type="text" className="form-control" value={editingAttendance?.user.name} disabled />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Check In Time</label>
                                        <input 
                                            type="datetime-local" 
                                            className="form-control" 
                                            value={editCheckIn}
                                            onChange={(e) => setEditCheckIn(e.target.value)}
                                            required
                                        />
                                    </div>
                                    <div className="mb-3">
                                        <label className="form-label">Check Out Time</label>
                                        <input 
                                            type="datetime-local" 
                                            className="form-control" 
                                            value={editCheckOut}
                                            onChange={(e) => setEditCheckOut(e.target.value)}
                                        />
                                        <div className="form-text">Leave empty if still active</div>
                                    </div>
                                </div>
                                <div className="modal-footer">
                                    <button type="button" className="btn btn-secondary" onClick={() => setShowEditModal(false)}>Cancel</button>
                                    <button type="submit" className="btn btn-primary">Save Changes</button>
                                </div>
                            </form>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};
