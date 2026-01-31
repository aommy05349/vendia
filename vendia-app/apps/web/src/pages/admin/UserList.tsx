import React, { useEffect, useState } from 'react';
import { api } from '@vendia/shared';
import { useNavigate, useLocation } from 'react-router-dom';

interface User {
  id: number;
  name: string;
  username: string;
  email: string;
  role: string;
  first_name: string;
  last_name: string;
}

export const UserList = () => {
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
      const response = await api.get('/users');
      setUsers(response.data.data); // Assuming pagination
    } catch (error) {
      console.error('Failed to fetch users:', error);
      setAlertMessage({ type: 'danger', text: 'Failed to fetch users' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this user?')) return;
    try {
      await api.delete(`/users/${id}`);
      setAlertMessage({ type: 'success', text: 'User deleted successfully' });
      fetchUsers();
    } catch (error) {
      console.error('Failed to delete user:', error);
      setAlertMessage({ type: 'danger', text: 'Failed to delete user' });
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="h3">User Management</h1>
        <button
          onClick={() => navigate('/users/create')}
          className="btn btn-success"
        >
          Create New User
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
                <th className="p-3 border-bottom-2">ID</th>
                <th className="p-3 border-bottom-2">Name</th>
                <th className="p-3 border-bottom-2">Username</th>
                <th className="p-3 border-bottom-2">Email</th>
                <th className="p-3 border-bottom-2">Role</th>
                <th className="p-3 border-bottom-2">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user.id}>
                  <td className="p-3">{user.id}</td>
                  <td className="p-3">{user.first_name} {user.last_name}</td>
                  <td className="p-3">{user.username}</td>
                  <td className="p-3">{user.email}</td>
                  <td className="p-3">
                    <span className={`badge ${user.role === 'admin' ? 'bg-primary' : 'bg-secondary'}`}>
                      {user.role}
                    </span>
                  </td>
                  <td className="p-3">
                    <div className="d-flex gap-2">
                      <button
                        onClick={() => navigate(`/users/${user.id}/edit`)}
                        className="btn btn-warning btn-sm"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => handleDelete(user.id)}
                        className="btn btn-danger btn-sm"
                      >
                        Delete
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
