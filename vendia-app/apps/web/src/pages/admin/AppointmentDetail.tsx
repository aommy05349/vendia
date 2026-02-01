import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuthStore } from '@vendia/shared';
import Select from 'react-select';
import { useTranslation } from 'react-i18next';

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
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  const [appointment, setAppointment] = useState<Appointment | null>(null);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState(false);

  // Confirmation Modal State
  const [showCompleteModal, setShowCompleteModal] = useState(false);
  const [pendingStatusUpdate, setPendingStatusUpdate] = useState<string | null>(null);

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
      alert(t('appointments.detail.load_failed'));
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
        // Optional: show success message if needed, but UI updates automatically
    } catch (error) {
        console.error('Failed to update team', error);
        alert(t('appointments.detail.update_failed'));
    } finally {
        setSavingTeam(false);
    }
  };

  const handleStatusUpdateClick = (newStatus: string) => {
    if (newStatus === 'completed') {
        setPendingStatusUpdate(newStatus);
        setShowCompleteModal(true);
    } else {
        // For other statuses, maybe just a simple confirm or direct update?
        // Let's keep simple confirm for others to avoid too much UI overhead, 
        // or just do it directly. The user originally had a confirm for everything.
        // Translating the confirm message might be tricky if dynamic, let's keep it simple or use a generic confirm.
        if (confirm(t('common.confirm') + '?')) {
            handleStatusUpdate(newStatus);
        }
    }
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    try {
      const response = await api.patch(`/appointments/${id}`, { status: newStatus });
      setAppointment(response.data);
      setShowCompleteModal(false); // Close modal if open
    } catch (error) {
      console.error('Failed to update status', error);
      alert(t('appointments.detail.status_update_failed'));
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

  if (loading) return <div className="p-4">{t('common.loading')}</div>;
  if (!appointment) return <div className="p-4">{t('appointments.detail.load_failed')}</div>;

  const isTechnician = user?.role === 'technician';
  const isAdmin = user?.role === 'admin';
  
  // Logic for allowed status transitions
  const getNextActions = (currentStatus: string) => {
    const actions = [];
    
    // Technician actions
    if (isTechnician) {
      if (currentStatus === 'scheduled') {
        actions.push({ label: t('appointments.detail.actions.start_travel'), value: 'en_route', btn: 'btn-info' });
      } else if (currentStatus === 'en_route') {
        actions.push({ label: t('appointments.detail.actions.arrived'), value: 'in_progress', btn: 'btn-warning' });
      } else if (currentStatus === 'in_progress') {
        actions.push({ label: t('appointments.detail.actions.complete'), value: 'completed', btn: 'btn-success' });
      }
    }

    // Admin actions
    if (isAdmin) {
       // Allow Admin to force complete if needed? For now, keep it minimal as requested.
       if (currentStatus === 'in_progress') {
         actions.push({ label: t('appointments.detail.actions.force_complete'), value: 'completed', btn: 'btn-outline-success' });
       }
    }

    return actions;
  };

  const nextActions = getNextActions(appointment.status);
  const showCancelButton = isAdmin && appointment.status === 'scheduled';
  
  const showPaymentWarning = appointment.order?.status === 'pending';

  return (
    <div className="container-fluid p-4">
      <div className="mb-4">
        <button onClick={() => navigate(-1)} className="btn btn-outline-secondary mb-3">
          <i className="bi bi-arrow-left me-2"></i>{t('appointments.detail.back')}
        </button>
        <div className="d-flex justify-content-between align-items-start">
          <div>
            <h1>{t('appointments.detail.title', { id: appointment.id })}</h1>
            <span className={`badge ${getStatusBadge(appointment.status)} fs-6`}>
              {t(`appointments.status.${appointment.status}`)}
            </span>
            {appointment.status === 'completed' && showPaymentWarning && (
                 <div className="alert alert-warning mt-2 d-inline-block py-1 px-2 mb-0 ms-2">
                    <i className="bi bi-exclamation-triangle-fill me-1"></i> {t('appointments.detail.unpaid_warning')}
                 </div>
            )}
          </div>
          {/* Status Actions */}
          <div className="d-flex gap-2 align-items-center">
             {nextActions.some(a => a.value === 'completed') && showPaymentWarning && (
                 <span className="text-danger small fw-bold me-2">
                    <i className="bi bi-exclamation-circle me-1"></i>
                    {t('appointments.detail.unpaid_warning')}
                 </span>
             )}
             {nextActions.map(action => (
               <button
                 key={action.value}
                 className={`btn ${action.btn}`}
                 onClick={() => {
                     if (action.value === 'completed' && showPaymentWarning) {
                         if(!confirm(t('appointments.detail.unpaid_confirm'))) return;
                     }
                     handleStatusUpdate(action.value);
                 }}
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
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{t('appointments.detail.job_details')}</h5>
              {isAdmin && (
                <button 
                    className="btn btn-sm btn-outline-primary" 
                    onClick={() => navigate(`/appointments/${appointment.id}/edit`)}
                >
                    <i className="bi bi-pencil me-1"></i>{t('common.edit')}
                </button>
              )}
            </div>
            <div className="card-body">
              <h4 className="card-title">{appointment.title}</h4>
              <p className="text-muted mb-4">{appointment.description || t('appointments.detail.no_description')}</p>
              
              <div className="row mb-3">
                <div className="col-md-6">
                  <strong>{t('appointments.detail.start_time')}:</strong>
                  <div className="fs-5">{new Date(appointment.start_time).toLocaleString()}</div>
                </div>
                <div className="col-md-6">
                  <strong>{t('appointments.detail.end_time')}:</strong>
                  <div className="fs-5">
                    {appointment.end_time ? new Date(appointment.end_time).toLocaleString() : '-'}
                  </div>
                </div>
              </div>

              {appointment.order && (
                   <div className="mt-4 pt-3 border-top">
                       <div className="d-flex justify-content-between align-items-center mb-3">
                           <h6 className="mb-0">{t('appointments.detail.products_materials', { code: appointment.order.code })}</h6>
                           {['pending', 'quotation'].includes(appointment.order.status) ? (
                               <button 
                                   className="btn btn-sm btn-warning"
                                   onClick={() => navigate(`/pos?order_id=${appointment.order!.id}`)}
                               >
                                   <i className="bi bi-pencil-square me-1"></i>{t('appointments.detail.edit_order')}
                               </button>
                           ) : (
                               <button 
                                   className="btn btn-sm btn-outline-primary"
                                   onClick={() => navigate(`/pos?customer_id=${appointment.customer.id}&parent_order_id=${appointment.order!.id}`)}
                                   title="Create a new supplementary order for additional costs"
                               >
                                   <i className="bi bi-plus-circle me-1"></i>{t('appointments.detail.add_extra_charge')}
                               </button>
                           )}
                       </div>
                       <div className="table-responsive">
                           <table className="table table-sm table-bordered">
                              <thead className="table-light">
                                  <tr>
                                      <th>{t('appointments.detail.product')}</th>
                                      <th className="text-center" style={{ width: '100px' }}>{t('appointments.detail.qty')}</th>
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
                                                  <span>{item.product?.name || item.product_name || t('appointments.detail.unknown_product')}</span>
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
              <h5 className="mb-0">{t('appointments.detail.location')}</h5>
            </div>
            <div className="card-body">
              <h5>{appointment.location_name || t('appointments.detail.customer_location')}</h5>
              <p className="fs-5">{appointment.address}</p>
              {appointment.google_maps_link && (
                <a 
                  href={appointment.google_maps_link} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="btn btn-outline-primary"
                >
                  <i className="bi bi-geo-alt me-2"></i>{t('appointments.detail.open_maps')}
                </a>
              )}
            </div>
          </div>
        </div>

        <div className="col-md-4">
          {/* Customer Info */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">{t('appointments.detail.customer_info')}</h5>
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
                   <i className="bi bi-receipt me-2"></i>{t('customers.tax_id')}: {appointment.customer.tax_id}
                 </p>
              )}
              
              {appointment.customer.address && (
                <div className="mt-2 pt-2 border-top">
                   <small className="text-muted d-block mb-1">{t('appointments.detail.main_address')}:</small>
                   <span>{appointment.customer.address}</span>
                </div>
              )}
            </div>
          </div>

          {/* Technicians */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <h5 className="mb-0">{t('appointments.detail.assigned_team')}</h5>
              {isAdmin && appointment.status === 'scheduled' && (
                  <button className="btn btn-sm btn-outline-primary" onClick={openTeamModal}>
                      {t('appointments.detail.manage_team')}
                  </button>
              )}
            </div>
            <ul className="list-group list-group-flush">
              {appointment.technicians.length === 0 && <li className="list-group-item text-muted">{t('appointments.detail.no_technicians')}</li>}
              {appointment.technicians.map(tech => (
                <li key={tech.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    {tech.first_name} {tech.last_name}
                    {tech.pivot.is_lead && (
                      <span className="badge bg-primary ms-2">{t('appointments.detail.team_lead')}</span>
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
                    <h5 className="mb-0">{t('appointments.detail.danger_zone')}</h5>
                </div>
                <div className="card-body">
                    <p className="card-text text-muted small">{t('appointments.detail.cancel_warning')}</p>
                    <button 
                        className="btn btn-outline-danger w-100" 
                        onClick={() => handleStatusUpdate('cancelled')}
                        disabled={updating}
                    >
                        {t('appointments.detail.cancel_btn')}
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>

      {/* Manage Team Modal */}
      {showTeamModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('appointments.detail.manage_team_modal')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowTeamModal(false)}></button>
              </div>
              <div className="modal-body">
                 <div className="mb-3">
                     <label className="form-label">{t('appointments.detail.select_technicians')}</label>
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
                         menuPortalTarget={document.body} 
                         styles={{ menuPortal: base => ({ ...base, zIndex: 9999 }) }}
                     />
                 </div>
                 
                 {selectedTechnicians.length > 0 && (
                    <div className="card bg-light border-0">
                        <div className="card-body p-2">
                            <small className="d-block mb-2 text-muted">{t('appointments.detail.select_lead')}:</small>
                            <ul className="list-group">
                                {selectedTechnicians.map(st => {
                                    const tech = technicians.find(t => t.id === st.id);
                                    if (!tech) return null;
                                    return (
                                        <li key={st.id} className="list-group-item d-flex justify-content-between align-items-center py-2">
                                            <span>{tech.first_name} {tech.last_name}</span>
                                            <div className="form-check form-switch">
                                                <input 
                                                    className="form-check-input" 
                                                    type="checkbox" 
                                                    checked={st.is_lead}
                                                    onChange={() => setLeadTechnician(st.id)}
                                                />
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
                <button type="button" className="btn btn-secondary" onClick={() => setShowTeamModal(false)}>{t('actions.cancel')}</button>
                <button 
                    type="button" 
                    className="btn btn-primary" 
                    onClick={handleSaveTeam}
                    disabled={savingTeam}
                >
                    {savingTeam ? t('appointments.detail.saving') : t('appointments.detail.save_team')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
