import React, { useState, useEffect } from 'react';
import { api } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';

export const EditUser = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'staff',
    image: null as File | null,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchUser();
  }, [id]);

  const fetchUser = async () => {
    try {
      const response = await api.get(`/users/${id}`);
      const user = response.data;
      setFormData({
        username: user.username,
        first_name: user.first_name,
        last_name: user.last_name,
        email: user.email,
        password: '', // Don't populate password
        role: user.role,
        image: null,
      });
    } catch (err: any) {
      console.error(err);
      setError('Failed to fetch user data');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFormData(prev => ({ ...prev, image: e.target.files![0] }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const data = new FormData();
      // Laravel PUT/PATCH with FormData spoofing
      data.append('_method', 'PUT');
      
      Object.keys(formData).forEach(key => {
        if (key === 'image') {
          if (formData.image) data.append('image', formData.image);
        } else if (key === 'password') {
          if (formData.password) data.append('password', formData.password);
        } else {
          data.append(key, formData[key as keyof typeof formData] as string);
        }
      });

      await api.post(`/users/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate('/users', { state: { success: 'User updated successfully' } });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to update user');
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">Edit User</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-bold">First Name</label>
            <input 
              type="text" 
              name="first_name" 
              className="form-control"
              value={formData.first_name} 
              onChange={handleChange} 
              required 
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-bold">Last Name</label>
            <input 
              type="text" 
              name="last_name" 
              className="form-control"
              value={formData.last_name} 
              onChange={handleChange} 
              required 
            />
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">Username</label>
          <input 
            type="text" 
            name="username" 
            className="form-control"
            value={formData.username} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">Email</label>
          <input 
            type="email" 
            name="email" 
            className="form-control"
            value={formData.email} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">Password (Leave blank to keep current)</label>
          <input 
            type="password" 
            name="password" 
            className="form-control"
            value={formData.password} 
            onChange={handleChange} 
            minLength={8} 
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">Role</label>
          <select 
            name="role" 
            className="form-select"
            value={formData.role} 
            onChange={handleChange}
          >
            <option value="staff">Staff</option>
            <option value="admin">Admin</option>
          </select>
        </div>

        <div className="mb-4">
          <label className="form-label fw-bold">Profile Image (Optional)</label>
          <input 
            type="file" 
            name="image" 
            className="form-control"
            onChange={handleFileChange} 
            accept="image/*" 
          />
        </div>

        <div className="d-grid gap-2">
          <button 
            type="submit" 
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? 'Updating...' : 'Update User'}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/users')}
          >
            Cancel
          </button>
        </div>
      </form>
    </div>
  );
};
