import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { api } from '@vendia/shared';
import Select from 'react-select';
import { useTranslation } from 'react-i18next';

interface User {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

export const EditAppointment = () => {
  const { t } = useTranslation();
  const { id } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [technicians, setTechnicians] = useState<User[]>([]);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    admin_notes: '',
  });

  const [selectedTechnicians, setSelectedTechnicians] = useState<{ id: number; is_lead: boolean }[]>([]);

  useEffect(() => {
    fetchTechnicians();
    fetchAppointment();
  }, [id]);

  const fetchTechnicians = async () => {
    try {
      const response = await api.get('/users?role=technician');
      setTechnicians(response.data.data || response.data);
    } catch (error) {
      console.error('Failed to fetch technicians', error);
    }
  };

  const formatForInput = (dateString: string) => {
    if (!dateString) return '';
    // Ensure ISO format compatibility (replace space with T if needed)
    const safeDateString = dateString.includes('T') ? dateString : dateString.replace(' ', 'T');
    const date = new Date(safeDateString);
    
    if (isNaN(date.getTime())) return '';
    
    // Adjust to local time string for datetime-local input
    // YYYY-MM-DDThh:mm
    const pad = (n: number) => n < 10 ? '0' + n : n;
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const fetchAppointment = async () => {
    try {
      const response = await api.get(`/appointments/${id}`);
      const appt = response.data;
      
      setFormData({
        title: appt.title,
        description: appt.description || '',
        start_time: formatForInput(appt.start_time),
        end_time: formatForInput(appt.end_time),
        admin_notes: appt.admin_notes || '',
      });

      setSelectedTechnicians(appt.technicians.map((t: any) => ({
        id: t.id,
        is_lead: t.pivot.is_lead
      })));

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch appointment', error);
      alert(t('appointments.edit.failed_load'));
      navigate('/appointments');
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
      is_lead: t.id === techId
    })));
  };

  const handleTechnicianChange = (selectedOptions: any) => {
    // Preserve existing is_lead status if technician is already selected
    const newSelected = selectedOptions.map((option: any) => {
        const existing = selectedTechnicians.find(t => t.id === option.value);
        return {
            id: option.value,
            is_lead: existing ? existing.is_lead : false
        };
    });
    setSelectedTechnicians(newSelected);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    try {
      const payload = {
        ...formData,
        technicians: selectedTechnicians,
      };

      await api.patch(`/appointments/${id}`, payload);
      navigate(`/appointments/${id}`);
    } catch (error) {
      console.error('Failed to update appointment', error);
      alert(t('appointments.edit.failed_update'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">{t('appointments.loading')}</div>;

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <h2 className="mb-4">{t('appointments.edit.title', { id })}</h2>
      
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
        
        <div className="mb-3">
          <label className="form-label">{t('appointments.create.title_label')} <span className="text-danger">*</span></label>
          <input
            type="text"
            className="form-control"
            required
            value={formData.title}
            onChange={(e) => setFormData({ ...formData, title: e.target.value })}
          />
        </div>

        <div className="mb-3">
            <label className="form-label">{t('appointments.create.description')}</label>
            <textarea
                className="form-control"
                rows={2}
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
            ></textarea>
        </div>

        <div className="row mb-3">
          <div className="col-md-6">
            <label className="form-label">{t('appointments.create.start_time')} <span className="text-danger">*</span></label>
            <input
              type="datetime-local"
              className="form-control"
              required
              value={formData.start_time}
              onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">{t('appointments.create.end_time')}</label>
            <input
              type="datetime-local"
              className="form-control"
              value={formData.end_time}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>
        </div>

        <hr />

        {/* Technicians */}
        <h5 className="mb-3">{t('appointments.create.assign_team')}</h5>
        <div className="mb-3">
            <label className="form-label">{t('appointments.create.select_technicians')}</label>
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

            {selectedTechnicians.length > 0 && (
                <div className="card">
                    <div className="card-header bg-light py-2">
                        <small className="fw-bold">{t('appointments.edit.team_members_lead')}</small>
                    </div>
                    <ul className="list-group list-group-flush">
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
                                            id={`lead-${st.id}`}
                                        />
                                        <label className="form-check-label small" htmlFor={`lead-${st.id}`}>
                                            {t('appointments.create.lead_role')}
                                        </label>
                                    </div>
                                </li>
                            );
                        })}
                    </ul>
                </div>
            )}
        </div>
        
        <div className="mb-3">
             <label className="form-label">{t('appointments.create.admin_notes')}</label>
             <textarea
                 className="form-control"
                 rows={2}
                 value={formData.admin_notes}
                 onChange={(e) => setFormData({ ...formData, admin_notes: e.target.value })}
             ></textarea>
        </div>

        <div className="d-flex justify-content-end gap-2 mt-4">
          <button type="button" className="btn btn-secondary" onClick={() => navigate(`/appointments/${id}`)}>
            {t('appointments.create.cancel')}
          </button>
          <button type="submit" className="btn btn-primary" disabled={saving}>
            {saving ? t('appointments.edit.saving') : t('appointments.edit.save')}
          </button>
        </div>
      </form>
    </div>
  );
};
