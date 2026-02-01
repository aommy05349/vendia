import React, { useState, useEffect } from 'react';
import { api } from '@vendia/shared';

interface CustomerLocation {
  id: number;
  user_id: number;
  name: string | null;
  address: string;
  latitude: number | null;
  longitude: number | null;
  google_maps_link: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  is_default: boolean;
}

interface CustomerLocationsProps {
  customerId: string | number;
}

export const CustomerLocations: React.FC<CustomerLocationsProps> = ({ customerId }) => {
  const [locations, setLocations] = useState<CustomerLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CustomerLocation | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    latitude: '',
    longitude: '',
    google_maps_link: '',
    contact_person: '',
    contact_phone: '',
    is_default: false,
  });

  useEffect(() => {
    fetchLocations();
  }, [customerId]);

  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/users/${customerId}/locations`);
      setLocations(response.data);
    } catch (error) {
      console.error('Failed to fetch locations', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenModal = (location?: CustomerLocation) => {
    if (location) {
      setEditingLocation(location);
      setFormData({
        name: location.name || '',
        address: location.address,
        latitude: location.latitude?.toString() || '',
        longitude: location.longitude?.toString() || '',
        google_maps_link: location.google_maps_link || '',
        contact_person: location.contact_person || '',
        contact_phone: location.contact_phone || '',
        is_default: location.is_default,
      });
    } else {
      setEditingLocation(null);
      setFormData({
        name: '',
        address: '',
        latitude: '',
        longitude: '',
        google_maps_link: '',
        contact_person: '',
        contact_phone: '',
        is_default: false,
      });
    }
    setShowModal(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload = {
        user_id: customerId,
        ...formData,
        latitude: formData.latitude ? parseFloat(formData.latitude) : null,
        longitude: formData.longitude ? parseFloat(formData.longitude) : null,
      };

      if (editingLocation) {
        await api.put(`/customer-locations/${editingLocation.id}`, payload);
      } else {
        await api.post('/customer-locations', payload);
      }
      
      setShowModal(false);
      fetchLocations();
    } catch (error) {
      console.error('Failed to save location', error);
      alert('Failed to save location');
    }
  };

  const handleDelete = async (id: number) => {
    if (!confirm('Are you sure you want to delete this location?')) return;
    try {
      await api.delete(`/customer-locations/${id}`);
      fetchLocations();
    } catch (error) {
      console.error('Failed to delete location', error);
    }
  };

  const handleUseLocation = () => {
      if (navigator.geolocation) {
          navigator.geolocation.getCurrentPosition(
              (position) => {
                  setFormData(prev => ({
                      ...prev,
                      latitude: position.coords.latitude.toString(),
                      longitude: position.coords.longitude.toString(),
                      google_maps_link: `https://www.google.com/maps?q=${position.coords.latitude},${position.coords.longitude}`
                  }));
              },
              (error) => {
                  console.error("Error getting location", error);
                  alert("Could not get current location. Please allow location access.");
              }
          );
      } else {
          alert("Geolocation is not supported by this browser.");
      }
  };

  return (
    <div className="card mt-4">
      <div className="card-header d-flex justify-content-between align-items-center">
        <h5 className="mb-0">Locations</h5>
        <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal()}>
          Add Location
        </button>
      </div>
      <div className="card-body">
        {loading ? (
          <div className="text-center">Loading...</div>
        ) : locations.length === 0 ? (
          <p className="text-muted text-center">No locations found.</p>
        ) : (
          <div className="table-responsive">
            <table className="table table-hover">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Address</th>
                  <th>Contact</th>
                  <th>Map</th>
                  <th>Default</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {locations.map((loc) => (
                  <tr key={loc.id}>
                    <td>{loc.name || '-'}</td>
                    <td style={{ maxWidth: '300px' }} className="text-truncate" title={loc.address}>
                      {loc.address}
                    </td>
                    <td>
                      {loc.contact_person && <div>{loc.contact_person}</div>}
                      {loc.contact_phone && <small className="text-muted">{loc.contact_phone}</small>}
                    </td>
                    <td>
                      {loc.google_maps_link ? (
                        <a href={loc.google_maps_link} target="_blank" rel="noopener noreferrer">
                          View
                        </a>
                      ) : (
                        loc.latitude && loc.longitude ? (
                            <a href={`https://www.google.com/maps?q=${loc.latitude},${loc.longitude}`} target="_blank" rel="noopener noreferrer">
                                View
                            </a>
                        ) : '-'
                      )}
                    </td>
                    <td>{loc.is_default ? <span className="badge bg-success">Default</span> : ''}</td>
                    <td>
                      <button
                        className="btn btn-sm btn-outline-primary me-2"
                        onClick={() => handleOpenModal(loc)}
                      >
                        Edit
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => handleDelete(loc.id)}
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {showModal && (
        <div className="modal show d-block" tabIndex={-1} style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingLocation ? 'Edit Location' : 'Add Location'}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">Location Name (e.g. Home, Office)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Home"
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Address <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      required
                      rows={3}
                      value={formData.address}
                      onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                    ></textarea>
                  </div>
                  <div className="row mb-3">
                    <div className="col">
                      <label className="form-label">Latitude</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.latitude}
                        onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                      />
                    </div>
                    <div className="col">
                      <label className="form-label">Longitude</label>
                      <input
                        type="text"
                        className="form-control"
                        value={formData.longitude}
                        onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                      />
                    </div>
                  </div>
                   <div className="mb-3">
                       <button type="button" className="btn btn-sm btn-outline-secondary" onClick={handleUseLocation}>
                           <i className="bi bi-geo-alt"></i> Get Current Location
                       </button>
                   </div>
                  <div className="mb-3">
                    <label className="form-label">Google Maps Link</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.google_maps_link}
                      onChange={(e) => setFormData({ ...formData, google_maps_link: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Contact Person (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.contact_person}
                      onChange={(e) => setFormData({ ...formData, contact_person: e.target.value })}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">Contact Phone (Optional)</label>
                    <input
                      type="text"
                      className="form-control"
                      value={formData.contact_phone}
                      onChange={(e) => setFormData({ ...formData, contact_phone: e.target.value })}
                    />
                  </div>
                  <div className="mb-3 form-check">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id="isDefault"
                      checked={formData.is_default}
                      onChange={(e) => setFormData({ ...formData, is_default: e.target.checked })}
                    />
                    <label className="form-check-label" htmlFor="isDefault">
                      Set as default location
                    </label>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>
                    Cancel
                  </button>
                  <button type="submit" className="btn btn-primary">
                    Save
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
