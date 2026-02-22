import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api, useAuthStore } from '@vendia/shared';
import Select from 'react-select';
import { useTranslation } from 'react-i18next';
import { EditOrderModal } from './EditOrderModal';
import { CreateSupplementaryOrderModal } from './CreateSupplementaryOrderModal';

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
  team?: {
    id: number;
    name: string;
  } | null;
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
    total: string;
    items: {
      id: number;
      product_name: string;
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
    children?: {
      id: number;
      code: string;
      status: string;
      total: string;
      items: {
        id: number;
        product_name: string;
        quantity: number;
        price: number;
        product?: {
          id: number;
          name: string;
        };
      }[];
    }[];
  };
  admin_notes?: string | null;
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
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);
  const [applyingTeam, setApplyingTeam] = useState(false);
  const [teamPreview, setTeamPreview] = useState<
    { id: number; name: string; is_lead: boolean }[]
  >([]);
  const [teamPreviewLoading, setTeamPreviewLoading] = useState(false);

  const [isEditingJob, setIsEditingJob] = useState(false);
  const [savingJob, setSavingJob] = useState(false);
  const [orders, setOrders] = useState<any[]>([]);
  const [customerLocations, setCustomerLocations] = useState<any[]>([]);
  const [jobLocationId, setJobLocationId] = useState<string>('manual');
  const [editingOrderId, setEditingOrderId] = useState<number | null>(null);
  const [showCreateOrderModal, setShowCreateOrderModal] = useState(false);
  const [payingOrder, setPayingOrder] = useState<any | null>(null);
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash');
  const [receivedAmount, setReceivedAmount] = useState('');
  const [paymentChange, setPaymentChange] = useState<number | null>(null);
  const [orderToCancel, setOrderToCancel] = useState<any | null>(null);
  const [jobForm, setJobForm] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    admin_notes: '',
    location_name: '',
    address: '',
    latitude: '',
    longitude: '',
    google_maps_link: '',
    contact_name: '',
    contact_phone: '',
    order_id: '',
  });

  const combinedOrderItems = useMemo<
    {
      item: {
        id: number;
        product_name: string;
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
      };
      orderCode: string;
      orderId: number;
      isMain: boolean;
    }[]
  >(() => {
    if (!appointment?.order) return [];
    const baseItems = (appointment.order.items || []).map(item => ({
      item,
      orderCode: appointment.order!.code,
      orderId: appointment.order!.id,
      isMain: true,
    }));
    const childItems = (appointment.order.children || [])
      .filter(child => child.status !== 'cancelled')
      .flatMap(child =>
        (child.items || []).map(item => ({
          item: {
            ...item,
            product: item.product
              ? {
                  id: item.product.id,
                  name: item.product.name,
                  images: (item as any).product?.images,
                }
              : undefined,
          },
          orderCode: child.code,
          orderId: child.id,
          isMain: false,
        }))
      );
    return [...baseItems, ...childItems];
  }, [appointment]);

  const pendingSupplementaryOrder = useMemo(
    () =>
      appointment?.order?.children
        ? appointment.order.children.find(child => child.status === 'pending') || null
        : null,
    [appointment]
  );

  useEffect(() => {
    if (payingOrder && paymentMethod === 'cash' && receivedAmount) {
      const received = parseFloat(receivedAmount);
      const totalAmount = parseFloat(payingOrder.total);
      setPaymentChange(received - totalAmount);
    } else {
      setPaymentChange(null);
    }
  }, [payingOrder, paymentMethod, receivedAmount]);

  const handleProcessPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!payingOrder) return;
    try {
      await api.put(`/orders/${payingOrder.id}`, {
        status: 'completed',
        payment_method: paymentMethod,
      });
      setPayingOrder(null);
      setReceivedAmount('');
      setPaymentChange(null);
      fetchAppointment();
      setSuccessMessage(t('orders.payment_success'));
    } catch (error) {
      console.error(error);
      setErrorMessage(t('orders.payment_failed'));
    }
  };

  const handleCancelOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderToCancel) return;
    try {
      await api.put(`/orders/${orderToCancel.id}`, { status: 'cancelled' });
      setOrderToCancel(null);
      fetchAppointment();
      setSuccessMessage(t('orders.update_success'));
    } catch (error) {
      console.error('Failed to cancel order:', error);
      setErrorMessage(t('orders.update_failed'));
    }
  };

  const formatForInput = (dateString: string | null) => {
    if (!dateString) return '';
    const safeDateString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
    const date = new Date(safeDateString);
    if (isNaN(date.getTime())) return '';
    const pad = (n: number) => (n < 10 ? '0' + n : n);
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  useEffect(() => {
    fetchAppointment();
    if (user?.role === 'admin') {
      fetchTeams();
    }
  }, [id]);

  const fetchTeams = async () => {
    try {
      const response = await api.get('/teams');
      const data = response.data || [];
      setTeams(
        data
          .filter((t: any) => t.is_active)
          .map((t: any) => ({ id: t.id, name: t.name })),
      );
    } catch (error) {
      console.error('Failed to fetch teams', error);
    }
  };

  const loadTeamPreview = async (teamId: number | null) => {
    if (!teamId) {
      setTeamPreview([]);
      return;
    }
    setTeamPreviewLoading(true);
    try {
      const res = await api.get(`/teams/${teamId}`);
      const data = res.data;
      const members = Array.isArray(data.members) ? data.members : [];
      setTeamPreview(
        members.map((m: any) => ({
          id: m.user_id,
          name: m.user
            ? m.user.first_name
              ? `${m.user.first_name} ${m.user.last_name}`
              : m.user.name
            : '',
          is_lead: !!m.is_lead,
        })),
      );
    } catch (error) {
      console.error('Failed to load team preview', error);
      setTeamPreview([]);
    } finally {
      setTeamPreviewLoading(false);
    }
  };

  const fetchAppointment = async () => {
    try {
      const response = await api.get(`/appointments/${id}`);
      const appt: Appointment = response.data;
      setAppointment(appt);
      if (!isEditingJob) {
        setJobForm({
          title: appt.title,
          description: appt.description || '',
          start_time: formatForInput(appt.start_time),
          end_time: formatForInput(appt.end_time),
          admin_notes: appt.admin_notes || '',
          location_name: appt.location_name || '',
          address: appt.address,
          latitude: appt.latitude ? String(appt.latitude) : '',
          longitude: appt.longitude ? String(appt.longitude) : '',
          google_maps_link: appt.google_maps_link || '',
          contact_name: appt.customer?.name || '',
          contact_phone: appt.customer?.phone || appt.customer?.phone_number || '',
          order_id: appt.order ? String(appt.order.id) : '',
        });
        setJobLocationId('manual');
      }
    } catch (error) {
      console.error('Failed to fetch appointment', error);
      navigate('/appointments', { state: { appointmentDetailLoadError: true } });
    } finally {
      setLoading(false);
    }
  };

  const openTeamModal = () => {
    const teamId = appointment?.team ? appointment.team.id : null;
    setSelectedTeamId(teamId);
    setShowTeamModal(true);
    loadTeamPreview(teamId);
  };

  const handleApplyTeam = async () => {
    if (!selectedTeamId) return;
    setApplyingTeam(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const teamResponse = await api.get(`/teams/${selectedTeamId}`);
      const teamData = teamResponse.data;
      const members = Array.isArray(teamData.members) ? teamData.members : [];
      const techniciansPayload = members.map((m: any) => ({
        id: m.user_id,
        is_lead: !!m.is_lead,
      }));

      await api.patch(`/appointments/${id}`, {
        team_id: selectedTeamId,
        technicians: techniciansPayload,
      });
      await fetchAppointment();
      setSuccessMessage(t('appointments.detail.update_success', 'บันทึกข้อมูลสำเร็จ'));
    } catch (error) {
      console.error('Failed to apply team', error);
      setErrorMessage(t('appointments.detail.update_failed'));
    } finally {
      setApplyingTeam(false);
    }
  };

  const handleStatusUpdateClick = (newStatus: string) => {
    setPendingStatusUpdate(newStatus);
    setShowCompleteModal(true);
  };

  const handleStatusUpdate = async (newStatus: string) => {
    setUpdating(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      await api.patch(`/appointments/${id}`, { status: newStatus });
      setAppointment(prev =>
        prev
          ? {
              ...prev,
              status: newStatus,
            }
          : prev
      );
      setShowCompleteModal(false);
      setPendingStatusUpdate(null);
      setSuccessMessage(t('appointments.detail.status_update_success', 'อัปเดตสถานะนัดหมายสำเร็จ'));
    } catch (error) {
      console.error('Failed to update status', error);
      setErrorMessage(t('appointments.detail.status_update_failed'));
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

  const handleJobStartTimeChange = (value: string) => {
    setJobForm(prev => ({
      ...prev,
      start_time: value,
      end_time: prev.end_time && prev.end_time < value ? '' : prev.end_time,
    }));
  };

  const fetchCustomerOrders = async (customerId: number, currentOrderId?: number) => {
    try {
      let orderQuery = `/orders?customer_id=${customerId}&exclude_has_appointment=true&status=pending,completed`;
      if (currentOrderId) {
        orderQuery += `&include_order_id=${currentOrderId}`;
      }
      const [ordersRes, locationsRes] = await Promise.all([
        api.get(orderQuery),
        api.get(`/users/${customerId}/locations`),
      ]);
      setOrders(ordersRes.data.data || ordersRes.data);
      setCustomerLocations(locationsRes.data || []);
    } catch (error) {
      console.error('Failed to fetch customer orders', error);
    }
  };

  const handleJobLocationChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const locId = e.target.value;
    setJobLocationId(locId);

    if (locId !== 'manual') {
      const loc = customerLocations.find(l => l.id === parseInt(locId, 10));
      if (loc) {
        setJobForm(prev => ({
          ...prev,
          location_name: loc.name || '',
          address: loc.address,
          latitude: loc.latitude ? String(loc.latitude) : '',
          longitude: loc.longitude ? String(loc.longitude) : '',
          google_maps_link: loc.google_maps_link || '',
          contact_name: loc.contact_person || '',
          contact_phone: loc.contact_phone || '',
        }));
      }
    } else if (appointment) {
      setJobForm(prev => ({
        ...prev,
        location_name: appointment.location_name || '',
        address: appointment.address,
        latitude: appointment.latitude ? String(appointment.latitude) : '',
        longitude: appointment.longitude ? String(appointment.longitude) : '',
        google_maps_link: appointment.google_maps_link || '',
        contact_name: appointment.customer?.name || '',
        contact_phone: appointment.customer?.phone || appointment.customer?.phone_number || '',
      }));
    }
  };

  const handleSaveJob = async () => {
    if (!appointment) return;
    setSavingJob(true);
    setErrorMessage(null);
    setSuccessMessage(null);
    try {
      const payload = {
        title: jobForm.title,
        description: jobForm.description,
        start_time: jobForm.start_time,
        end_time: jobForm.end_time || null,
        admin_notes: jobForm.admin_notes,
        location_name: jobForm.location_name || null,
        address: jobForm.address,
        latitude: jobForm.latitude ? Number(jobForm.latitude) : null,
        longitude: jobForm.longitude ? Number(jobForm.longitude) : null,
        google_maps_link: jobForm.google_maps_link || null,
        contact_name: jobForm.contact_name || null,
        contact_phone: jobForm.contact_phone || null,
        order_id: jobForm.order_id ? Number(jobForm.order_id) : null,
      };
      await api.patch(`/appointments/${appointment.id}`, payload);
      await fetchAppointment();
      setIsEditingJob(false);
      setSuccessMessage(t('appointments.detail.update_success', 'บันทึกข้อมูลสำเร็จ'));
    } catch (error: any) {
      console.error('Failed to update appointment', error);
      if (error.response?.status === 422 && error.response.data?.errors) {
        const errors = error.response.data.errors;
        const firstKey = Object.keys(errors)[0];
        const firstMessage = errors[firstKey]?.[0];
        setErrorMessage(firstMessage || t('appointments.detail.update_failed'));
      } else {
        setErrorMessage(t('appointments.detail.update_failed'));
      }
    } finally {
      setSavingJob(false);
    }
  };

  if (loading) return <div className="p-4">{t('common.loading')}</div>;
  if (!appointment) return <div className="p-4">{t('appointments.detail.load_failed')}</div>;

  const isTechnician = user?.role === 'technician';
  const isAdmin = user?.role === 'admin';
  const isLeadTechnician =
    isTechnician &&
    appointment.technicians.some(
      tech => tech.id === user?.id && tech.pivot?.is_lead
    );
  const canSeePrices = isAdmin || isLeadTechnician;
  
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
      {successMessage && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}
          role="dialog"
        >
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content border-0">
              <div className="modal-body text-center p-4">
                <div className="text-success mb-3" style={{ fontSize: '3rem' }}>
                  <i className="bi bi-check-circle-fill"></i>
                </div>
                <h5 className="mb-2">
                  {t('common.success_title', 'สำเร็จ')}
                </h5>
                <p className="mb-0">{successMessage}</p>
              </div>
              <div className="modal-footer border-0 justify-content-center">
                <button
                  type="button"
                  className="btn btn-success"
                  onClick={() => setSuccessMessage(null)}
                >
                  {t('common.ok', 'ตกลง')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {errorMessage && (
        <div className="alert alert-danger alert-dismissible fade show mb-3" role="alert">
          {errorMessage}
          <button
            type="button"
            className="btn-close"
            onClick={() => setErrorMessage(null)}
          ></button>
        </div>
      )}
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
                 onClick={() => handleStatusUpdateClick(action.value)}
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
              {isAdmin && !isEditingJob && (
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={() => {
                    setJobForm(prev => ({
                      ...prev,
                      title: appointment.title,
                      description: appointment.description || '',
                      start_time: formatForInput(appointment.start_time),
                      end_time: formatForInput(appointment.end_time),
                      admin_notes: appointment.admin_notes || '',
                      location_name: appointment.location_name || '',
                      address: appointment.address,
                      latitude: appointment.latitude ? String(appointment.latitude) : '',
                      longitude: appointment.longitude ? String(appointment.longitude) : '',
                      google_maps_link: appointment.google_maps_link || '',
                      contact_name: appointment.customer?.name || '',
                      contact_phone: appointment.customer?.phone || appointment.customer?.phone_number || '',
                      order_id: appointment.order ? String(appointment.order.id) : '',
                    }));
                    fetchCustomerOrders(appointment.customer.id, appointment.order?.id);
                    setIsEditingJob(true);
                  }}
                >
                  <i className="bi bi-pencil me-1"></i>{t('common.edit')}
                </button>
              )}
            </div>
            <div className="card-body">
              {isEditingJob ? (
                <>
                  <div className="mb-3">
                    <label className="form-label">
                      {t('appointments.create.title_label')} <span className="text-danger">*</span>
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      required
                      value={jobForm.title}
                      onChange={e => setJobForm(prev => ({ ...prev, title: e.target.value }))}
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">{t('appointments.create.description')}</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={jobForm.description}
                      onChange={e => setJobForm(prev => ({ ...prev, description: e.target.value }))}
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
                        value={jobForm.start_time}
                        onChange={e => handleJobStartTimeChange(e.target.value)}
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">{t('appointments.create.end_time')}</label>
                      <input
                        type="datetime-local"
                        className="form-control"
                        value={jobForm.end_time}
                        min={jobForm.start_time || undefined}
                        onChange={e => setJobForm(prev => ({ ...prev, end_time: e.target.value }))}
                      />
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">{t('appointments.create.admin_notes')}</label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={jobForm.admin_notes}
                      onChange={e => setJobForm(prev => ({ ...prev, admin_notes: e.target.value }))}
                    ></textarea>
                  </div>

                  {isAdmin && (
                    <div className="mb-3">
                      <label className="form-label">{t('appointments.create.link_order')}</label>
                      <select
                        className="form-select"
                        value={jobForm.order_id}
                        onChange={e =>
                          setJobForm(prev => ({ ...prev, order_id: e.target.value }))
                        }
                      >
                        <option value="">{t('appointments.create.select_order')}</option>
                        {orders.map(order => (
                          <option key={order.id} value={order.id}>
                            #{order.code} ({order.status})
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                </>
              ) : (
                <>
                  <h4 className="card-title">{appointment.title}</h4>
                  <p className="text-muted mb-4">
                    {appointment.description || t('appointments.detail.no_description')}
                  </p>

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
                </>
              )}
            </div>
          </div>

          {/* Location */}
          <div className="card mb-4">
            <div className="card-header">
              <h5 className="mb-0">{t('appointments.detail.location')}</h5>
            </div>
            <div className="card-body">
              {isEditingJob ? (
                <>
                  {appointment?.customer && (
                    <div className="mb-3">
                      <label className="form-label">
                        {t('appointments.create.select_location')}
                      </label>
                      <select
                        className="form-select"
                        value={jobLocationId}
                        onChange={handleJobLocationChange}
                      >
                        <option value="manual">{t('appointments.create.manual_location')}</option>
                        {customerLocations.map(loc => (
                          <option key={loc.id} value={loc.id}>
                            {loc.name ? `${loc.name} - ` : ''}
                            {loc.address.substring(0, 50)}...
                          </option>
                        ))}
                      </select>
                    </div>
                  )}
                  <div className="mb-3">
                    <label className="form-label">
                      {t('appointments.create.location_name')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={jobForm.location_name}
                      onChange={e => setJobForm(prev => ({ ...prev, location_name: e.target.value }))}
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      {t('appointments.create.address')} <span className="text-danger">*</span>
                    </label>
                    <textarea
                      className="form-control"
                      rows={3}
                      value={jobForm.address}
                      onChange={e => setJobForm(prev => ({ ...prev, address: e.target.value }))}
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
                        value={jobForm.google_maps_link}
                        onChange={e =>
                          setJobForm(prev => ({ ...prev, google_maps_link: e.target.value }))
                        }
                      />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">
                        {t('appointments.create.contact_person')}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={jobForm.contact_name}
                        onChange={e =>
                          setJobForm(prev => ({ ...prev, contact_name: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                  <div className="row">
                    <div className="col-md-6">
                      <label className="form-label">
                        {t('appointments.create.contact_phone')}
                      </label>
                      <input
                        type="text"
                        className="form-control"
                        value={jobForm.contact_phone}
                        onChange={e =>
                          setJobForm(prev => ({ ...prev, contact_phone: e.target.value }))
                        }
                      />
                    </div>
                  </div>
                </>
              ) : (
                <>
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
                </>
              )}
            </div>
          </div>

          {isEditingJob && (
            <div className="d-flex justify-content-end gap-2 mb-4">
              <button
                type="button"
                className="btn btn-secondary"
                onClick={() => {
                  if (appointment) {
                    setJobForm(prev => ({
                      ...prev,
                      title: appointment.title,
                      description: appointment.description || '',
                      start_time: formatForInput(appointment.start_time),
                      end_time: formatForInput(appointment.end_time),
                      admin_notes: appointment.admin_notes || '',
                      location_name: appointment.location_name || '',
                      address: appointment.address,
                      latitude: appointment.latitude ? String(appointment.latitude) : '',
                      longitude: appointment.longitude ? String(appointment.longitude) : '',
                      google_maps_link: appointment.google_maps_link || '',
                      contact_name: appointment.customer?.name || '',
                      contact_phone: appointment.customer?.phone || appointment.customer?.phone_number || '',
                      order_id: appointment.order ? String(appointment.order.id) : '',
                    }));
                  }
                  setIsEditingJob(false);
                }}
              >
                {t('appointments.create.cancel')}
              </button>
              <button
                type="button"
                className="btn btn-primary"
                onClick={handleSaveJob}
                disabled={savingJob}
              >
                {savingJob ? t('appointments.edit.saving') : t('appointments.edit.save')}
              </button>
            </div>
          )}

          {appointment.order && (
            <>
              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    {t('appointments.detail.products_materials', { code: appointment.order.code })}
                  </h5>
                  <div className="d-flex align-items-center gap-2">
                    {canSeePrices && (
                      <span className="badge bg-light text-dark">
                        ฿
                        {parseFloat(appointment.order.total).toLocaleString('en-US', {
                          minimumFractionDigits: 2,
                          maximumFractionDigits: 2,
                        })}
                      </span>
                    )}
                    {(isAdmin || isLeadTechnician) &&
                      (['pending', 'quotation'].includes(appointment.order.status) ? (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => setEditingOrderId(appointment.order!.id)}
                        >
                          <i className="bi bi-pencil-square me-1"></i>
                          {t('appointments.detail.edit_order')}
                        </button>
                      ) : pendingSupplementaryOrder ? (
                        <button
                          className="btn btn-sm btn-warning"
                          onClick={() => setEditingOrderId(pendingSupplementaryOrder.id)}
                          title="Edit existing supplementary order"
                        >
                          <i className="bi bi-pencil-square me-1"></i>
                          {t(
                            'appointments.detail.edit_extra_charge',
                            'แก้ไขค่าใช้จ่ายเพิ่มเติม'
                          )}
                        </button>
                      ) : (
                        <button
                          className="btn btn-sm btn-outline-primary"
                          onClick={() => setShowCreateOrderModal(true)}
                          title="Create a new supplementary order for additional costs"
                        >
                          <i className="bi bi-plus-circle me-1"></i>
                          {t('appointments.detail.add_extra_charge')}
                        </button>
                      ))}
                  </div>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th>{t('appointments.detail.product')}</th>
                          <th className="text-center" style={{ width: '140px' }}>
                            {t('appointments.detail.order_source', 'จากออเดอร์')}
                          </th>
                          <th className="text-center" style={{ width: '80px' }}>
                            {t('appointments.detail.qty')}
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {combinedOrderItems.map((row, index) => (
                          <tr key={row.item.id ?? `combined-${index}`}>
                            <td>
                              <div className="d-flex align-items-center">
                                {row.item.product?.images && row.item.product.images.length > 0 && (
                                  <img
                                    src={row.item.product.images[0].image_path}
                                    alt=""
                                    className="me-2 rounded"
                                    style={{
                                      width: '30px',
                                      height: '30px',
                                      objectFit: 'cover',
                                    }}
                                  />
                                )}
                                <span>
                                  {row.item.product?.name ||
                                    row.item.product_name ||
                                    t('appointments.detail.unknown_product')}
                                </span>
                              </div>
                            </td>
                            <td className="text-center">
                              <span className="badge bg-light text-dark">
                                #{row.orderCode}
                              </span>
                              {!row.isMain && (
                                <span className="badge bg-secondary ms-1">
                                  {t('orders.supplementary_order')}
                                </span>
                              )}
                            </td>
                            <td className="text-center">{row.item.quantity}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>

              <div className="card mb-4">
                <div className="card-header d-flex justify-content-between align-items-center">
                  <h5 className="mb-0">
                    {t('appointments.detail.orders_summary_title', 'สรุปค่าใช้จ่ายรวม')}
                  </h5>
                </div>
                <div className="card-body">
                  <div className="table-responsive">
                    <table className="table table-sm table-bordered mb-0">
                      <thead className="table-light">
                        <tr>
                          <th style={{ width: '40%' }}>
                            {t('appointments.detail.orders_summary_order', 'ออเดอร์')}
                          </th>
                          <th style={{ width: '30%' }}>
                            {t('appointments.detail.orders_summary_status', 'สถานะ')}
                          </th>
                          {canSeePrices && (
                            <th className="text-end" style={{ width: '30%' }}>
                              {t('appointments.detail.orders_summary_total', 'ยอดรวม')}
                            </th>
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>#{appointment.order.code}</td>
                          <td>
                            <span
                              className={`badge bg-${
                                appointment.order.status === 'completed'
                                  ? 'success'
                                  : appointment.order.status === 'pending'
                                  ? 'warning'
                                  : appointment.order.status === 'quotation'
                                  ? 'info'
                                  : 'secondary'
                              }`}
                            >
                              {t(`status.${appointment.order.status}`)}
                            </span>
                            {appointment.order.status === 'pending' && (
                              <button
                                className="btn btn-sm btn-success ms-2"
                                onClick={() => {
                                  setPayingOrder(appointment.order);
                                  setPaymentMethod('cash');
                                  setReceivedAmount('');
                                  setPaymentChange(null);
                                }}
                              >
                                {t('orders.pay_now')}
                              </button>
                            )}
                          </td>
                          {canSeePrices && (
                            <td className="text-end">
                              ฿
                              {parseFloat(appointment.order.total).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              })}
                            </td>
                          )}
                        </tr>
                        {(appointment.order.children || [])
                          .filter(child => child.status !== 'cancelled')
                          .map(child => (
                            <tr key={child.id}>
                              <td>#{child.code}</td>
                              <td>
                                <span
                                  className={`badge bg-${
                                    child.status === 'completed'
                                      ? 'success'
                                      : child.status === 'pending'
                                      ? 'warning'
                                      : child.status === 'quotation'
                                      ? 'info'
                                      : 'secondary'
                                  }`}
                                >
                                  {t(`status.${child.status}`)}
                                </span>
                                {(isAdmin || isLeadTechnician) &&
                                  child.status === 'pending' && (
                                    <button
                                      className="btn btn-sm btn-outline-warning ms-2"
                                      onClick={() => setEditingOrderId(child.id)}
                                    >
                                      <i className="bi bi-pencil-square me-1"></i>
                                      {t('appointments.detail.edit_order')}
                                    </button>
                                  )}
                                {child.status === 'pending' && (
                                  <button
                                    className="btn btn-sm btn-success ms-2"
                                    onClick={() => {
                                      setPayingOrder(child);
                                      setPaymentMethod('cash');
                                      setReceivedAmount('');
                                      setPaymentChange(null);
                                    }}
                                  >
                                    {t('orders.pay_now')}
                                  </button>
                                )}
                                {(isAdmin || isLeadTechnician) &&
                                  child.status === 'pending' && (
                                    <button
                                      className="btn btn-sm btn-outline-danger ms-2"
                                      onClick={() => setOrderToCancel(child)}
                                    >
                                      <i className="bi bi-x-circle me-1"></i>
                                      {t('common.cancel')}
                                    </button>
                                  )}
                              </td>
                              {canSeePrices && (
                                <td className="text-end">
                                  ฿
                                  {parseFloat(child.total).toLocaleString('en-US', {
                                    minimumFractionDigits: 2,
                                    maximumFractionDigits: 2,
                                  })}
                                </td>
                              )}
                            </tr>
                          ))}
                        <tr className="table-light">
                          <td colSpan={2} className="text-end fw-bold">
                            {t('appointments.detail.orders_summary_grand_total', 'รวมทั้งหมด')}
                          </td>
                          <td className="text-end fw-bold">
                            ฿
                            {(
                              parseFloat(appointment.order.total) +
                              (appointment.order.children || [])
                                .filter(child => child.status !== 'cancelled')
                                .reduce((sum, child) => sum + parseFloat(child.total), 0)
                            ).toLocaleString('en-US', {
                              minimumFractionDigits: 2,
                              maximumFractionDigits: 2,
                            })}
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            </>
          )}
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

          {/* Technicians / Team */}
          <div className="card mb-4">
            <div className="card-header d-flex justify-content-between align-items-center">
              <div>
                <h5 className="mb-0">{t('appointments.detail.assigned_team')}</h5>
                {appointment.team && (
                  <div className="small text-muted">
                    {t('appointments.detail.current_team', 'ทีมปัจจุบัน')}: {appointment.team.name}
                  </div>
                )}
              </div>
              {isAdmin && appointment.status === 'scheduled' && (
                <button className="btn btn-sm btn-outline-primary" onClick={openTeamModal}>
                  {t('appointments.detail.manage_team')}
                </button>
              )}
            </div>
            <ul className="list-group list-group-flush">
              {appointment.technicians.length === 0 && (
                <li className="list-group-item text-muted">
                  {t('appointments.detail.no_technicians')}
                </li>
              )}
              {appointment.technicians.map(tech => {
                const hasValidFirstName =
                  tech.first_name &&
                  tech.first_name !== '0' &&
                  tech.first_name !== '1';
                const hasValidLastName =
                  tech.last_name &&
                  tech.last_name !== '0' &&
                  tech.last_name !== '1';

                return (
                  <li
                    key={tech.id}
                    className="list-group-item d-flex justify-content-between align-items-center"
                  >
                    <div>
                      {hasValidFirstName ? tech.first_name : ''}
                      {hasValidLastName
                        ? `${hasValidFirstName ? ' ' : ''}${tech.last_name}`
                        : ''}
                      {tech.pivot.is_lead && (
                        <span className="badge bg-primary ms-2">
                          {t('appointments.detail.team_lead')}
                        </span>
                      )}
                    </div>
                  </li>
                );
              })}
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
                        onClick={() => handleStatusUpdateClick('cancelled')}
                        disabled={updating}
                    >
                        {t('appointments.detail.cancel_btn')}
                    </button>
                </div>
            </div>
          )}
        </div>
      </div>

      {showCompleteModal && pendingStatusUpdate && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {t('appointments.detail.status_confirm_title', 'ยืนยันเปลี่ยนสถานะนัดหมาย')}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setShowCompleteModal(false);
                    setPendingStatusUpdate(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                {pendingStatusUpdate === 'completed' && showPaymentWarning && (
                  <div className="alert alert-warning" role="alert">
                    <i className="bi bi-exclamation-triangle-fill me-2"></i>
                    {t('appointments.detail.unpaid_warning')}
                  </div>
                )}
                <p className="mb-0">
                  {t(
                    'appointments.detail.status_confirm_message',
                    'คุณต้องการเปลี่ยนสถานะนัดหมายนี้ใช่หรือไม่?'
                  )}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setShowCompleteModal(false);
                    setPendingStatusUpdate(null);
                  }}
                >
                  {t('actions.cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => {
                    if (pendingStatusUpdate) {
                      handleStatusUpdate(pendingStatusUpdate);
                    }
                  }}
                  disabled={updating}
                >
                  {updating ? t('appointments.detail.saving') : t('common.confirm')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manage Team Modal */}
      {showTeamModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">{t('appointments.detail.manage_team_modal')}</h5>
                <button type="button" className="btn-close" onClick={() => setShowTeamModal(false)}></button>
              </div>
              <div className="modal-body">
                 <div className="row">
                   <div className="col-md-5">
                     <div className="mb-3">
                       <label className="form-label">
                         {t('appointments.detail.select_team', 'เลือกทีม')}
                       </label>
                       <select
                         className="form-select"
                         value={selectedTeamId ?? ''}
                         onChange={e => {
                           const value = e.target.value
                             ? Number(e.target.value)
                             : null;
                           setSelectedTeamId(value);
                           loadTeamPreview(value);
                         }}
                       >
                         <option value="">
                           {t('appointments.detail.no_team', 'ยังไม่เลือกทีม')}
                         </option>
                         {teams.map(team => (
                           <option key={team.id} value={team.id}>
                             {team.name}
                           </option>
                         ))}
                       </select>
                       {selectedTeamId && (
                         <small className="text-muted d-block mt-1">
                           {t(
                             'appointments.detail.apply_team_hint',
                             'การเลือกทีมจะบันทึกชื่อทีมในงานนี้',
                           )}
                         </small>
                       )}
                     </div>
                     <button
                       type="button"
                       className="btn btn-outline-primary w-100 mb-3"
                       disabled={!selectedTeamId || applyingTeam}
                       onClick={handleApplyTeam}
                     >
                       {applyingTeam
                         ? t('appointments.detail.saving')
                         : t('appointments.detail.apply_team_button', 'บันทึกทีมให้กับงานนี้')}
                     </button>
                     <hr />
                     <button
                       type="button"
                       className="btn btn-link p-0"
                       onClick={() =>
                         window.open('/teams', '_blank', 'noopener,noreferrer')
                       }
                     >
                       {t(
                         'appointments.detail.manage_teams_page_link',
                         'ไปหน้า จัดการทีมช่าง',
                       )}
                     </button>
                   </div>
                   <div className="col-md-7">
                     <div className="mb-3">
                       <div className="alert alert-info mb-2">
                         {t(
                           'appointments.detail.team_only_info',
                           'การมอบหมายช่างในงานนี้จัดการผ่านทีมช่างเท่านั้น หากต้องการเปลี่ยนรายชื่อช่าง โปรดแก้ไขที่หน้าจัดการทีม',
                         )}
                       </div>
                     </div>
                     <div>
                       <h6 className="mb-2">
                         {t(
                           'appointments.detail.team_members_preview',
                           'รายชื่อช่างในทีมนี้',
                         )}
                       </h6>
                       {teamPreviewLoading && (
                         <div className="text-muted small">
                           {t('common.loading', 'กำลังโหลด...')}
                         </div>
                       )}
                       {!teamPreviewLoading && teamPreview.length === 0 && selectedTeamId && (
                         <div className="text-muted small">
                           {t(
                             'appointments.detail.team_members_empty',
                             'ทีมนี้ยังไม่มีช่างในระบบ',
                           )}
                         </div>
                       )}
                       {!teamPreviewLoading && teamPreview.length > 0 && (
                         <ul className="list-group small">
                           {teamPreview.map(member => (
                             <li
                               key={member.id}
                               className="list-group-item d-flex justify-content-between align-items-center py-2"
                             >
                               <span>{member.name}</span>
                               {member.is_lead && (
                                 <span className="badge bg-primary">
                                   {t(
                                     'appointments.detail.lead_label',
                                     'หัวหน้าช่าง',
                                   )}
                                 </span>
                               )}
                             </li>
                           ))}
                         </ul>
                       )}
                     </div>
                   </div>
                 </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowTeamModal(false)}
                >
                  {t('actions.close', 'ปิด')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingOrderId && (
        <EditOrderModal
          orderId={editingOrderId}
          onClose={() => setEditingOrderId(null)}
          onSuccess={() => {
            setEditingOrderId(null);
            fetchAppointment();
            setSuccessMessage(t('orders.order_updated'));
          }}
        />
      )}

      {showCreateOrderModal && appointment?.order && (
        <CreateSupplementaryOrderModal
          parentOrderId={appointment.order.id}
          parentOrderCode={appointment.order.code}
          initialCustomer={
            appointment.customer
              ? {
                  id: appointment.customer.id,
                  name: appointment.customer.name,
                  phone: appointment.customer.phone || appointment.customer.phone_number,
                }
              : null
          }
          onClose={() => setShowCreateOrderModal(false)}
          onSuccess={() => {
            setShowCreateOrderModal(false);
            fetchAppointment();
            setSuccessMessage(t('pos.order_placed'));
          }}
        />
      )}

      {payingOrder && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-dialog-centered">
            <form className="modal-content" onSubmit={handleProcessPayment}>
              <div className="modal-header">
                <h5 className="modal-title">
                  {t('orders.pay_now')} #{payingOrder.code}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => {
                    setPayingOrder(null);
                    setReceivedAmount('');
                    setPaymentChange(null);
                  }}
                ></button>
              </div>
              <div className="modal-body">
                <div className="mb-3">
                  <div className="d-flex justify-content-between align-items-center">
                    <span className="fw-bold">{t('appointments.detail.orders_summary_total', 'ยอดรวม')}</span>
                    <span className="fs-5">
                      ฿
                      {parseFloat(payingOrder.total).toLocaleString('en-US', {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                      })}
                    </span>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label fw-bold">{t('pos.payment_method')}</label>
                  <div className="btn-group w-100" role="group">
                    <input
                      type="radio"
                      className="btn-check"
                      name="paymentMethodAppointment"
                      id="paymentCashAppointment"
                      autoComplete="off"
                      checked={paymentMethod === 'cash'}
                      onChange={() => setPaymentMethod('cash')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="paymentCashAppointment">
                      {t('pos.cash')}
                    </label>

                    <input
                      type="radio"
                      className="btn-check"
                      name="paymentMethodAppointment"
                      id="paymentTransferAppointment"
                      autoComplete="off"
                      checked={paymentMethod === 'transfer'}
                      onChange={() => setPaymentMethod('transfer')}
                    />
                    <label className="btn btn-outline-primary" htmlFor="paymentTransferAppointment">
                      {t('pos.transfer')}
                    </label>
                  </div>
                </div>

                {paymentMethod === 'cash' && (
                  <div className="mb-3">
                    <label className="form-label fw-bold">{t('pos.received_amount')}</label>
                    <input
                      type="number"
                      step="0.01"
                      className="form-control form-control-lg"
                      value={receivedAmount}
                      onChange={e => setReceivedAmount(e.target.value)}
                    />
                    {paymentChange !== null && (
                      <div className={`mt-2 fw-bold ${paymentChange < 0 ? 'text-danger' : 'text-success'}`}>
                        {paymentChange < 0
                          ? t('pos.not_enough_cash', {
                              amount: Math.abs(paymentChange).toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }),
                            })
                          : t('pos.change_amount', {
                              amount: paymentChange.toLocaleString('en-US', {
                                minimumFractionDigits: 2,
                                maximumFractionDigits: 2,
                              }),
                            })}
                      </div>
                    )}
                  </div>
                )}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => {
                    setPayingOrder(null);
                    setReceivedAmount('');
                    setPaymentChange(null);
                  }}
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={paymentMethod === 'cash' && paymentChange !== null && paymentChange < 0}
                >
                  {t('orders.pay_now')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {orderToCancel && (
        <div className="modal d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1050 }}>
          <div className="modal-dialog modal-dialog-centered">
            <form className="modal-content" onSubmit={handleCancelOrder}>
              <div className="modal-header">
                <h5 className="modal-title">
                  {t('orders.confirm_cancel_order')}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setOrderToCancel(null)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-0">
                  {t('orders.confirm_cancel_order')}
                </p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setOrderToCancel(null)}
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn btn-danger">
                  {t('common.confirm')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
