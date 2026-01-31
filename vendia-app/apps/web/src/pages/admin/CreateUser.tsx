import React, { useState } from 'react';
import { api } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';

export const CreateUser = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    password: '',
    role: 'staff',
    image: null as File | null,
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      Object.keys(formData).forEach(key => {
        if (key === 'image') {
          if (formData.image) data.append('image', formData.image);
        } else {
          data.append(key, formData[key as keyof typeof formData] as string);
        }
      });

      await api.post('/users', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      navigate('/users', { state: { success: 'User created successfully' } });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || 'Failed to create user');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">Create New User</h1>
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
          <label className="form-label fw-bold">Password</label>
          <input 
            type="password" 
            name="password" 
            className="form-control"
            value={formData.password} 
            onChange={handleChange} 
            required 
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
            {loading ? 'Creating...' : 'Create User'}
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
