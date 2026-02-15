import React, { useEffect, useState } from 'react';
import { api, useAuthStore } from '@vendia/shared';
import { useTranslation } from 'react-i18next';

export const Profile = () => {
  const { t } = useTranslation();
  const { user, token, login } = useAuthStore();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [preview, setPreview] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    username: '',
    first_name: '',
    last_name: '',
    email: '',
    phone: '',
    password: '',
    image: null as File | null,
  });

  useEffect(() => {
    const loadUser = async () => {
      if (!user) {
        setLoading(false);
        return;
      }
      try {
        const response = await api.get('/user');
        const u = response.data;
        setFormData({
          username: u.username || '',
          first_name: u.first_name || '',
          last_name: u.last_name || '',
          email: u.email || '',
          phone: u.phone || '',
          password: '',
          image: null,
        });

        if (u.image_url) {
          setPreview(u.image_url);
        } else if (u.image) {
          const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
          const baseUrl = apiUrl.replace('/api', '');
          setPreview(u.image.startsWith('http') ? u.image : `${baseUrl}/storage/${u.image}`);
        }

        if (token) {
          login(u, token);
        }
      } catch (err: any) {
        console.error(err);
        setError(t('users.alerts.fetch_single_error'));
      } finally {
        setLoading(false);
      }
    };
    loadUser();
  }, [user, token, login, t]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (file.size > 2 * 1024 * 1024) {
        setError('Image size must be less than 2MB');
        e.target.value = '';
        return;
      }
      setFormData(prev => ({ ...prev, image: file }));
      setPreview(URL.createObjectURL(file));
      setError('');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setSaving(true);
    setError('');
    setSuccess('');

    try {
      const data = new FormData();
      data.append('_method', 'PUT');

      data.append('first_name', formData.first_name);
      data.append('last_name', formData.last_name);
      data.append('username', formData.username);
      data.append('email', formData.email);
      data.append('phone', formData.phone);

      if (formData.password) {
        data.append('password', formData.password);
      }
      if (formData.image) {
        data.append('image', formData.image);
      }

      const response = await api.post(`/users/${user.id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      const updated = response.data;
      if (token) {
        login(updated, token);
      }
      setSuccess(t('users.alerts.update_success'));
      setFormData(prev => ({ ...prev, password: '' }));
    } catch (err: any) {
      console.error(err);
      setError(err.response?.data?.message || t('users.alerts.update_error'));
    } finally {
      setSaving(false);
    }
  };

  if (!user) {
    return (
      <div className="container mt-5">
        <div className="alert alert-warning">{t('common.please_login')}</div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="text-center mt-5">
        <div className="spinner-border text-primary" role="status"></div>
      </div>
    );
  }

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">{t('common.profile')}</h1>
      {error && <div className="alert alert-danger">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
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
              htmlFor="profile-image-upload"
              className="position-absolute bottom-0 end-0 bg-primary text-white rounded-circle shadow-sm d-flex align-items-center justify-content-center"
              style={{ cursor: 'pointer', width: '40px', height: '40px', transform: 'translate(10%, 10%)' }}
              title={t('users.form.profile_image')}
            >
              <i className="bi bi-camera-fill"></i>
            </label>

            <input
              id="profile-image-upload"
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

        <div className="d-grid gap-2">
          <button
            type="submit"
            className="btn btn-primary btn-lg"
            disabled={saving}
          >
            {saving ? t('users.form.updating') : t('common.save')}
          </button>
        </div>
      </form>
    </div>
  );
};

