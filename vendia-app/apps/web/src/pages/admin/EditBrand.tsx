import React, { useEffect, useState } from 'react';
import { useAuxStore } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const EditBrand = () => {
  const { t } = useTranslation();
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { brands, fetchBrands, updateBrand, loading } = useAuxStore();
  
  const [name, setName] = useState('');
  const [image, setImage] = useState<File | null>(null);
  const [currentImageUrl, setCurrentImageUrl] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      if (brands.length === 0) {
        await fetchBrands();
      }
      setInitialLoading(false);
    };
    loadData();
  }, [fetchBrands, brands.length]);

  useEffect(() => {
    if (!initialLoading && id) {
      const brand = brands.find(b => b.id === parseInt(id));
      if (brand) {
        setName(brand.name);
        setCurrentImageUrl(brand.image || null);
      } else {
        setError(t('brands.alerts.not_found'));
      }
    }
  }, [initialLoading, id, brands]);

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setImage(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (!id) return;

    try {
      await updateBrand(parseInt(id), name, image || undefined);
      navigate('/brands', { state: { success: t('brands.alerts.update_success') } });
    } catch (err: any) {
      setError(err.message || t('brands.alerts.update_error'));
    }
  };

  if (initialLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '600px' }}>
      <h1 className="mb-4">{t('brands.edit_title')}</h1>
      
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-3">
              <label className="form-label fw-bold">{t('brands.form.name')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('brands.form.image')}</label>
              {currentImageUrl && (
                <div className="mb-2">
                  <img 
                    src={currentImageUrl.startsWith('http') ? currentImageUrl : `${(import.meta.env.VITE_API_URL || 'http://localhost:8000/api').replace('/api', '')}/storage/${currentImageUrl}`}
                    alt="Current" 
                    style={{ height: '80px', borderRadius: '4px' }} 
                  />
                </div>
              )}
              <input 
                type="file" 
                className="form-control" 
                accept="image/*"
                onChange={handleImageChange}
              />
              <small className="text-muted">{t('brands.form.image_hint')}</small>
            </div>

            <div className="d-flex justify-content-between">
              <button 
                type="button" 
                className="btn btn-secondary"
                onClick={() => navigate('/brands')}
              >
                {t('brands.form.cancel')}
              </button>
              <button 
                type="submit" 
                className="btn btn-primary"
                disabled={loading}
              >
                {loading ? t('brands.form.updating') : t('brands.form.submit_update')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
