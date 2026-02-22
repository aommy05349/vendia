import React, { useEffect, useState } from 'react';
import { api } from '@vendia/shared';
import { useTranslation } from 'react-i18next';

interface Technician {
  id: number;
  name: string;
  first_name?: string;
  last_name?: string;
}

interface TeamMember {
  id: number;
  user_id: number;
  is_lead: boolean;
  user: Technician;
}

interface Team {
  id: number;
  name: string;
  description?: string | null;
  is_active: boolean;
  members: TeamMember[];
}

export const TeamList: React.FC = () => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  const [showModal, setShowModal] = useState(false);
  const [editingTeam, setEditingTeam] = useState<Team | null>(null);
  const [form, setForm] = useState({
    name: '',
    description: '',
    is_active: true,
    members: [] as { user_id: number; is_lead: boolean }[],
  });

  const loadData = async () => {
    setLoading(true);
    try {
      const [teamsRes, techRes] = await Promise.all([
        api.get('/teams'),
        api.get('/teams/technicians'),
      ]);
      setTeams(teamsRes.data);
      setTechnicians(techRes.data);
    } catch (e) {
      setError('Failed to load teams');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const openCreate = () => {
    setEditingTeam(null);
    setForm({
      name: '',
      description: '',
      is_active: true,
      members: [],
    });
    setShowModal(true);
  };

  const openEdit = (team: Team) => {
    setEditingTeam(team);
    setForm({
      name: team.name,
      description: team.description || '',
      is_active: team.is_active,
      members: team.members.map(m => ({
        user_id: m.user_id,
        is_lead: m.is_lead,
      })),
    });
    setShowModal(true);
  };

  const toggleMember = (userId: number) => {
    setForm(prev => {
      const exists = prev.members.find(m => m.user_id === userId);
      if (exists) {
        return {
          ...prev,
          members: prev.members.filter(m => m.user_id !== userId),
        };
      }
      return {
        ...prev,
        members: [...prev.members, { user_id: userId, is_lead: false }],
      };
    });
  };

  const setLead = (userId: number) => {
    setForm(prev => ({
      ...prev,
      members: prev.members.map(m => ({
        ...m,
        is_lead: m.user_id === userId,
      })),
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSuccess(null);
    try {
      const payload = {
        name: form.name,
        description: form.description || null,
        is_active: form.is_active,
        members: form.members,
      };
      if (editingTeam) {
        await api.put(`/teams/${editingTeam.id}`, payload);
      } else {
        await api.post('/teams', payload);
      }
      setShowModal(false);
      await loadData();
      setSuccess(
        editingTeam
          ? t('appointments.detail.update_success', 'บันทึกข้อมูลสำเร็จ')
          : t('appointments.detail.update_success', 'บันทึกข้อมูลสำเร็จ'),
      );
    } catch (e) {
      setError(t('appointments.detail.update_failed', 'บันทึกข้อมูลไม่สำเร็จ'));
    } finally {
      setSaving(false);
    }
  };

  const getTechName = (userId: number) => {
    const tech = technicians.find(t => t.id === userId);
    if (!tech) return `#${userId}`;
    if (tech.first_name) {
      return `${tech.first_name} ${tech.last_name || ''}`;
    }
    return tech.name;
  };

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{t('common.teams', 'Teams')}</h2>
        <button className="btn btn-primary" onClick={openCreate}>
          {t('common.create', 'Create')}
        </button>
      </div>

      {error && (
        <div className="alert alert-danger" role="alert">
          {error}
        </div>
      )}
      {success && (
        <div className="alert alert-success" role="alert">
          {success}
        </div>
      )}

      {loading ? (
        <div className="text-center p-5">
          <div className="spinner-border text-primary" role="status"></div>
        </div>
      ) : teams.length === 0 ? (
        <div className="alert alert-info">{t('common.no_data', 'No data')}</div>
      ) : (
        <div className="row g-3">
          {teams.map(team => (
            <div key={team.id} className="col-12 col-md-6 col-lg-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h5 className="card-title mb-0">{team.name}</h5>
                    <span
                      className={`badge ${
                        team.is_active ? 'bg-success' : 'bg-secondary'
                      }`}
                    >
                      {team.is_active
                        ? t('common.active', 'Active')
                        : t('common.inactive', 'Inactive')}
                    </span>
                  </div>
                  {team.description && (
                    <p className="text-muted small mb-2">{team.description}</p>
                  )}
                  <div>
                    <div className="small text-muted mb-1">
                      {t('appointments.detail.assigned_team', 'Team members')}
                    </div>
                    {team.members.length === 0 ? (
                      <div className="text-muted small">
                        {t('appointments.detail.no_technicians', 'No technicians')}
                      </div>
                    ) : (
                      <ul className="list-unstyled mb-0">
                        {team.members.map(m => (
                          <li key={m.id} className="small">
                            {m.is_lead && (
                              <span className="badge bg-warning text-dark me-1">
                                {t('appointments.detail.lead', 'Lead')}
                              </span>
                            )}
                            {m.user
                              ? m.user.first_name
                                ? `${m.user.first_name} ${m.user.last_name || ''}`
                                : m.user.name
                              : getTechName(m.user_id)}
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                </div>
                <div className="card-footer bg-white text-end">
                  <button
                    className="btn btn-sm btn-outline-primary"
                    onClick={() => openEdit(team)}
                  >
                    {t('common.edit', 'Edit')}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {editingTeam
                    ? t('appointments.detail.manage_team_modal', 'จัดการทีมช่าง')
                    : t('appointments.detail.manage_team_modal', 'จัดการทีมช่าง')}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowModal(false)}
                ></button>
              </div>
              <form onSubmit={handleSubmit}>
                <div className="modal-body">
                  <div className="mb-3">
                    <label className="form-label">
                      {t('common.name', 'Name')}
                    </label>
                    <input
                      type="text"
                      className="form-control"
                      value={form.name}
                      onChange={e =>
                        setForm(prev => ({ ...prev, name: e.target.value }))
                      }
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label className="form-label">
                      {t('common.description', 'Description')}
                    </label>
                    <textarea
                      className="form-control"
                      rows={2}
                      value={form.description}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          description: e.target.value,
                        }))
                      }
                    ></textarea>
                  </div>
                  <div className="form-check form-switch mb-3">
                    <input
                      className="form-check-input"
                      type="checkbox"
                      id="team-active"
                      checked={form.is_active}
                      onChange={e =>
                        setForm(prev => ({
                          ...prev,
                          is_active: e.target.checked,
                        }))
                      }
                    />
                    <label className="form-check-label" htmlFor="team-active">
                      {t('common.active', 'Active')}
                    </label>
                  </div>

                  <hr />

                  <div className="row">
                    <div className="col-md-6">
                      <h6>{t('appointments.detail.select_technicians')}</h6>
                      <div className="list-group">
                        {technicians.map(tech => {
                          const checked = form.members.some(
                            m => m.user_id === tech.id,
                          );
                          return (
                            <button
                              type="button"
                              key={tech.id}
                              className={`list-group-item list-group-item-action d-flex justify-content-between align-items-center ${
                                checked ? 'active' : ''
                              }`}
                              onClick={() => toggleMember(tech.id)}
                            >
                              <span>
                                {tech.first_name
                                  ? `${tech.first_name} ${tech.last_name || ''}`
                                  : tech.name}
                              </span>
                              {checked && (
                                <span className="badge bg-light text-dark">
                                  {t('common.selected', 'Selected')}
                                </span>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                    <div className="col-md-6">
                      <h6>{t('appointments.detail.select_lead')}</h6>
                      {form.members.length === 0 ? (
                        <div className="text-muted small">
                          {t(
                            'appointments.detail.no_technicians',
                            'No technicians',
                          )}
                        </div>
                      ) : (
                        <ul className="list-group">
                          {form.members.map(m => {
                            const tech = technicians.find(t => t.id === m.user_id);
                            if (!tech) return null;
                            return (
                              <li
                                key={m.user_id}
                                className="list-group-item d-flex justify-content-between align-items-center"
                              >
                                <span>
                                  {tech.first_name
                                    ? `${tech.first_name} ${
                                        tech.last_name || ''
                                      }`
                                    : tech.name}
                                </span>
                                <div className="form-check form-switch mb-0">
                                  <input
                                    className="form-check-input"
                                    type="checkbox"
                                    checked={m.is_lead}
                                    onChange={() => setLead(m.user_id)}
                                  />
                                </div>
                              </li>
                            );
                          })}
                        </ul>
                      )}
                    </div>
                  </div>
                </div>
                <div className="modal-footer">
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => setShowModal(false)}
                  >
                    {t('actions.cancel', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={saving}
                  >
                    {saving
                      ? t('appointments.detail.saving', 'Saving...')
                      : t('appointments.detail.save_team', 'Save team')}
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

