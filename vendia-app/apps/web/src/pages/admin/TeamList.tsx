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

interface TeamHistoryDay {
  date: string;
  teams: {
    id: number;
    name: string;
    jobs_count: number;
  }[];
}

export const TeamList: React.FC = () => {
  const { t } = useTranslation();
  const [teams, setTeams] = useState<Team[]>([]);
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [historyLoading, setHistoryLoading] = useState(false);
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

  const [history, setHistory] = useState<TeamHistoryDay[]>([]);
  const [historyStart, setHistoryStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(1);
    return d.toISOString().slice(0, 10);
  });
  const [historyEnd, setHistoryEnd] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 1);
    d.setDate(0);
    return d.toISOString().slice(0, 10);
  });

  const [historyViewMode, setHistoryViewMode] = useState<'list' | 'calendar'>(
    'list',
  );

  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTeam, setDeletingTeam] = useState<Team | null>(null);
  const [deleting, setDeleting] = useState(false);

  const renderHistoryCalendarRows = () => {
    if (history.length === 0) return null;

    const historyMap: Record<string, TeamHistoryDay> = {};
    history.forEach(day => {
      historyMap[day.date] = day;
    });

    const baseDateStr = historyStart || history[0].date;
    const [yearStr, monthStr] = baseDateStr.split('-');
    const year = parseInt(yearStr, 10);
    const month = parseInt(monthStr, 10);

    const firstOfMonth = new Date(year, month - 1, 1);
    const startWeekday = firstOfMonth.getDay();
    const daysInMonth = new Date(year, month, 0).getDate();

    const rows: JSX.Element[] = [];
    let cells: JSX.Element[] = [];
    const totalCells = startWeekday + daysInMonth;

    for (let i = 0; i < totalCells; i++) {
      if (i < startWeekday) {
        cells.push(
          <td key={`empty-${i}`} className="align-top" style={{ minHeight: 100 }}></td>,
        );
      } else {
        const dayNum = i - startWeekday + 1;
        const dateKey = `${year}-${String(month).padStart(2, '0')}-${String(
          dayNum,
        ).padStart(2, '0')}`;
        const dayData = historyMap[dateKey];
        const teamsForDay = dayData ? dayData.teams : [];

        cells.push(
          <td
            key={dateKey}
            className="align-top"
            style={{ minWidth: '120px', minHeight: 100 }}
          >
            <div className="small fw-bold mb-1">{dayNum}</div>
            {teamsForDay.length === 0 ? (
              <div className="text-muted small">-</div>
            ) : (
              teamsForDay.map(teamHistory => {
                const teamInfo = teams.find(t => t.id === teamHistory.id);
                const members =
                  teamInfo && Array.isArray(teamInfo.members)
                    ? teamInfo.members
                    : [];
                const memberNames = members
                  .map(m => {
                    if (!m.user) return '';
                    if (m.user.first_name) {
                      return `${m.user.first_name} ${m.user.last_name || ''}`;
                    }
                    return m.user.name;
                  })
                  .filter(Boolean)
                  .join(', ');

                return (
                  <div
                    key={teamHistory.id}
                    className="border rounded bg-light-subtle p-1 mb-1"
                  >
                    <div className="small">
                      <span className="fw-semibold text-primary">
                        {teamHistory.name}
                      </span>{' '}
                      <span className="text-muted">
                        ({teamHistory.jobs_count}{' '}
                        {t('teams.history.jobs', 'งาน')})
                      </span>
                    </div>
                    {memberNames && (
                      <div className="text-muted small">
                        {t(
                          'teams.history.members_prefix',
                          'ช่างในทีม:',
                        )}{' '}
                        {memberNames}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </td>,
        );
      }

      if ((i + 1) % 7 === 0 || i === totalCells - 1) {
        while (cells.length < 7) {
          const key = `empty-tail-${rows.length}-${cells.length}`;
          cells.push(
            <td key={key} className="align-top" style={{ minHeight: 100 }}></td>,
          );
        }
        rows.push(<tr key={`row-${rows.length}`}>{cells}</tr>);
        cells = [];
      }
    }

    return rows;
  };

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

  const loadTechnicians = async (teamId?: number | null) => {
    try {
      const res = await api.get('/teams/technicians', {
        params: teamId ? { team_id: teamId } : {},
      });
      setTechnicians(res.data);
    } catch (e) {
      setError('Failed to load teams');
    }
  };

  const loadHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get('/teams/daily-assignments', {
        params: {
          start_date: historyStart,
          end_date: historyEnd,
        },
      });
      setHistory(res.data);
    } catch (e) {
      setError('Failed to load team history');
    } finally {
      setHistoryLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    loadHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const openCreate = () => {
    setEditingTeam(null);
    setForm({
      name: '',
      description: '',
      is_active: true,
      members: [],
    });
    loadTechnicians(null);
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
    loadTechnicians(team.id);
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

  const openDelete = (team: Team) => {
    setDeletingTeam(team);
    setShowDeleteModal(true);
  };

  const handleDelete = async () => {
    if (!deletingTeam) return;
    setDeleting(true);
    setError(null);
    setSuccess(null);
    try {
      await api.delete(`/teams/${deletingTeam.id}`);
      setShowDeleteModal(false);
      setDeletingTeam(null);
      await loadData();
      await loadHistory();
      setSuccess(t('teams.delete_success', 'ลบทีมสำเร็จ'));
    } catch (e) {
      setError(t('teams.delete_failed', 'ไม่สามารถลบทีมได้'));
    } finally {
      setDeleting(false);
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
        <>
          <div className="row g-3 mb-4">
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
                    <div className="btn-group">
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => openEdit(team)}
                      >
                        {t('common.edit', 'Edit')}
                      </button>
                      <button
                        className="btn btn-sm btn-outline-danger"
                        onClick={() => openDelete(team)}
                      >
                        {t('common.delete', 'Delete')}
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          <div className="card">
            <div className="card-header d-flex flex-wrap justify-content-between align-items-center">
              <h5 className="mb-2 mb-md-0">
                {t(
                  'teams.history.title',
                  'ประวัติทีมตามวัน (จากนัดหมายที่มีทีมรับผิดชอบ)',
                )}
              </h5>
              <div className="d-flex gap-2 align-items-center">
                <div className="input-group input-group-sm">
                  <span className="input-group-text">
                    {t('filters.start_date', 'จากวันที่')}
                  </span>
                  <input
                    type="date"
                    className="form-control"
                    value={historyStart}
                    onChange={e => setHistoryStart(e.target.value)}
                  />
                </div>
                <div className="input-group input-group-sm">
                  <span className="input-group-text">
                    {t('filters.end_date', 'ถึงวันที่')}
                  </span>
                  <input
                    type="date"
                    className="form-control"
                    value={historyEnd}
                    onChange={e => setHistoryEnd(e.target.value)}
                  />
                </div>
                <button
                  className="btn btn-sm btn-outline-primary"
                  onClick={loadHistory}
                  disabled={historyLoading}
                >
                  {historyLoading
                    ? t('common.loading', 'กำลังโหลด...')
                    : t('common.filter', 'กรอง')}
                </button>
                <div className="btn-group btn-group-sm" role="group">
                  <button
                    type="button"
                    className={`btn btn-outline-secondary ${
                      historyViewMode === 'list' ? 'active' : ''
                    }`}
                    onClick={() => setHistoryViewMode('list')}
                  >
                    {t('teams.history.view_list', 'แบบรายการ')}
                  </button>
                  <button
                    type="button"
                    className={`btn btn-outline-secondary ${
                      historyViewMode === 'calendar' ? 'active' : ''
                    }`}
                    onClick={() => setHistoryViewMode('calendar')}
                  >
                    {t('teams.history.view_calendar', 'ปฏิทิน')}
                  </button>
                </div>
              </div>
            </div>
            <div className="card-body p-0">
              {historyLoading ? (
                <div className="text-center p-4">
                  <div className="spinner-border text-primary" role="status"></div>
                </div>
              ) : history.length === 0 ? (
                <div className="p-3 text-muted">
                  {t(
                    'teams.history.empty',
                    'ยังไม่มีนัดหมายที่ผูกทีมในช่วงวันที่ที่เลือก',
                  )}
                </div>
              ) : (
                <>
                  {historyViewMode === 'list' ? (
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            <th style={{ width: '140px' }}>
                              {t('common.date', 'วันที่')}
                            </th>
                            <th>{t('common.teams', 'Teams')}</th>
                          </tr>
                        </thead>
                        <tbody>
                          {history.map(day => (
                            <tr key={day.date}>
                              <td>
                                {new Date(day.date).toLocaleDateString('th-TH', {
                                  year: 'numeric',
                                  month: 'short',
                                  day: 'numeric',
                                  weekday: 'short',
                                })}
                              </td>
                              <td>
                                {day.teams.map(team => (
                                  <span
                                    key={team.id}
                                    className="badge bg-primary-subtle text-primary me-2 mb-1"
                                  >
                                    {team.name}{' '}
                                    <span className="text-muted">
                                      ({team.jobs_count}{' '}
                                      {t('teams.history.jobs', 'งาน')})
                                    </span>
                                  </span>
                                ))}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="table-responsive">
                      <table className="table table-sm mb-0">
                        <thead className="table-light">
                          <tr>
                            {[
                              t('calendar.sun', 'อา'),
                              t('calendar.mon', 'จ'),
                              t('calendar.tue', 'อ'),
                              t('calendar.wed', 'พ'),
                              t('calendar.thu', 'พฤ'),
                              t('calendar.fri', 'ศ'),
                              t('calendar.sat', 'ส'),
                            ].map((label, idx) => (
                              <th key={idx} className="text-center small">
                                {label}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>{renderHistoryCalendarRows()}</tbody>
                      </table>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </>
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

      {showDeleteModal && deletingTeam && (
        <div
          className="modal fade show d-block"
          style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}
        >
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">
                  {t('teams.delete_title', 'ลบทีมช่าง')}
                </h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDeleteModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <p className="mb-2">
                  {t(
                    'teams.delete_confirm',
                    'คุณต้องการลบทีมนี้หรือไม่? นัดหมายที่เคยผูกทีมนี้จะไม่แสดงทีมอีกต่อไป แต่ตัวนัดหมายยังอยู่เหมือนเดิม',
                  )}
                </p>
                <p className="fw-bold mb-0">{deletingTeam.name}</p>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDeleteModal(false)}
                  disabled={deleting}
                >
                  {t('actions.cancel', 'Cancel')}
                </button>
                <button
                  type="button"
                  className="btn btn-danger"
                  onClick={handleDelete}
                  disabled={deleting}
                >
                  {deleting
                    ? t('teams.deleting', 'กำลังลบ...')
                    : t('teams.delete_confirm_button', 'ยืนยันลบทีม')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
