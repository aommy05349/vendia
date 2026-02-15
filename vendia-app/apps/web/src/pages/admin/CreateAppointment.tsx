import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@vendia/shared';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Select from 'react-select';
import { useTranslation } from 'react-i18next';

interface User {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
  phone?: string;
}

interface CustomerLocation {
  id: number;
  name: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_link: string | null;
  contact_person: string | null;
  contact_phone: string | null;
}

// Simple debounce utility
function debounce<T extends (...args: any[]) => any>(func: T, wait: number) {
  let timeout: any;
  return (...args: Parameters<T>) => {
    clearTimeout(timeout);
    timeout = setTimeout(() => func(...args), wait);
  };
}

export const CreateAppointment = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<User[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    customer_id: '',
    order_id: '',
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    location_id: 'manual', // 'manual' or ID
    // Manual location fields
    location_name: '',
    address: '',
    latitude: '',
    longitude: '',
    google_maps_link: '',
    contact_name: '',
    contact_phone: '',
    admin_notes: '',
  });

  const [selectedTechnicians, setSelectedTechnicians] = useState<{ id: number; is_lead: boolean }[]>([]);

  useEffect(() => {
    fetchCustomers();
    fetchTechnicians();
    
    // Handle URL params
    const orderId = searchParams.get('order_id');
    const customerId = searchParams.get('customer_id');

    if (orderId && customerId) {
        setFormData(prev => ({
            ...prev,
            customer_id: customerId,
            order_id: orderId
        }));
    } else if (customerId) {
        setFormData(prev => ({
            ...prev,
            customer_id: customerId
        }));
    }
  }, []);

  useEffect(() => {
    if (formData.customer_id) {
      fetchCustomerData(formData.customer_id, formData.order_id);
    } else {
      setOrders([]);
      setCustomerLocations([]);
    }
  }, [formData.customer_id]);

  const fetchCustomers = async (search = '') => {
    try {
      const params = new URLSearchParams();
      params.append('role', 'customer');
      params.append('per_page', '100');
      if (search) {
        params.append('search', search);
      }
      const response = await api.get(`/users?${params.toString()}`);
      setCustomers(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch customers', error);
    }
  };

  const fetchCustomersRef = React.useRef(fetchCustomers);
  fetchCustomersRef.current = fetchCustomers;

  const debouncedFetchCustomers = useCallback(
      debounce((inputValue: string) => {
          fetchCustomersRef.current(inputValue);
      }, 500),
      []
  );

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/users?role=technician'); // Assuming filter exists
      setTechnicians(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch technicians', error);
    }
  };

  const fetchCustomerData = async (customerId: string, includeOrderId?: string) => {
    try {
      let orderQuery = `/orders?customer_id=${customerId}&exclude_has_appointment=true&status=pending,completed`;
      if (includeOrderId) {
        orderQuery += `&include_order_id=${includeOrderId}`;
      }

      const [ordersRes, locationsRes] = await Promise.all([
        api.get(orderQuery),
        api.get(`/users/${customerId}/locations`),
      ]);
      setOrders(ordersRes.data.data || []);
      setCustomerLocations(locationsRes.data);
    } catch (error) {
      console.error('Failed to fetch customer data', error);
    }
  };

  const handleLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    setFormData(prev => ({ ...prev, location_id: locId }));

    if (locId !== 'manual') {
      const loc = customerLocations.find(l => l.id === parseInt(locId));
      if (loc) {
        setFormData(prev => ({
          ...prev,
          location_id: locId,
          location_name: loc.name || '',
          address: loc.address,
          latitude: loc.latitude?.toString() || '',
          longitude: loc.longitude?.toString() || '',
          google_maps_link: loc.google_maps_link || '',
          contact_name: loc.contact_person || '',
          contact_phone: loc.contact_phone || '',
        }));
      }
    } else {
        // Reset manual fields if switching back to manual
        setFormData(prev => ({
            ...prev,
            location_id: 'manual',
            location_name: '',
            address: '',
            latitude: '',
            longitude: '',
            google_maps_link: '',
            contact_name: '',
            contact_phone: '',
        }));
    }
  };

  const toggleTechnician = (techId: number) => {
    if (selectedTechnicians.some(t => t.id === techId)) {
      setSelectedTechnicians(prev => prev.filter(t => t.id !== techId));
    } else {
      setSelectedTechnicians(prev => [...prev, { id: techId, is_lead: false }]);
    }
  };

  const setLeadTechnician = (techId: number) => {
    setSelectedTechnicians(prev => prev.map(t => ({
      ...t,
      is_lead: t.id === techId // Only one lead? Or multiple? Assuming one for now, or just toggle.
    })));
  };

  const handleStartTimeChange = (value: string) => {
    setFormData(prev => ({
      ...prev,
      start_time: value,
      end_time: prev.end_time && prev.end_time < value ? '' : prev.end_time,
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setSubmitError(null);
    try {
      const payload = {
        ...formData,
        technicians: selectedTechnicians,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        order_id: formData.order_id || null,
        end_time: formData.end_time || null,
      };

      await api.post('/appointments', payload);
      navigate('/appointments', { state: { appointmentCreated: true } });
    } catch (error: any) {
      console.error('Failed to create appointment', error);
      if (error.response?.status === 422 && error.response.data?.errors) {
        const errors = error.response.data.errors;
        const firstKey = Object.keys(errors)[0];
        const firstMessage = errors[firstKey]?.[0];
        setSubmitError(firstMessage || t('appointments.create.failed'));
      } else {
        setSubmitError(t('appointments.create.failed'));
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container-fluid p-4">
      <div className="mb-4">
        <button
          type="button"
          onClick={() => navigate('/appointments')}
          className="btn btn-outline-secondary mb-3"
        >
          <i className="bi bi-arrow-left me-2"></i>
          {t('appointments.detail.back')}
        </button>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h1>{t('appointments.create.title')}</h1>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit}>
        {submitError && (
          <div className="alert alert-danger mb-3" role="alert">
            {submitError}
          </div>
        )}

        <div className="row g-4">
          <div className="col-md-8">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">{t('appointments.detail.job_details')}</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">
                    {t('appointments.create.title_label')} <span className="text-danger">*</span>
                  </label>
                  <input
                    type="text"
                    className="form-control"
                    required
                    placeholder={t('appointments.create.title_placeholder')}
                    value={formData.title}
                    onChange={e => setFormData({ ...formData, title: e.target.value })}
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">{t('appointments.create.description')}</label>
                  <textarea
                    className="form-control"
                    rows={2}
                    value={formData.description}
                    onChange={e => setFormData({ ...formData, description: e.target.value })}
                  ></textarea>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      {t('appointments.create.start_time')} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      required
                      value={formData.start_time}
                      onChange={e => handleStartTimeChange(e.target.value)}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('appointments.create.end_time')}</label>
                    <input
                      type="datetime-local"
                      className="form-control"
                      value={formData.end_time}
                      min={formData.start_time || undefined}
                      onChange={e => setFormData({ ...formData, end_time: e.target.value })}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">{t('appointments.detail.location')}</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">
                    {t('appointments.create.select_location')}
                  </label>
                  <select
                    className="form-select"
                    value={formData.location_id}
                    onChange={handleLocationChange}
                    disabled={!formData.customer_id}
                  >
                    <option value="manual">{t('appointments.create.manual_location')}</option>
                    {customerLocations.map(l => (
                      <option key={l.id} value={l.id}>
                        {l.name ? `${l.name} - ` : ''}
                        {l.address.substring(0, 50)}...
                      </option>
                    ))}
                  </select>
                </div>

                <div className="mb-3">
                  <label className="form-label">
                    {t('appointments.create.address')} <span className="text-danger">*</span>
                  </label>
                  <textarea
                    className="form-control"
                    required
                    rows={3}
                    value={formData.address}
                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                    readOnly={formData.location_id !== 'manual'}
                  ></textarea>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      {t('appointments.create.google_maps_link')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.google_maps_link}
                      onChange={e =>
                        setFormData({ ...formData, google_maps_link: e.target.value })
                      }
                      readOnly={formData.location_id !== 'manual'}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      {t('appointments.create.location_name')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.location_name}
                      onChange={e =>
                        setFormData({ ...formData, location_name: e.target.value })
                      }
                      readOnly={formData.location_id !== 'manual'}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">
                      {t('appointments.create.contact_person')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.contact_name}
                      onChange={e =>
                        setFormData({ ...formData, contact_name: e.target.value })
                      }
                      readOnly={formData.location_id !== 'manual'}
                    />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">
                      {t('appointments.create.contact_phone')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.contact_phone}
                      onChange={e =>
                        setFormData({ ...formData, contact_phone: e.target.value })
                      }
                      readOnly={formData.location_id !== 'manual'}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="col-md-4">
            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">{t('appointments.detail.customer_info')}</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">
                    {t('appointments.create.customer')} <span className="text-danger">*</span>
                  </label>
                  <Select
                    options={customers.map(c => ({
                      value: c.id,
                      label: `${c.first_name ? c.first_name + ' ' + c.last_name : c.name}${
                        c.phone ? ' (' + c.phone + ')' : ''
                      }`
                    }))}
                    value={customers
                      .map(c => ({
                        value: c.id,
                        label: `${c.first_name ? c.first_name + ' ' + c.last_name : c.name}${
                          c.phone ? ' (' + c.phone + ')' : ''
                        }`
                      }))
                      .find(opt => opt.value.toString() === formData.customer_id.toString())}
                    onChange={option =>
                      setFormData({ ...formData, customer_id: option?.value.toString() || '' })
                    }
                    onInputChange={(inputValue, { action }) => {
                      if (action === 'input-change') {
                        debouncedFetchCustomers(inputValue);
                      }
                    }}
                    placeholder={t('appointments.create.search_customer_placeholder')}
                    isClearable
                    className="react-select-container"
                    classNamePrefix="react-select"
                  />
                </div>

                <div className="mb-3">
                  <label className="form-label">{t('appointments.create.link_order')}</label>
                  <select
                    className="form-select"
                    value={formData.order_id}
                    onChange={e => setFormData({ ...formData, order_id: e.target.value })}
                    disabled={!formData.customer_id}
                  >
                    <option value="">{t('appointments.create.select_order')}</option>
                    {orders.map(o => (
                      <option key={o.id} value={o.id}>
                        #{o.id} - {new Date(o.created_at).toLocaleDateString()} ({o.status}) -{' '}
                        {o.total}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">{t('appointments.detail.assigned_team')}</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">
                    {t('appointments.create.select_technicians')}
                  </label>
                  <Select
                    isMulti
                    options={technicians.map(t => ({
                      value: t.id,
                      label: `${t.first_name ? t.first_name + ' ' + t.last_name : t.name}`
                    }))}
                    onChange={selectedOptions => {
                      const newSelected = selectedOptions.map((option: any) => {
                        const existing = selectedTechnicians.find(
                          t => t.id === option.value
                        );
                        return {
                          id: option.value,
                          is_lead: existing ? existing.is_lead : false
                        };
                      });
                      setSelectedTechnicians(newSelected);
                    }}
                    className="mb-3"
                  />
                </div>

                {selectedTechnicians.length > 0 && (
                  <div className="card bg-light border-0">
                    <div className="card-body p-3">
                      <small className="d-block mb-2 text-muted fw-bold">
                        {t('appointments.create.select_lead_header')}
                      </small>
                      <ul className="list-group">
                        {selectedTechnicians.map(st => {
                          const tech = technicians.find(t => t.id === st.id);
                          if (!tech) return null;
                          return (
                            <li
                              key={st.id}
                              className="list-group-item d-flex justify-content-between align-items-center py-2"
                            >
                              <span>
                                {tech.first_name
                                  ? `${tech.first_name} ${tech.last_name}`
                                  : tech.name}
                              </span>
                              <div className="form-check form-switch mb-0">
                                <input
                                  className="form-check-input"
                                  type="checkbox"
                                  checked={st.is_lead}
                                  onChange={() => setLeadTechnician(st.id)}
                                  id={`lead-${st.id}`}
                                />
                                <label
                                  className="form-check-label small"
                                  htmlFor={`lead-${st.id}`}
                                >
                                  {t('appointments.create.lead_role')}
                                </label>
                              </div>
                            </li>
                          );
                        })}
                      </ul>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <div className="card mb-4">
              <div className="card-header">
                <h5 className="mb-0">{t('appointments.create.admin_notes')}</h5>
              </div>
              <div className="card-body">
                <textarea
                  className="form-control"
                  rows={2}
                  value={formData.admin_notes}
                  onChange={e =>
                    setFormData({ ...formData, admin_notes: e.target.value })
                  }
                ></textarea>
              </div>
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => navigate('/appointments')}
              >
                {t('appointments.create.cancel')}
              </button>
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading
                  ? t('appointments.create.submitting')
                  : t('appointments.create.submit')}
              </button>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
