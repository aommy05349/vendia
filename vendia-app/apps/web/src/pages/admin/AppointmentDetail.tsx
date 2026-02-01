import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuthStore } from '@vendia/shared';
import Select from 'react-select';

interface Appointment {
  id: number;
  title: string;
  description: string | null;
  start_time: string;
  end_time: string | null;
  status: string;
  customer: {
    id: number;
    name: string;
    phone?: string;
    phone_number?: string;
    email?: string;
    line_id?: string;
    company_name?: string;
    tax_id?: string;
    address?: string;
  };
  technicians: {
    id: number;
    first_name: string;
    last_name: string;
    pivot: {
      is_lead: boolean;
    };
  }[];
  location_name: string | null;
  address: string;
  google_maps_link: string | null;
  latitude: string | null;
  longitude: string | null;
  order?: {
    id: number;
    code: string;
    status: string;
    items: {
        id: number;
        product_name: string; // Keep for fallback if needed, but primary is product.name
        quantity: number;
        price: number;
        product?: {
            id: number;
            name: string;
            images?: {
                id: number;
                image_path: string;
            }[];
        };
    }[];
  };
}

export const AppointmentDetail = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Manage Team Modal State
  const [showTeamModal, setShowTeamModal] = useState(false);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<{ id: number; is_lead: boolean }[]>([]);
  const [savingTeam, setSavingTeam] = useState(false);

  useEffect(() => {
    fetchAppointment();
    if (user?.role === 'admin') {
        fetchTechnicians();
    }
  }, [id]);

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/users?role=technician');
      setTechnicians(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch technicians', error);
    }
  };

  const fetchAppointment = async () => {
    try {
      const response = await api.get(`/appointments/${id}`);
      setAppointment(response.data);
    } catch (error) {
      console.error('Failed to fetch appointment', error);
      alert('Failed to load appointment details');
      navigate('/appointments');
    } finally {
      setLoading(false);
    }
  };

  const openTeamModal = () => {
    if (appointment) {
        setSelectedTechnicians(appointment.technicians.map(t => ({
            id: t.id,
            is_lead: t.pivot.is_lead
        })));
    }
    setShowTeamModal(true);
  };

  const handleTechnicianChange = (selectedOptions: any) => {
    const newSelected = selectedOptions.map((option: any) => {
        const existing = selectedTechnicians.find(t => t.id === option.value);
        return {
            id: option.value,
            is_lead: existing ? existing.is_lead : false
        };
    });
    setSelectedTechnicians(newSelected);
  };

  const setLeadTechnician = (techId: number) => {
    setSelectedTechnicians(prev => prev.map(t => ({
      ...t,
      is_lead: t.id === techId
    })));
  };

  const handleSaveTeam = async () => {
    setSavingTeam(true);
    try {
        await api.patch(`/appointments/${id}`, {
            technicians: selectedTechnicians
        });
        await fetchAppointment();
        setShowTeamModal(false);
    } catch (error) {
        console.error('Failed to update team', error);
        alert('Failed to update team');
    } finally {
        setSavingTeam(false);
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    if (!confirm(`Are you sure you want to update status to ${newStatus}?`)) return;

    setUpdating(true);
    try {
      const response = await api.patch(`/appointments/${id}`, { status: newStatus });
      setAppointment(response.data);
    } catch (error) {
      console.error('Failed to update status', error);
      alert('Failed to update status');
    } finally {
      setUpdating(false);
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'scheduled': return 'bg-primary';
      case 'en_route': return 'bg-info text-dark';
      case 'in_progress': return 'bg-warning text-dark';
      case 'completed': return 'bg-success';
      case 'cancelled': return 'bg-danger';
      default: return 'bg-secondary';
    }
  };

  if (loading) return <div className="p-4">Loading...</div>;
  if (!appointment) return <div className="p-4">Appointment not found</div>;

  const isTechnician = user?.role === 'technician';
  const isAdmin = user?.role === 'admin';
  
  // Logic for allowed status transitions
  const getNextActions = (currentStatus: string) => {
    const actions = [];
    
    // Technician actions
    if (isTechnician) {
      if (currentStatus === 'scheduled') {
        actions.push({ label: 'Start Travel (En Route)', value: 'en_route', btn: 'btn-info' });
      } else if (currentStatus === 'en_route') {
        actions.push({ label: 'Arrived / Start Job', value: 'in_progress', btn: 'btn-warning' });
      } else if (currentStatus === 'in_progress') {
        actions.push({ label: 'Complete Job', value: 'completed', btn: 'btn-success' });
      }
    }

    // Admin actions
    if (isAdmin) {
       // Allow Admin to force complete if needed? For now, keep it minimal as requested.
       if (currentStatus === 'in_progress') {
         actions.push({ label: 'Force Complete', value: 'completed', btn: 'btn-outline-success' });
       }
    }

    return actions;
  };

  const nextActions = getNextActions(appointment.status);
  const showCancelButton = isAdmin && appointment.status === 'scheduled';

  return (
    <div className="container-fluid p-4">
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="btn btn-outline-secondary mb-3">
          <i className="bi bi-arrow-left me-2"></i>Back
        </button>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h1>Appointment #{appointment.id}</h1>
            <span className={`badge ${getStatusBadge(appointment.status)} fs-6`}>
              {appointment.status.replace('_', ' ').toUpperCase()}
            </span>
          </div>
          {/* Status Actions */}
          <div className="d-flex gap-2">
             {nextActions.map(action => (
               <button
                 key={action.value}
                 className={`btn ${action.btn}`}
                 onClick={() => handleStatusUpdate(action.value)}
                 disabled={updating}
               >
                 {action.label}
               </button>
             ))}
          </div>
        </div>
      </div>

      <div className="row g-4">
        <div className="col-md-8">
          {/* Job Details */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Job Details</h5>
            </div>
            <div className="card-body">
              <h4 className="card-title">{appointment.title}</h4>
              <p className="text-muted mb-4">{appointment.description || 'No description provided'}</p>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>Start Time:</strong>
                  <div className="fs-5">{new Date(appointment.start_time).toLocaleString()}</div>
                </div>
                <div className="col-md-6">
                  <strong>End Time (Est.):</strong>
                  <div className="fs-5">
                    {appointment.end_time ? new Date(appointment.end_time).toLocaleString() : '-'}
                  </div>
                </div>
              </div>

              {appointment.order && (
                   <div className="mt-4 pt-3 border-top">
                       <div className="d-flex justify-content-between align-items-center mb-3">
                           <h6 className="mb-0">Products & Materials (Order #{appointment.order.code})</h6>
                           {appointment.order.status === 'pending' && (
                               <button 
                                   className="btn btn-sm btn-warning"
                                   onClick={() => navigate(`/pos?order_id=${appointment.order!.id}`)}
                               >
                                   <i className="bi bi-cart me-1"></i> Manage Order
                               </button>
                           )}
                       </div>
                       <div className="table-responsive">
                           <table className="table table-sm table-bordered">
                              <thead className="table-light">
                                  <tr>
                                      <th>Product</th>
                                      <th className="text-center" style={{ width: '100px' }}>Qty</th>
                                  </tr>
                              </thead>
                              <tbody>
                                  {appointment.order.items.map(item => (
                                      <tr key={item.id}>
                                          <td>
                                              <div className="d-flex align-items-center">
                                                  {item.product?.images && item.product.images.length > 0 && (
                                                      <img 
                                                          src={item.product.images[0].image_path} 
                                                          alt="" 
                                                          className="me-2 rounded" 
                                                          style={{ width: '30px', height: '30px', objectFit: 'cover' }}
                                                      />
                                                  )}
                                                  <span>{item.product?.name || item.product_name || 'Unknown Product'}</span>
                                              </div>
                                          </td>
                                          <td className="text-center">{item.quantity}</td>
                                      </tr>
                                  ))}
                              </tbody>
                          </table>
                      </div>
                  </div>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Location</h5>
            </div>
            <div className="card-body">
              <h5>{appointment.location_name || 'Customer Location'}</h5>
              <p className="fs-5">{appointment.address}</p>
              {appointment.google_maps_link && (
                <a 
                  href={appointment.google_maps_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary"
                >
                  <i className="bi bi-geo-alt me-2"></i>Open in Google Maps
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {/* Customer Info */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">Customer</h5>
            </div>
            <div className="card-body">
              <h5>{appointment.customer.name}</h5>
              {appointment.customer.company_name && (
                <p className="text-muted mb-2">
                  <i className="bi bi-building me-2"></i>{appointment.customer.company_name}
                </p>
              )}
              
              <hr className="my-2" />

              {(appointment.customer.phone || appointment.customer.phone_number) && (
                <p className="mb-1">
                  <i className="bi bi-telephone me-2"></i>
                  <a href={`tel:${appointment.customer.phone || appointment.customer.phone_number}`}>
                    {appointment.customer.phone || appointment.customer.phone_number}
                  </a>
                </p>
              )}

              {appointment.customer.email && (
                <p className="mb-1">
                  <i className="bi bi-envelope me-2"></i>
                  <a href={`mailto:${appointment.customer.email}`}>{appointment.customer.email}</a>
                </p>
              )}

              {appointment.customer.line_id && (
                <p className="mb-1">
                  <i className="bi bi-chat-dots me-2"></i>Line: {appointment.customer.line_id}
                </p>
              )}

              {appointment.customer.tax_id && (
                 <p className="mb-1">
                   <i className="bi bi-receipt me-2"></i>Tax ID: {appointment.customer.tax_id}
                 </p>
              )}
              
              {appointment.customer.address && (
                <div className="mt-2 pt-2 border-top">
                   <small className="text-muted d-block mb-1">Main Address:</small>
                   <span>{appointment.customer.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Technicians */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">Assigned Team</h5>
              {isAdmin && appointment.status === 'scheduled' && (
                  <button className="btn btn-sm btn-outline-primary" onClick={openTeamModal}>
                      Manage Team
                  </button>
              )}
            </div>
            <ul className="list-group list-group-flush">
              {appointment.technicians.length === 0 && <li className="list-group-item text-muted">No technicians assigned</li>}
              {appointment.technicians.map(tech => (
                <li key={tech.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    {tech.first_name} {tech.last_name}
                    {tech.pivot.is_lead && (
                      <span className="badge bg-primary ms-2">Team Lead</span>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          </div>

          {/* Admin Actions */}
          {showCancelButton && (
            <div className="card border-danger mb-4">
                <div className="card-header bg-danger text-white">
                    <h5 className="mb-0">Danger Zone</h5>
                </div>
                <div className="card-body">
                    <p className="card-text text-muted small">Cancelling this appointment will stop all progress and notify the team.</p>
                    <button 
                        className="btn btn-outline-danger w-100" 
                        onClick={() => handleStatusUpdate('cancelled')}
                        disabled={updating}
                    >
                        Cancel Appointment
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Manage Team Modal */}
      {showTeamModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Manage Team</h5>
                <button type="button" className="btn-close" onClick={() => setShowTeamModal(false)}></button>
              </div>
              <div className="modal-body">
                 <div className="mb-3">
                     <label className="form-label">Select Technicians</label>
                     <Select
                         isMulti
                         options={technicians.map(t => ({
                             value: t.id,
                             label: `${t.first_name ? t.first_name + ' ' + t.last_name : t.name}`
                         }))}
                         value={selectedTechnicians.map(t => {
                             const tech = technicians.find(tech => tech.id === t.id);
                             return {
                                 value: t.id,
                                 label: tech ? `${tech.first_name ? tech.first_name + ' ' + tech.last_name : tech.name}` : 'Unknown'
                             };
                         })}
                         onChange={handleTechnicianChange}
                         className="mb-3"
                     />
                 </div>
                 
                 {selectedTechnicians.length > 0 && (
                    <div className="card bg-light border-0">
                        <div className="card-body p-2">
                            <small className="d-block mb-2 text-muted">Select a Team Lead:</small>
                            <ul className="list-group">
                                {selectedTechnicians.map(st => {
                                    const tech = technicians.find(t => t.id === st.id);
                                    if (!tech) return null;
                                    return (
                                        <li key={st.id} className="list-group-item d-flex justify-content-between align-items-center py-2">
                                            <span>{tech.first_name ? `${tech.first_name} ${tech.last_name}` : tech.name}</span>
                                            <div className="form-check form-switch mb-0">
                                                <input
                                                    className="form-check-input"
                                                    type="checkbox"
                                                    checked={st.is_lead}
                                                    onChange={() => setLeadTechnician(st.id)}
                                                    id={`modal-lead-${st.id}`}
                                                />
                                                <label className="form-check-label small" htmlFor={`modal-lead-${st.id}`}>
                                                    Lead
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
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowTeamModal(false)}>Cancel</button>
                <button type="button" className="btn btn-primary" onClick={handleSaveTeam} disabled={savingTeam}>
                  {savingTeam ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
