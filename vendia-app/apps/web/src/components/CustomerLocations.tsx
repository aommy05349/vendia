import React, { useState, useEffect } from 'react';
import { api } from '@vendia/shared';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from './ConfirmModal';
import { MessageModal } from './MessageModal';

interface CustomerLocation {
  id: number;
  customer_id: number;
  name: string | null;
  address: string;
  latitude: string | number | null;
  longitude: string | number | null;
  google_maps_link: string | null;
  contact_person: string | null;
  contact_phone: string | null;
  is_default: boolean;
}

interface CustomerLocationsProps {
  customerId: string | number;
}

export const CustomerLocations: React.FC<CustomerLocationsProps> = ({ customerId }) => {
  const { t } = useTranslation();
  const [locations, setLocations] = useState<CustomerLocation[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [editingLocation, setEditingLocation] = useState<CustomerLocation | null>(null);
  const [confirmLocationId, setConfirmLocationId] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);
  const [uiMessage, setUiMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
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
  const fetchLocations = async () => {
    setLoading(true);
    try {
      const response = await api.get(`/customers/${customerId}/locations`);
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
        customer_id: customerId,
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
      setUiMessage({ type: 'danger', text: t('customers.locations.save_failed') });
    }
  };

  const handleDelete = (id: number) => {
    setConfirmLocationId(id);
  };

  const handleGetCurrentLocation = () => {
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
        }
      );
    }
  };

  return (
    <div className="card shadow-sm mt-4">
      <MessageModal
        open={uiMessage !== null}
        type={uiMessage?.type || 'danger'}
        title={uiMessage?.type === 'success' ? t('common.success_title', 'สำเร็จ') : t('common.error_title', 'ไม่สำเร็จ')}
        message={uiMessage?.text || ''}
        okLabel={t('common.ok', 'ตกลง')}
        onClose={() => setUiMessage(null)}
      />
      <ConfirmModal
        open={confirmLocationId !== null}
        title={t('common.confirm_title', 'ยืนยัน')}
        message={t('customers.locations.delete_confirm')}
        confirmLabel={t('actions.delete', 'ลบ')}
        cancelLabel={t('common.cancel', 'ยกเลิก')}
        busy={confirmBusy}
        onCancel={() => setConfirmLocationId(null)}
        onConfirm={async () => {
          if (confirmLocationId === null) return;
          setConfirmBusy(true);
          try {
            await api.delete(`/customer-locations/${confirmLocationId}`);
            fetchLocations();
          } catch (error) {
            console.error('Failed to delete location', error);
          } finally {
            setConfirmBusy(false);
            setConfirmLocationId(null);
          }
        }}
      />
      <div className="card-header bg-white d-flex justify-content-between align-items-center py-3">
        <h5 className="mb-0">{t('customers.locations.title')}</h5>
        <button className="btn btn-sm btn-primary" onClick={() => handleOpenModal()}>
          <i className="bi bi-plus-lg me-1"></i> {t('customers.locations.add_btn')}
        </button>
      </div>
      <div className="card-body p-0">
        <div className="table-responsive">
          <table className="table table-hover mb-0">
            <thead className="table-light">
              <tr>
                <th className="p-3">{t('customers.fields.name')}</th>
                <th className="p-3">{t('customers.fields.address')}</th>
                <th className="p-3">{t('customers.fields.contact')}</th>
                <th className="p-3">{t('customers.fields.map')}</th>
                <th className="p-3 text-center">{t('customers.fields.default')}</th>
                <th className="p-3 text-end">{t('customers.fields.actions')}</th>
              </tr>
            </thead>
            <tbody>
              {locations.length > 0 ? (
                locations.map(loc => (
                  <tr key={loc.id}>
                    <td className="p-3 fw-medium">{loc.name || '-'}</td>
                    <td className="p-3" style={{ maxWidth: '300px' }}>{loc.address}</td>
                    <td className="p-3">
                      {loc.contact_person && <div><i className="bi bi-person me-1"></i>{loc.contact_person}</div>}
                      {loc.contact_phone && <div><i className="bi bi-telephone me-1"></i>{loc.contact_phone}</div>}
                    </td>
                    <td className="p-3">
                      {loc.google_maps_link && (
                        <a href={loc.google_maps_link} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-info">
                          <i className="bi bi-geo-alt-fill"></i> Map
                        </a>
                      )}
                      {loc.latitude && loc.longitude && !loc.google_maps_link && (
                         <span className="small text-muted">{Number(loc.latitude).toFixed(4)}, {Number(loc.longitude).toFixed(4)}</span>
                      )}
                    </td>
                    <td className="p-3 text-center">
                      {loc.is_default && <span className="badge bg-success rounded-pill"><i className="bi bi-check-lg"></i></span>}
                    </td>
                    <td className="p-3 text-end">
                      <button className="btn btn-sm btn-outline-primary me-2" onClick={() => handleOpenModal(loc)}>
                        <i className="bi bi-pencil"></i>
                      </button>
                      <button className="btn btn-sm btn-outline-danger" onClick={() => handleDelete(loc.id)}>
                        <i className="bi bi-trash"></i>
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={6} className="text-center p-4 text-muted">{t('customers.locations.no_locations')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Location Modal */}
      {showModal && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }} tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{editingLocation ? t('customers.locations.edit_title') : t('customers.locations.add_title')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowModal(false)}></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="row g-3">
                    <div className="col-md-12">
                      <label className="form-label">{t('customers.locations.name_label')}</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.name}
                        onChange={e => setFormData({...formData, name: e.target.value})}
                        placeholder={t('customers.locations.name_placeholder')}
                      />
                    </div>
                    <div className="col-md-12">
                      <label className="form-label">
                        {t('customers.locations.address_label')} <span className="text-danger">*</span>
                      </label>
                      <textarea 
                        className="form-control" 
                        rows={3}
                        value={formData.address}
                        onChange={e => setFormData({...formData, address: e.target.value})}
                        required
                      ></textarea>
                    </div>
                    
                    <div className="col-md-12">
                      <label className="form-label d-flex justify-content-between">
                        <span>{t('customers.locations.google_maps_link')}</span>
                        <button type="button" className="btn btn-sm btn-outline-secondary py-0" onClick={handleGetCurrentLocation}>
                          <i className="bi bi-crosshair me-1"></i> {t('customers.locations.get_current_location')}
                        </button>
                      </label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.google_maps_link}
                        onChange={e => {
                          const value = e.target.value;
                          const coords = extractLatLngFromGoogleMapsLink(value);
                          if (coords) {
                            setFormData(prev => ({
                              ...prev,
                              google_maps_link: value,
                              latitude: coords.lat.toString(),
                              longitude: coords.lng.toString(),
                            }));
                          } else {
                            setFormData(prev => ({
                              ...prev,
                              google_maps_link: value,
                            }));
                          }
                        }}
                        placeholder="https://maps.google.com/..."
                      />
                      <div className="form-text">
                        {t('customers.locations.google_maps_hint', 'วางลิงก์ Google Maps เพื่อให้ระบบดึงพิกัดให้ (หรือกรอก Latitude/Longitude เอง)')}
                      </div>
                    </div>
                    
                    <div className="col-md-6">
                      <label className="form-label">{t('customers.fields.latitude')}</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        value={formData.latitude}
                        onChange={e => setFormData({...formData, latitude: e.target.value})}
                        disabled={!editingLocation}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{t('customers.fields.longitude')}</label>
                      <input 
                        type="number" 
                        step="any"
                        className="form-control" 
                        value={formData.longitude}
                        onChange={e => setFormData({...formData, longitude: e.target.value})}
                        disabled={!editingLocation}
                      />
                    </div>

                    <div className="col-md-6">
                      <label className="form-label">{t('customers.locations.contact_person')}</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.contact_person}
                        onChange={e => setFormData({...formData, contact_person: e.target.value})}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{t('customers.locations.contact_phone')}</label>
                      <input 
                        type="text" 
                        className="form-control" 
                        value={formData.contact_phone}
                        onChange={e => setFormData({...formData, contact_phone: e.target.value})}
                      />
                    </div>

                    <div className="col-md-12">
                      <div className="form-check">
                        <input 
                          className="form-check-input" 
                          type="checkbox" 
                          id="isDefaultCheck"
                          checked={formData.is_default}
                          onChange={e => setFormData({...formData, is_default: e.target.checked})}
                        />
                        <label className="form-check-label" htmlFor="isDefaultCheck">
                          {t('customers.locations.set_default')}
                        </label>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button type="button" className="btn btn-secondary" onClick={() => setShowModal(false)}>{t('common.cancel')}</button>
                  <button type="submit" className="btn btn-primary">{t('common.save')}</button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
