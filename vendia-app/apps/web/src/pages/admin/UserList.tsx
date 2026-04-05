import React, { useEffect, useState } from 'react';
import { api, useAuthStore } from '@vendia/shared';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../components/ConfirmModal';
import { MessageModal } from '../../components/MessageModal';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
  image?: string;
  image_url?: string;
}

export const UserList = () => {
  const { t } = useTranslation();
  const currentUser = useAuthStore(state => state.user);
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [roleFilter, setRoleFilter] = useState<'all' | 'admin' | 'staff' | 'technician'>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const [confirmUserId, setConfirmUserId] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    if (location.state?.success) {
      setAlertMessage({ type: 'success', text: location.state.success });
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
      // Auto dismiss after 3 seconds
      setTimeout(() => setAlertMessage(null), 3000);
    }
  }, [location]);

  useEffect(() => {
    const handle = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 300);
    return () => clearTimeout(handle);
  }, [searchTerm]);

  const getImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const origin = apiUrl.replace(/\/api\/?$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Ensure storage prefix exists if it's a local file
    if (!normalizedPath.startsWith('/storage/') && !normalizedPath.startsWith('/images/')) {
        return `${origin}/storage${normalizedPath}`;
    }
    
    return `${origin}${normalizedPath}`;
  };

  const fetchUsers = async (pageNo: number) => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      params.set('page', String(pageNo));
      if (roleFilter === 'all') {
        params.set('exclude_role', 'customer');
      } else {
        params.set('role', roleFilter);
      }
      if (debouncedSearchTerm) {
        params.set('search', debouncedSearchTerm);
      }
      const response = await api.get(`/users?${params.toString()}`);
      setUsers(response.data.data);
      setTotalPages(response.data.last_page);
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setAlertMessage({ type: 'danger', text: t('users.alerts.fetch_error') });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers(page);
  }, [page, roleFilter, debouncedSearchTerm]);

  const handleDelete = (id: number) => {
    if (currentUser?.id === id) {
      setAlertMessage({ type: 'danger', text: t('users.alerts.cannot_delete_self', 'ไม่สามารถลบบัญชีที่กำลังใช้งานอยู่ได้') });
      return;
    }
    setConfirmUserId(id);
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
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
        open={confirmUserId !== null}
        title={t('common.confirm_title', 'ยืนยัน')}
        message={t('users.alerts.delete_confirm')}
        confirmLabel={t('actions.delete', 'ลบ')}
        cancelLabel={t('common.cancel', 'ยกเลิก')}
        busy={confirmBusy}
        onCancel={() => setConfirmUserId(null)}
        onConfirm={async () => {
          if (confirmUserId === null) return;
          setConfirmBusy(true);
          try {
            await api.delete(`/users/${confirmUserId}`);
            setAlertMessage({ type: 'success', text: t('users.alerts.delete_success') });
            fetchUsers(page);
          } catch (error) {
            console.error('Failed to delete user:', error);
            const message = (error as any)?.response?.data?.message || t('users.alerts.delete_error');
            setAlertMessage({ type: 'danger', text: message });
          } finally {
            setConfirmBusy(false);
            setConfirmUserId(null);
          }
        }}
      />
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">{t('users.title')}</h1>
        <div className="d-flex gap-2">
          <button
            onClick={() => navigate('/users/create')}
            className="btn btn-success"
          >
            {t('users.create')}
          </button>
        </div>
      </div>

      <div className="d-flex flex-column flex-md-row justify-content-between align-items-md-center gap-3 mb-3">
        <ul className="nav nav-tabs">
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${roleFilter === 'all' ? 'active' : ''}`}
              onClick={() => {
                setRoleFilter('all');
                setPage(1);
              }}
            >
              {t('common.all')}
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${roleFilter === 'admin' ? 'active' : ''}`}
              onClick={() => {
                setRoleFilter('admin');
                setPage(1);
              }}
            >
              {t('users.roles.admin')}
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${roleFilter === 'staff' ? 'active' : ''}`}
              onClick={() => {
                setRoleFilter('staff');
                setPage(1);
              }}
            >
              {t('users.roles.staff')}
            </button>
          </li>
          <li className="nav-item">
            <button
              type="button"
              className={`nav-link ${roleFilter === 'technician' ? 'active' : ''}`}
              onClick={() => {
                setRoleFilter('technician');
                setPage(1);
              }}
            >
              {t('users.roles.technician')}
            </button>
          </li>
        </ul>

        <div className="input-group" style={{ maxWidth: '420px' }}>
          <span className="input-group-text">
            <i className="bi bi-search"></i>
          </span>
          <input
            type="text"
            className="form-control"
            placeholder={t('common.search')}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPage(1);
            }}
          />
          {searchTerm && (
            <button
              type="button"
              className="btn btn-outline-secondary"
              onClick={() => {
                setSearchTerm('');
                setPage(1);
              }}
            >
              {t('common.cancel', 'ยกเลิก')}
            </button>
          )}
        </div>
      </div>

      <div className="card shadow-sm border-0">
        <div className="card-body p-0">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="p-3 border-bottom-2">{t('users.table.id')}</th>
                <th className="p-3 border-bottom-2" style={{ width: '80px' }}></th>
                <th className="p-3 border-bottom-2">{t('users.table.name')}</th>
                <th className="p-3 border-bottom-2">{t('users.table.username')}</th>
                <th className="p-3 border-bottom-2">{t('users.table.email')}</th>
                <th className="p-3 border-bottom-2">{t('users.table.role')}</th>
                <th className="p-3 border-bottom-2">{t('users.table.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-3">{user.id}</td>
                  <td className="p-3">
                    <div className="rounded-circle overflow-hidden bg-light d-flex align-items-center justify-content-center border" style={{ width: '40px', height: '40px' }}>
                      {user.image || user.image_url ? (
                        <img 
                          src={getImageUrl(user.image_url || user.image || '')} 
                          alt={user.name} 
                          className="w-100 h-100" 
                          style={{ objectFit: 'cover' }} 
                        />
                      ) : (
                        <i className="bi bi-person-fill text-secondary"></i>
                      )}
                    </div>
                  </td>
                  <td className="p-3">{user.first_name} {user.last_name}</td>
                  <td className="p-3">{user.username}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <span className={`badge ${
                      user.role === 'admin' ? 'bg-primary' : 
                      user.role === 'technician' ? 'bg-info text-dark' : 
                      'bg-secondary'
                    }`}>
                      {t(`users.roles.${user.role}`, { defaultValue: user.role })}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="d-flex gap-2">
                      <button
                        onClick={() => navigate(`/users/${user.id}/edit`)}
                        className="btn btn-warning btn-sm"
                      >
                        {t('actions.edit')}
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn-danger btn-sm"
                        disabled={currentUser?.id === user.id}
                      >
                        {t('actions.delete')}
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        
        {totalPages > 1 && (
          <div className="card-footer bg-white py-3">
            <nav aria-label="Page navigation">
              <ul className="pagination justify-content-center mb-0">
                <li className={`page-item ${page === 1 ? 'disabled' : ''}`}>
                  <button 
                    className="page-link" 
                    onClick={() => setPage(prev => Math.max(prev - 1, 1))}
                    disabled={page === 1}
                  >
                    {t('common.previous')}
                  </button>
                </li>
                {[...Array(totalPages)].map((_, i) => (
                  <li key={i + 1} className={`page-item ${page === i + 1 ? 'active' : ''}`}>
                    <button 
                      className="page-link" 
                      onClick={() => setPage(i + 1)}
                    >
                      {i + 1}
                    </button>
                  </li>
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
