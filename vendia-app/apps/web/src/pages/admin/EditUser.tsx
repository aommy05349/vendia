import React, { useState, useEffect } from 'react';
import { api } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const EditUser = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { id } = useParams();
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    role: 'staff',
    image: null as File | null,
  });
  const [preview, setPreview] = useState<string | null>(null);
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
        phone: user.phone || '',
        password: '', // Don't populate password
        role: user.role,
        image: null,
      });
      if (user.image_url) {
        setPreview(user.image_url);
      } else if (user.image) {
        const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
        const baseUrl = apiUrl.replace('/api', '');
        setPreview(user.image.startsWith('http') ? user.image : `${baseUrl}/storage/${user.image}`);
      }
    } catch (err: any) {
      console.error(err);
      setError(t('users.alerts.fetch_single_error'));
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
      const file = e.target.files[0];
      
      // Validate file size (max 2MB)
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        e.target.value = ''; // Reset input
        return;
      }

      setFormData(prev => ({ ...prev, image: file }));
      setPreview(URL.createObjectURL(file));
      setError('');
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
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate('/users', { state: { success: t('users.alerts.update_success') } });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || t('users.alerts.update_error'));
    } finally {
      setLoading(false);
    }
  };

  if (loading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">{t('users.edit_title')}</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
        
        {/* Profile Image Section */}
        <div className="mb-4 text-center">
          <div className="position-relative d-inline-block">
            <div 
              className="rounded-circle overflow-hidden border border-3 border-light shadow-sm bg-light d-flex align-items-center justify-content-center"
              style={{ width: '150px', height: '150px' }}
            >
              {preview ? (
                <img 
                  src={preview} 
                  alt="Profile" 
                  className="w-100 h-100" 
                  style={{ objectFit: 'cover' }} 
                />
              ) : (
                <i className="bi bi-person-fill text-secondary" style={{ fontSize: '5rem' }}></i>
              )}
            </div>
            
            <label 
              htmlFor="image-upload" 
              className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle shadow-sm d-flex align-items-center justify-content-center"
              style={{ cursor: 'pointer', width: '40px', height: '40px', transform: 'translate(10%, 10%)' }}
              title={t('users.form.profile_image')}
            >
              <i className="bi bi-camera-fill"></i>
            </label>
            
            <input 
              id="image-upload"
              type="file" 
              name="image" 
              className="d-none"
              onChange={handleFileChange} 
              accept="image/*" 
            />
          </div>
        </div>

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-bold">{t('users.form.first_name')}</label>
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
            <label className="form-label fw-bold">{t('users.form.last_name')}</label>
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
          <label className="form-label fw-bold">{t('users.form.username')}</label>
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
          <label className="form-label fw-bold">{t('users.form.email')}</label>
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
          <label className="form-label fw-bold">{t('users.form.password_edit_hint')}</label>
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
          <label className="form-label fw-bold">{t('users.form.phone')}</label>
          <input 
            type="text" 
            name="phone" 
            className="form-control"
            value={formData.phone} 
            onChange={handleChange} 
            required 
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">{t('users.form.role')}</label>
          <select 
            name="role" 
            className="form-select"
            value={formData.role} 
            onChange={handleChange}
          >
            <option value="staff">{t('users.roles.staff')}</option>
            <option value="admin">{t('users.roles.admin')}</option>
            <option value="technician">{t('users.roles.technician')}</option>
          </select>
        </div>

        <div className="d-grid gap-2">
          <button 
            type="submit" 
            className="btn btn-primary btn-lg"
            disabled={loading}
          >
            {loading ? t('users.form.updating') : t('users.form.submit_update')}
          </button>
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/users')}
          >
            {t('common.cancel')}
          </button>
        </div>
      </form>
    </div>
  );
};
