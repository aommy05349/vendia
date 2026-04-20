import React, { useEffect, useMemo, useState } from 'react';
import { useCategoryStore } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { ConfirmModal } from '../../components/ConfirmModal';
import { MessageModal } from '../../components/MessageModal';

export const EditCategory = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { categories, fetchCategories, createCategory, updateCategory, deleteCategory, loading } = useCategoryStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');
  const [alertMessage, setAlertMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const [initialLoading, setInitialLoading] = useState(true);
  const [subName, setSubName] = useState('');
  const [subDescription, setSubDescription] = useState('');
  const [submittingSub, setSubmittingSub] = useState(false);
  const [editingSubId, setEditingSubId] = useState<number | null>(null);
  const [editingSubName, setEditingSubName] = useState('');
  const [editingSubDescription, setEditingSubDescription] = useState('');
  const [confirmDeleteSubId, setConfirmDeleteSubId] = useState<number | null>(null);
  const [confirmBusy, setConfirmBusy] = useState(false);

  useEffect(() => {
    const loadCategory = async () => {
      if (categories.length === 0) {
        await fetchCategories();
      }
      setInitialLoading(false);
    };
    loadCategory();
  }, [fetchCategories, categories.length]);

  const categoryId = id ? Number(id) : null;
  const currentCategory = categoryId ? categories.find((c) => c.id === categoryId) : undefined;
  const parentCategoryName =
    currentCategory?.parent_id
      ? (categories.find((c) => c.id === currentCategory.parent_id)?.name || '')
      : '';
  const subcategories = useMemo(() => {
    if (!categoryId) return [];
    return categories
      .filter((c) => c.parent_id === categoryId)
      .slice()
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [categories, categoryId]);

  const hasChildren = subcategories.length > 0;

  useEffect(() => {
    if (!initialLoading && id) {
      const category = categories.find(c => c.id === parseInt(id));
      if (category) {
        setName(category.name);
        setDescription(category.description || '');
      } else {
        setError(t('categories.alerts.not_found'));
      }
    }
  }, [initialLoading, id, categories]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id) return;

    try {
      await updateCategory(parseInt(id), { name, description });
      navigate('/categories', { state: { success: t('categories.alerts.update_success') } });
    } catch (err: any) {
      setError(err.message || t('categories.alerts.update_error'));
    }
  };

  if (initialLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '900px' }}>
      <div className="d-flex justify-content-between align-items-start mb-3">
        <div>
          <h1 className="mb-1">{t('categories.edit_title')}</h1>
          {currentCategory?.parent_id ? (
            <div className="text-muted">
              {t('categories.editing_subcategory_of', 'กำลังแก้ไขหมวดย่อยของ')} <span className="fw-bold">{parentCategoryName || '-'}</span>
            </div>
          ) : (
            <div className="text-muted">
              {t('categories.editing_parent_category', 'กำลังแก้ไขหมวดหลัก')}
            </div>
          )}
        </div>
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/categories')}>
          {t('common.back', 'ย้อนกลับ')}
        </button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}
      <MessageModal
        open={alertMessage !== null}
        type={alertMessage?.type || 'danger'}
        title={
          alertMessage?.type === 'success'
            ? t('common.success_title', 'สำเร็จ')
            : t('common.error_title', 'ไม่สำเร็จ')
        }
        message={alertMessage?.text || ''}
        okLabel={t('common.ok', 'ตกลง')}
        onClose={() => setAlertMessage(null)}
      />
      <ConfirmModal
        open={confirmDeleteSubId !== null}
        title={t('common.confirm_title', 'ยืนยัน')}
        message={t('categories.confirm_delete_sub', 'ต้องการลบหมวดย่อยนี้ใช่ไหม?')}
        confirmLabel={t('actions.delete', 'ลบ')}
        cancelLabel={t('common.cancel', 'ยกเลิก')}
        busy={confirmBusy}
        onCancel={() => setConfirmDeleteSubId(null)}
        onConfirm={async () => {
          if (!confirmDeleteSubId) return;
          setConfirmBusy(true);
          try {
            await deleteCategory(confirmDeleteSubId);
            setAlertMessage({ type: 'success', text: t('categories.alerts.delete_success') });
          } catch (err: any) {
            setAlertMessage({ type: 'danger', text: err?.response?.data?.message || err?.message || t('categories.alerts.delete_error') });
          } finally {
            setConfirmBusy(false);
            setConfirmDeleteSubId(null);
          }
        }}
      />

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold">{t('categories.form.name')}</label>
              <input
                type="text"
                className="form-control"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                placeholder={t('categories.form.name_placeholder', 'เช่น ล้างแอร์ / อะไหล่ / อุปกรณ์')}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('categories.form.description')}</label>
              <textarea 
                className="form-control" 
                rows={3}
                value={description} 
                onChange={(e) => setDescription(e.target.value)} 
                placeholder={t('categories.form.description_placeholder', 'รายละเอียด (ถ้ามี)')}
              />
            </div>

            <div className="d-flex justify-content-end gap-2">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/categories')}
              >
                {t('common.cancel')}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? t('categories.form.updating') : t('categories.form.submit_update')}
              </button>
            </div>
          </form>
        </div>
      </div>

      {!currentCategory?.parent_id && categoryId && (
        <div className="card shadow-sm mt-4">
          <div className="card-header bg-white d-flex justify-content-between align-items-center">
            <div className="fw-bold">{t('categories.subcategories', 'หมวดย่อย')}</div>
            <div className="text-muted small">
              {t('categories.subcategories_hint', 'หมวดย่อยจะแสดงใน POS ใต้หมวดหลักนี้')}
            </div>
          </div>
          <div className="card-body p-4">

            <div className="row g-2 align-items-end mb-3">
              <div className="col-12 col-md-5">
                <label className="form-label fw-bold">{t('categories.form.name', 'ชื่อหมวด')}</label>
                <input
                  className="form-control"
                  value={subName}
                  onChange={(e) => setSubName(e.target.value)}
                  placeholder={t('categories.subcategories.placeholder', 'เพิ่มหมวดย่อย...')}
                />
              </div>
              <div className="col-12 col-md-5">
                <label className="form-label fw-bold">{t('categories.form.description', 'รายละเอียด')}</label>
                <input
                  className="form-control"
                  value={subDescription}
                  onChange={(e) => setSubDescription(e.target.value)}
                />
              </div>
              <div className="col-12 col-md-2 d-grid">
                <button
                  type="button"
                  className="btn btn-success"
                  disabled={submittingSub || subName.trim() === ''}
                  onClick={async () => {
                    const nextName = subName.trim();
                    if (nextName === '' || !categoryId) return;
                    setSubmittingSub(true);
                    try {
                      await createCategory({
                        name: nextName,
                        description: subDescription.trim(),
                        parent_id: categoryId,
                      });
                      setSubName('');
                      setSubDescription('');
                      setAlertMessage({ type: 'success', text: t('categories.alerts.create_success') });
                    } catch (err: any) {
                      setAlertMessage({ type: 'danger', text: err?.response?.data?.message || err?.message || t('categories.alerts.create_error') });
                    } finally {
                      setSubmittingSub(false);
                    }
                  }}
                >
                  {submittingSub ? t('categories.form.submitting', 'กำลังบันทึก...') : t('common.add', 'เพิ่ม')}
                </button>
              </div>
            </div>

            <div className="table-responsive">
              <table className="table table-hover mb-0">
                <thead className="table-light">
                  <tr>
                    <th className="p-2" style={{ width: '80px' }}>{t('categories.table.id', 'ID')}</th>
                    <th className="p-2">{t('categories.table.name', 'ชื่อหมวด')}</th>
                    <th className="p-2">{t('categories.table.description', 'รายละเอียด')}</th>
                    <th className="p-2 text-end" style={{ width: '220px' }}>{t('categories.table.actions', 'การทำงาน')}</th>
                  </tr>
                </thead>
                <tbody>
                  {subcategories.map((c) => {
                    const isEditing = editingSubId === c.id;
                    return (
                      <tr key={c.id}>
                        <td className="p-2">{c.id}</td>
                        <td className="p-2">
                          {isEditing ? (
                            <input
                              className="form-control form-control-sm"
                              value={editingSubName}
                              onChange={(e) => setEditingSubName(e.target.value)}
                            />
                          ) : (
                            c.name
                          )}
                        </td>
                        <td className="p-2">
                          {isEditing ? (
                            <input
                              className="form-control form-control-sm"
                              value={editingSubDescription}
                              onChange={(e) => setEditingSubDescription(e.target.value)}
                            />
                          ) : (
                            c.description || '-'
                          )}
                        </td>
                        <td className="p-2 text-end">
                          {isEditing ? (
                            <>
                              <button
                                className="btn btn-sm btn-primary me-2"
                                disabled={loading || editingSubName.trim() === ''}
                                onClick={async () => {
                                  if (!categoryId) return;
                                  setError('');
                                  try {
                                    await updateCategory(c.id, {
                                      name: editingSubName.trim(),
                                      description: editingSubDescription.trim(),
                                      parent_id: categoryId,
                                    });
                                    setEditingSubId(null);
                                    setAlertMessage({ type: 'success', text: t('categories.alerts.update_success') });
                                  } catch (err: any) {
                                    setAlertMessage({ type: 'danger', text: err?.response?.data?.message || err?.message || t('categories.alerts.update_error') });
                                  }
                                }}
                              >
                                {t('common.save', 'บันทึก')}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-secondary"
                                onClick={() => setEditingSubId(null)}
                              >
                                {t('common.cancel', 'ยกเลิก')}
                              </button>
                            </>
                          ) : (
                            <>
                              <button
                                className="btn btn-sm btn-outline-primary me-2"
                                onClick={() => {
                                  setEditingSubId(c.id);
                                  setEditingSubName(c.name);
                                  setEditingSubDescription(c.description || '');
                                }}
                              >
                                {t('actions.edit', 'แก้ไข')}
                              </button>
                              <button
                                className="btn btn-sm btn-outline-danger"
                                onClick={() => setConfirmDeleteSubId(c.id)}
                              >
                                {t('actions.delete', 'ลบ')}
                              </button>
                            </>
                          )}
                        </td>
                      </tr>
                    );
                  })}
                  {subcategories.length === 0 && (
                    <tr>
                      <td colSpan={4} className="text-center text-muted p-4">
                        {t('categories.subcategories_empty', 'ยังไม่มีหมวดย่อย')}
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
