import React, { useEffect, useState } from 'react';
import { api } from '@vendia/shared';
import { useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger', text: string } | null>(null);
  const navigate = useNavigate();
  const location = useLocation();

  useEffect(() => {
    fetchUsers();
    if (location.state?.success) {
      setAlertMessage({ type: 'success', text: location.state.success });
      // Clear the state to prevent showing the message again on refresh
      window.history.replaceState({}, document.title);
      // Auto dismiss after 3 seconds
      setTimeout(() => setAlertMessage(null), 3000);
    }
  }, [location]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/users?exclude_role=customer');
      setUsers(response.data.data); // Assuming pagination
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setAlertMessage({ type: 'danger', text: t('users.alerts.fetch_error') });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm(t('users.alerts.delete_confirm'))) return;
    try {
      await api.delete(`/users/${id}`);
      setAlertMessage({ type: 'success', text: t('users.alerts.delete_success') });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      setAlertMessage({ type: 'danger', text: t('users.alerts.delete_error') });
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">{t('users.title')}</h1>
        <button
          onClick={() => navigate('/users/create')}
          className="btn btn-success"
        >
          {t('users.create')}
        </button>
      </div>

      {alertMessage && (
        <div className={`alert alert-${alertMessage.type} alert-dismissible fade show`} role="alert">
          {alertMessage.text}
          <button type="button" className="btn-close" onClick={() => setAlertMessage(null)}></button>
        </div>
      )}

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
                      {user.image_url ? (
                        <img 
                          src={user.image_url} 
                          alt={user.name} 
                          className="w-100 h-100" 
                          style={{ objectFit: 'cover' }} 
                        />
                      ) : user.image ? (
                        <img 
                          src={user.image.startsWith('http') ? user.image : `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${user.image}`}
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
      </div>
    </div>
  );
};
