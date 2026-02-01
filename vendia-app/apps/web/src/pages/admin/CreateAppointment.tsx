import React, { useState, useEffect, useCallback } from 'react';
import { api } from '@vendia/shared';
import { useNavigate, useSearchParams } from 'react-router-dom';
import Select from 'react-select';

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
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState<User[]>([]);
  const [technicians, setTechnicians] = useState<User[]>([]);
  const [orders, setOrders] = useState<any[]>([]);
  const [customerLocations, setCustomerLocations] = useState<CustomerLocation[]>([]);

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
      let orderQuery = `/orders?customer_id=${customerId}&exclude_has_appointment=true`;
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const payload = {
        ...formData,
        technicians: selectedTechnicians,
        // Convert empty strings to null for numeric fields
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
        order_id: formData.order_id || null,
      };

      await api.post('/appointments', payload);
      navigate('/appointments');
    } catch (error) {
      console.error('Failed to create appointment', error);
      alert('Failed to create appointment');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <h2 className="mb-4">Create Service Appointment</h2>
      
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
        {/* Customer & Order */}
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">Customer <span className="text-danger">*</span></label>
            <Select
                options={customers.map(c => ({
                    value: c.id,
                    label: `${c.first_name ? c.first_name + ' ' + c.last_name : c.name} ${c.phone ? ' (' + c.phone + ')' : ''}`
                }))}
                value={customers.map(c => ({
                    value: c.id,
                    label: `${c.first_name ? c.first_name + ' ' + c.last_name : c.name} ${c.phone ? ' (' + c.phone + ')' : ''}`
                })).find(opt => opt.value.toString() === formData.customer_id.toString())}
                onChange={(option) => setFormData({ ...formData, customer_id: option?.value.toString() || '' })}
                onInputChange={(inputValue, { action }) => {
                    if (action === 'input-change') {
                        debouncedFetchCustomers(inputValue);
                    }
                }}
                placeholder="Search by name or phone..."
                isClearable
                className="react-select-container"
                classNamePrefix="react-select"
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">Link Order (Optional)</label>
            <select
              className="form-select"
              value={formData.order_id}
              onChange={(e) => setFormData({ ...formData, order_id: e.target.value })}
              disabled={!formData.customer_id}
            >
              <option value="">Select Order</option>
              {orders.map(o => (
                <option key={o.id} value={o.id}>
                  #{o.id} - {new Date(o.created_at).toLocaleDateString()} ({o.total})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="mb-3">
          <label className="form-label">Title <span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control"
            required
            placeholder="e.g. AC Installation, Repair Visit"
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="mb-3">
            <label className="form-label">Description</label>
            <textarea
                className="form-control"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
        </div>

        {/* Date & Time */}
        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">Start Time <span className="text-danger">*</span></label>
            <input
              type="datetime-local"
              className="form-control"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">End Time (Optional)</label>
            <input
              type="datetime-local"
              className="form-control"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>
        </div>

        <hr />
        
        {/* Location */}
        <h5 className="mb-3">Location Details</h5>
        <div className="mb-3">
          <label className="form-label">Select Location</label>
          <select
            className="form-select"
            value={formData.location_id}
            onChange={handleLocationChange}
            disabled={!formData.customer_id}
          >
            <option value="manual">Enter Manually / New Location</option>
            {customerLocations.map(l => (
              <option key={l.id} value={l.id}>
                {l.name ? `${l.name} - ` : ''}{l.address.substring(0, 50)}...
              </option>
            ))}
          </select>
        </div>

        <div className="mb-3">
          <label className="form-label">Address <span className="text-danger">*</span></label>
          <textarea
            className="form-control"
            required
            rows={3}
            value={formData.address}
            onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            readOnly={formData.location_id !== 'manual'}
          ></textarea>
        </div>

        <div className="row mb-3">
            <div className="col-md-6">
                <label className="form-label">Google Maps Link</label>
                <input
                    type="text"
                    className="form-control"
                    value={formData.google_maps_link}
                    onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                    readOnly={formData.location_id !== 'manual'}
                />
            </div>
            <div className="col-md-6">
                 <label className="form-label">Location Name (e.g. Home)</label>
                 <input
                     type="text"
                     className="form-control"
                     value={formData.location_name}
                     onChange={(e) => setFormData({ ...formData, location_name: e.target.value })}
                     readOnly={formData.location_id !== 'manual'}
                 />
            </div>
        </div>

        <div className="row mb-3">
            <div className="col-md-6">
                <label className="form-label">Contact Person</label>
                <input
                    type="text"
                    className="form-control"
                    value={formData.contact_name}
                    onChange={(e) => setFormData({ ...formData, contact_name: e.target.value })}
                    readOnly={formData.location_id !== 'manual'}
                />
            </div>
            <div className="col-md-6">
                <label className="form-label">Contact Phone</label>
                <input
                    type="text"
                    className="form-control"
                    value={formData.contact_phone}
                    onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    readOnly={formData.location_id !== 'manual'}
                />
            </div>
        </div>

        <hr />
        
        <div className="mb-3">
             <label className="form-label">Admin Notes (Internal)</label>
             <textarea
                 className="form-control"
                 rows={2}
                 value={formData.admin_notes}
                 onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
             ></textarea>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button type="button" className="btn btn-secondary" onClick={() => navigate('/appointments')}>
            Cancel
          </button>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            {loading ? 'Creating...' : 'Create Appointment'}
          </button>
        </div>
      </form>
    </div>
  );
};
