import React, { useState } from 'react';
import { useCategoryStore } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CreateCategory = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createCategory, loading } = useCategoryStore();
  
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    try {
      await createCategory({ name, description });
      navigate('/categories', { state: { success: t('categories.alerts.create_success') } });
    } catch (err: any) {
      setError(err.message || t('categories.alerts.create_error'));
    }
  };

  return (
    <div className="container mt-5" style={{ maxWidth: '760px' }}>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h1 className="mb-0">{t('categories.create_title')}</h1>
        <button type="button" className="btn btn-outline-secondary" onClick={() => navigate('/categories')}>
          {t('common.back', 'ย้อนกลับ')}
        </button>
      </div>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <div className="alert alert-info mb-4">
            {t('categories.form.hint_parent_removed', 'หน้านี้ใช้สำหรับเพิ่ม “หมวดหลัก” เท่านั้น (หมวดย่อยเพิ่มได้ในหน้าแก้ไขหมวดหลัก)')}
          </div>
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
                className="btn btn-success"
                disabled={loading}
              >
                {loading ? t('categories.form.submitting') : t('categories.form.submit_create')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
