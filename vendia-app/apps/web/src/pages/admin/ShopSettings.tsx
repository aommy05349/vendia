import React, { useEffect, useState, useRef } from 'react';
import { useShopStore } from '@vendia/shared';
import { useTranslation } from 'react-i18next';

export default function ShopSettings() {
  const { t } = useTranslation();
  const { shop, updateShop, fetchShop, loading } = useShopStore();
  const [name, setName] = useState('');
  const [companyName, setCompanyName] = useState('');
  const [bankDetails, setBankDetails] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [footerText, setFooterText] = useState('');
  const [remarks, setRemarks] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shop) {
      fetchShop();
    } else {
      setName(shop.name);
      setCompanyName(shop.company_name || '');
      setBankDetails(shop.bank_details || '');
      setAddress(shop.address || '');
      setPhone(shop.phone || '');
      setTaxId(shop.tax_id || '');
      setEmail(shop.email || '');
      setWebsite(shop.website || '');
      setFooterText(shop.footer_text || '');
      setRemarks(shop.remarks || '');
    }
  }, [shop, fetchShop]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSignatureChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setSignature(file);
      setSignaturePreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('company_name', companyName);
    formData.append('bank_details', bankDetails);
    formData.append('address', address);
    formData.append('phone', phone);
    formData.append('tax_id', taxId);
    formData.append('email', email);
    formData.append('website', website);
    formData.append('footer_text', footerText);
    formData.append('remarks', remarks);
    if (logo) {
      formData.append('logo', logo);
    }
    if (signature) {
      formData.append('signature', signature);
    }

    try {
      await updateShop(formData);
      setSuccess(t('settings.alerts.success'));
      // Reset file input
      setLogo(null);
      setPreview(null);
      setSignature(null);
      setSignaturePreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
      if (signatureInputRef.current) {
        signatureInputRef.current.value = '';
      }
    } catch (err) {
      setError(t('settings.alerts.error'));
      console.error(err);
    }
  };

  if (loading && !shop) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">{t('settings.title')}</h1>
      
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-4 text-center">
              <label className="form-label d-block fw-bold">{t('settings.logo')}</label>
              <div className="mb-3">
                {preview ? (
                  <img src={preview} alt="Preview" className="img-thumbnail" style={{ maxHeight: '150px' }} />
                ) : shop?.logo_path ? (
                  <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${shop.logo_path}`} alt="Current Logo" className="img-thumbnail" style={{ maxHeight: '150px' }} />
                ) : (
                  <div className="text-muted border p-3 d-inline-block rounded bg-light">{t('settings.no_logo')}</div>
                )}
              </div>
              <input 
                type="file" 
                className="form-control" 
                accept="image/*"
                onChange={handleLogoChange}
                ref={fileInputRef}
              />
              <div className="form-text">{t('settings.logo_help')}</div>
            </div>

            <div className="mb-4 text-center">
              <label className="form-label d-block fw-bold">{t('settings.signature')}</label>
              <div className="mb-3">
                {signaturePreview ? (
                  <img src={signaturePreview} alt="Signature Preview" className="img-thumbnail" style={{ maxHeight: '100px' }} />
                ) : shop?.signature_path ? (
                  <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${shop.signature_path}`} alt="Current Signature" className="img-thumbnail" style={{ maxHeight: '100px' }} />
                ) : (
                  <div className="text-muted border p-3 d-inline-block rounded bg-light">{t('settings.no_signature')}</div>
                )}
              </div>
              <input 
                type="file" 
                className="form-control" 
                accept="image/*"
                onChange={handleSignatureChange}
                ref={signatureInputRef}
              />
              <div className="form-text">{t('settings.signature_help')}</div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.name')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.company_name')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={companyName} 
                onChange={(e) => setCompanyName(e.target.value)} 
                placeholder={t('settings.company_placeholder')}
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.bank_details')}</label>
              <textarea 
                className="form-control" 
                rows={4}
                value={bankDetails} 
                onChange={(e) => setBankDetails(e.target.value)} 
                placeholder={t('settings.bank_placeholder')}
              />
              <div className="form-text">{t('settings.bank_help')}</div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.address')}</label>
              <textarea 
                className="form-control" 
                rows={3}
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.phone')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.tax_id')}</label>
              <input 
                type="text" 
                className="form-control" 
                value={taxId} 
                onChange={(e) => setTaxId(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.email')}</label>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.website')}</label>
              <input 
                type="url" 
                className="form-control" 
                value={website} 
                onChange={(e) => setWebsite(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.footer_text')}</label>
              <textarea 
                className="form-control" 
                rows={2}
                value={footerText} 
                onChange={(e) => setFooterText(e.target.value)} 
                placeholder={t('settings.footer_placeholder')}
              />
              <div className="form-text">{t('settings.footer_help')}</div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.remarks')}</label>
              <textarea 
                className="form-control" 
                rows={3}
                value={remarks} 
                onChange={(e) => setRemarks(e.target.value)} 
                placeholder={t('settings.remarks_placeholder')}
              />
              <div className="form-text">{t('settings.remarks_help')}</div>
            </div>

            <div className="d-flex justify-content-end">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? t('settings.saving') : t('settings.save')}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
