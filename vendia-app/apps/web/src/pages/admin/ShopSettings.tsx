import React, { useEffect, useState, useRef } from 'react';
import { useShopStore } from '@vendia/shared';
import { useTranslation } from 'react-i18next';
import { MessageModal } from '../../components/MessageModal';

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
  const [attendanceOfficeIps, setAttendanceOfficeIps] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [signature, setSignature] = useState<File | null>(null);
  const [signaturePreview, setSignaturePreview] = useState<string | null>(null);
  const [uiMessage, setUiMessage] = useState<{ type: 'success' | 'danger'; text: string } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const signatureInputRef = useRef<HTMLInputElement>(null);

  const getImageUrl = (path: string) => {
    if (path.startsWith('http')) return path;
    const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';
    const origin = apiUrl.replace(/\/api\/?$/, '');
    const normalizedPath = path.startsWith('/') ? path : `/${path}`;
    
    // Shop images are stored as 'shops/filename.ext' but served from '/storage/shops/filename.ext'
    if (!normalizedPath.startsWith('/storage/')) {
        return `${origin}/storage${normalizedPath}`;
    }
    
    return `${origin}${normalizedPath}`;
  };

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
      setAttendanceOfficeIps(shop.attendance_office_ips || '');
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
    setUiMessage(null);
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
    formData.append('attendance_office_ips', attendanceOfficeIps);
    if (logo) {
      formData.append('logo', logo);
    }
    if (signature) {
      formData.append('signature', signature);
    }

    try {
      await updateShop(formData);
      setUiMessage({ type: 'success', text: t('settings.alerts.success') });
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
      const message = (err as any)?.response?.data?.message || t('settings.alerts.error');
      setUiMessage({ type: 'danger', text: message });
      console.error(err);
    }
  };

  if (loading && !shop) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">{t('settings.title')}</h1>

      <MessageModal
        open={uiMessage !== null}
        type={uiMessage?.type || 'danger'}
        title={
          uiMessage?.type === 'success'
            ? t('common.success_title', 'สำเร็จ')
            : t('common.error_title', 'ไม่สำเร็จ')
        }
        message={uiMessage?.text || ''}
        okLabel={t('common.ok', 'ตกลง')}
        onClose={() => setUiMessage(null)}
      />

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-4">
              <label className="form-label d-block fw-bold mb-2">{t('settings.logo')}</label>
              <div 
                className="border rounded-3 p-4 text-center position-relative"
                style={{ borderStyle: 'dashed', cursor: 'pointer', backgroundColor: '#f8f9fa', transition: 'all 0.2s' }}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.borderColor = '#0d6efd'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.borderColor = '#dee2e6'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#dee2e6';
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    setLogo(file);
                    setPreview(URL.createObjectURL(file));
                  }
                }}
              >
                {preview ? (
                  <div className="position-relative d-inline-block">
                    <img src={preview} alt="Preview" className="img-thumbnail" style={{ maxHeight: '150px' }} />
                    <button 
                        type="button" 
                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: '24px', height: '24px' }}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setLogo(null); 
                            setPreview(null); 
                            if(fileInputRef.current) fileInputRef.current.value = ''; 
                        }}
                    >
                        <i className="bi bi-x"></i>
                    </button>
                  </div>
                ) : shop?.logo_path ? (
                  <img src={getImageUrl(shop.logo_path)} alt="Current Logo" className="img-thumbnail" style={{ maxHeight: '150px' }} />
                ) : (
                  <div className="py-4">
                    <i className="bi bi-cloud-arrow-up text-primary display-4 mb-2 d-block"></i>
                    <span className="text-muted fw-medium d-block mb-1">Click to upload or drag and drop</span>
                    <span className="text-muted small d-block">SVG, PNG, JPG or GIF</span>
                  </div>
                )}
                <input 
                  type="file" 
                  className="d-none" 
                  accept="image/*"
                  onChange={handleLogoChange}
                  ref={fileInputRef}
                />
              </div>
              <div className="form-text mt-2">{t('settings.logo_help')}</div>
            </div>

            <div className="mb-4">
              <label className="form-label d-block fw-bold mb-2">{t('settings.signature')}</label>
              <div 
                className="border rounded-3 p-4 text-center position-relative"
                style={{ borderStyle: 'dashed', cursor: 'pointer', backgroundColor: '#f8f9fa', transition: 'all 0.2s' }}
                onClick={() => signatureInputRef.current?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.borderColor = '#0d6efd'; }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.borderColor = '#dee2e6'; }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.style.backgroundColor = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#dee2e6';
                  if (e.dataTransfer.files && e.dataTransfer.files[0]) {
                    const file = e.dataTransfer.files[0];
                    setSignature(file);
                    setSignaturePreview(URL.createObjectURL(file));
                  }
                }}
              >
                {signaturePreview ? (
                  <div className="position-relative d-inline-block">
                    <img src={signaturePreview} alt="Signature Preview" className="img-thumbnail" style={{ maxHeight: '100px' }} />
                    <button 
                        type="button" 
                        className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm"
                        style={{ width: '24px', height: '24px' }}
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            setSignature(null); 
                            setSignaturePreview(null); 
                            if(signatureInputRef.current) signatureInputRef.current.value = ''; 
                        }}
                    >
                        <i className="bi bi-x"></i>
                    </button>
                  </div>
                ) : shop?.signature_path ? (
                  <img src={getImageUrl(shop.signature_path)} alt="Current Signature" className="img-thumbnail" style={{ maxHeight: '100px' }} />
                ) : (
                  <div className="py-4">
                    <i className="bi bi-cloud-arrow-up text-primary display-4 mb-2 d-block"></i>
                    <span className="text-muted fw-medium d-block mb-1">Click to upload or drag and drop</span>
                    <span className="text-muted small d-block">SVG, PNG, JPG or GIF</span>
                  </div>
                )}
                <input 
                  type="file" 
                  className="d-none" 
                  accept="image/*"
                  onChange={handleSignatureChange}
                  ref={signatureInputRef}
                />
              </div>
              <div className="form-text mt-2">{t('settings.signature_help')}</div>
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

            <div className="mb-3">
              <label className="form-label fw-bold">{t('settings.attendance_office_ips', 'IP ที่อนุญาตให้ลงเวลา')}</label>
              <textarea
                className="form-control"
                rows={3}
                value={attendanceOfficeIps}
                onChange={(e) => setAttendanceOfficeIps(e.target.value)}
                placeholder="203.0.113.10&#10;203.0.113.11"
              />
              <div className="form-text">
                {t('settings.attendance_office_ips_help', 'ใส่ IPv4 ที่อนุญาตให้ช่างลงเวลา (คั่นด้วยขึ้นบรรทัดใหม่หรือ comma). ถ้าเว้นว่างจะไม่จำกัด')}
              </div>
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
