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
  const [teams, setTeams] = useState<{ id: number; name: string }[]>([]);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    start_time: '',
    end_time: '',
    admin_notes: '',
  });

  const [selectedTeamId, setSelectedTeamId] = useState<number | null>(null);

  useEffect(() => {
    fetchTeams();
    fetchAppointment();
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
      setSelectedTeamId(appt.team ? appt.team.id : null);

      setLoading(false);
    } catch (error) {
      console.error('Failed to fetch appointment', error);
      navigate('/appointments', { state: { appointmentEditLoadError: true } });
    }
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
    setSaving(true);
    setErrorMessage(null);
    try {
      let techniciansPayload: { id: number; is_lead: boolean }[] = [];

      if (selectedTeamId) {
        const teamResponse = await api.get(`/teams/${selectedTeamId}`);
        const teamData = teamResponse.data;
        const members = Array.isArray(teamData.members) ? teamData.members : [];
        techniciansPayload = members.map((m: any) => ({
          id: m.user_id,
          is_lead: !!m.is_lead,
        }));
      }

      const payload = {
        ...formData,
        team_id: selectedTeamId,
        technicians: techniciansPayload,
      };

      await api.patch(`/appointments/${id}`, payload);
      navigate(`/appointments/${id}`);
    } catch (error) {
      console.error('Failed to update appointment', error);
      setErrorMessage(t('appointments.edit.failed_update'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="p-4">{t('appointments.loading')}</div>;

  return (
    <div className="container mt-4" style={{ maxWidth: '800px' }}>
      <h2 className="mb-4">{t('appointments.edit.title', { id })}</h2>
      
      <form onSubmit={handleSubmit} className="card p-4 shadow-sm">
        {errorMessage && (
          <div className="alert alert-danger mb-3" role="alert">
            {errorMessage}
          </div>
        )}
        
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
              onChange={(e) => handleStartTimeChange(e.target.value)}
            />
          </div>
          <div className="col-md-6">
            <label className="form-label">{t('appointments.create.end_time')}</label>
            <input
              type="datetime-local"
              className="form-control"
              value={formData.end_time}
              min={formData.start_time || undefined}
              onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
            />
          </div>
        </div>

        <hr />

        <h5 className="mb-3">{t('appointments.detail.assigned_team')}</h5>
        <div className="mb-3">
          <label className="form-label">
            {t('appointments.detail.select_team', 'เลือกทีม')}
          </label>
          <select
            className="form-select"
            value={selectedTeamId ?? ''}
            onChange={e =>
              setSelectedTeamId(
                e.target.value ? Number(e.target.value) : null,
              )
            }
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
                'การเลือกทีมจะบันทึกชื่อทีมและรายชื่อช่างจากทีมให้กับงานนี้',
              )}
            </small>
          )}
        </div>
        <div className="mb-3">
          <div className="alert alert-info mb-0">
            {t(
              'appointments.detail.team_only_info',
              'การมอบหมายช่างในงานนี้จัดการผ่านทีมช่างเท่านั้น หากต้องการเปลี่ยนรายชื่อช่าง โปรดแก้ไขที่หน้าจัดการทีม',
            )}
          </div>
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
