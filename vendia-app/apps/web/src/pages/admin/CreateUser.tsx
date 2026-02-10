import React, { useState } from 'react';
import { api } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CreateUser = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
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
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

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
      Object.keys(formData).forEach(key => {
        if (key === 'image') {
          if (formData.image) data.append('image', formData.image);
        } else {
          data.append(key, formData[key as keyof typeof formData] as string);
        }
      });

      await api.post('/users', data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      navigate('/users', { state: { success: t('users.alerts.create_success') } });
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || t('users.alerts.create_error'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">{t('users.create_title')}</h1>
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
          <label className="form-label fw-bold">{t('users.form.password')}</label>
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
          <label className="form-label fw-bold">{t('users.form.phone')}</label>
          <input 
            type="text" 
            name="phone" 
            className="form-control"
            value={formData.phone} 
            onChange={handleChange} 
            required 
            placeholder={t('users.form.phone_placeholder')}
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
            {loading ? t('users.form.submitting') : t('users.form.submit_create')}
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
