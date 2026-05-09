import React, { useState } from 'react';
import { api } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { MessageModal } from '../../components/MessageModal';

export const CreateCustomer = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [isCompany, setIsCompany] = useState(false);
  const [formData, setFormData] = useState({
    first_name: '',
    last_name: '',
    contact_name: '',
    email: '',
    phone: '',
    company_name: '',
    tax_id: '',
    address: '',
    google_maps_link: '',
  });
  const [coords, setCoords] = useState<{ lat: number | null; lng: number | null }>({ lat: null, lng: null });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const extractLatLngFromGoogleMapsLink = (value: string) => {
    try {
      const trimmed = value.trim();
      if (!trimmed) return null;

      let url: URL | null = null;
      if (trimmed.startsWith('http')) {
        try {
          url = new URL(trimmed);
        } catch {
          url = null;
        }
      }

      if (url) {
        const q = url.searchParams.get('q') || url.searchParams.get('query');
        if (q) {
          const match = q.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
          if (match) {
            return {
              lat: parseFloat(match[1]),
              lng: parseFloat(match[3]),
            };
          }
        }

        const pathMatch = url.pathname.match(/@(-?\d+(\.\d+)?),(-?\d+(\.\d+)?)/);
        if (pathMatch) {
          return {
            lat: parseFloat(pathMatch[1]),
            lng: parseFloat(pathMatch[3]),
          };
        }
      }

      const exMatch = trimmed.match(/!3d(-?\d+(\.\d+)?)!4d(-?\d+(\.\d+)?)/);
      if (exMatch) {
        return {
          lat: parseFloat(exMatch[1]),
          lng: parseFloat(exMatch[3]),
        };
      }

      const plainMatch = trimmed.match(/(-?\d+(\.\d+)?),\s*(-?\d+(\.\d+)?)/);
      if (plainMatch) {
        return {
          lat: parseFloat(plainMatch[1]),
          lng: parseFloat(plainMatch[3]),
        };
      }

      return null;
    } catch {
      return null;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const address = formData.address.trim();
      const googleMapsLink = formData.google_maps_link.trim();
      const dataToSubmit = {
        is_company: isCompany,
        company_name: formData.company_name.trim() || undefined,
        contact_name: formData.contact_name.trim() || undefined,
        first_name: isCompany ? '' : formData.first_name.trim(),
        last_name: isCompany ? '' : formData.last_name.trim(),
        name: (isCompany ? formData.company_name : `${formData.first_name} ${formData.last_name}`).trim(),
        email: formData.email.trim() || undefined,
        phone: formData.phone.trim() || undefined,
        tax_id: formData.tax_id.trim() || undefined,
        address: address || undefined,
      };

      const createRes = await api.post('/customers', dataToSubmit);
      const createdCustomer = createRes.data;

      if (createdCustomer?.id && address) {
        try {
          await api.post('/customer-locations', {
            customer_id: createdCustomer.id,
            name: null,
            address,
            latitude: coords.lat,
            longitude: coords.lng,
            google_maps_link: googleMapsLink || null,
            contact_person: isCompany ? (formData.contact_name.trim() || null) : null,
            contact_phone: null,
            is_default: true,
          });
        } catch (locationErr) {
          console.error('Failed to create initial customer location', locationErr);
        }
      }

      navigate('/customers', { state: { success: t('customers.create_success') } });
    } catch (err: any) {
      console.error(err);
      if (err.response?.data?.errors) {
        const errorMessages = Object.values(err.response.data.errors).flat().join('\n');
        setError(errorMessages);
      } else {
        setError(err.response?.data?.message || t('customers.create_failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '90%' }}>
      <MessageModal
        open={error !== ''}
        type="danger"
        title={t('common.error_title', 'ไม่สำเร็จ')}
        message={error}
        okLabel={t('common.ok', 'ตกลง')}
        onClose={() => setError('')}
      />
      <h1 className="mb-4">{t('customers.create_title')}</h1>
      
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
        <div className="mb-3">
          <div className="form-check form-switch d-flex align-items-center gap-2">
            <input
              className="form-check-input"
              type="checkbox"
              checked={isCompany}
              onChange={(e) => setIsCompany(e.target.checked)}
              id="createCustomerIsCompany"
              style={{ width: '3.25rem', height: '1.75rem' }}
            />
            <label className="form-check-label fw-bold fs-5" htmlFor="createCustomerIsCompany">
              {t('customers.is_company', 'เป็นบริษัท')}
            </label>
          </div>
        </div>

        {isCompany && (
          <div className="mb-3">
            <label className="form-label fw-bold">{t('customers.company')} <span className="text-danger">*</span></label>
            <input
              type="text"
              name="company_name"
              className="form-control"
              value={formData.company_name}
              onChange={handleChange}
              required
            />
          </div>
        )}

        {isCompany && (
          <div className="mb-3">
            <label className="form-label fw-bold">{t('customers.locations.contact_person', 'ผู้ติดต่อ (ถ้ามี)')}</label>
            <input
              type="text"
              name="contact_name"
              className="form-control"
              value={formData.contact_name}
              onChange={handleChange}
              placeholder={t('print.customer.attention', 'ผู้ติดต่อ / Attention')}
            />
          </div>
        )}

        {!isCompany && (
          <div className="row g-3 mb-3">
            <div className="col-md-6">
              <label className="form-label fw-bold">{t('customers.first_name')}</label>
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
              <label className="form-label fw-bold">{t('customers.last_name')}</label>
              <input
                type="text"
                name="last_name"
                className="form-control"
                value={formData.last_name}
                onChange={handleChange}
              />
            </div>
          </div>
        )}

        <div className="row g-3 mb-3">
          <div className="col-md-6">
            <label className="form-label fw-bold">{t('customers.email')}</label>
            <input 
              type="email" 
              name="email" 
              className="form-control"
              value={formData.email} 
              onChange={handleChange} 
            />
          </div>
          <div className="col-md-6">
            <label className="form-label fw-bold">{t('customers.phone')}</label>
            <input 
              type="text" 
              name="phone" 
              className="form-control"
              value={formData.phone} 
              onChange={handleChange} 
            />
          </div>
        </div>

        {!isCompany && (
          <div className="mb-3">
            <label className="form-label fw-bold">{t('customers.company')}</label>
            <input 
              type="text" 
              name="company_name" 
              className="form-control"
              value={formData.company_name} 
              onChange={handleChange} 
            />
          </div>
        )}

        <div className="mb-3">
          <label className="form-label fw-bold">{t('customers.tax_id')}</label>
          <input 
            type="text" 
            name="tax_id" 
            className="form-control"
            value={formData.tax_id} 
            onChange={handleChange} 
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold">{t('customers.address')}</label>
          <textarea 
            name="address" 
            className="form-control"
            rows={3}
            value={formData.address} 
            onChange={handleChange} 
          />
        </div>

        <div className="mb-3">
          <label className="form-label fw-bold d-flex justify-content-between align-items-center">
            <span>{t('customers.locations.google_maps_link', 'ลิงก์ Google Maps')}</span>
            {formData.google_maps_link.trim() && (
              <a
                href={formData.google_maps_link.trim()}
                target="_blank"
                rel="noopener noreferrer"
                className="btn btn-sm btn-outline-info"
              >
                <i className="bi bi-geo-alt-fill"></i> Map
              </a>
            )}
          </label>
          <input
            type="text"
            name="google_maps_link"
            className="form-control"
            value={formData.google_maps_link}
            onChange={(e) => {
              const value = e.target.value;
              setFormData(prev => ({ ...prev, google_maps_link: value }));
              const extracted = extractLatLngFromGoogleMapsLink(value);
              setCoords(extracted ? { lat: extracted.lat, lng: extracted.lng } : { lat: null, lng: null });
            }}
            placeholder="https://maps.google.com/..."
          />
          <div className="form-text">
            {t('customers.locations.google_maps_hint', 'วางลิงก์ Google Maps ของที่อยู่นี้ (ไม่บังคับ)')}
          </div>
        </div>

        <div className="d-flex justify-content-end gap-2">
          <button 
            type="button" 
            className="btn btn-secondary"
            onClick={() => navigate('/customers')}
          >
            {t('common.cancel')}
          </button>
          <button 
            type="submit" 
            className="btn btn-primary"
            disabled={loading}
          >
            {loading ? t('common.creating') : t('customers.create_btn')}
          </button>
        </div>
      </form>
    </div>
  );
};
