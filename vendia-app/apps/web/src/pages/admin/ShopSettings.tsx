import React, { useEffect, useState, useRef } from 'react';
import { useShopStore } from '@vendia/shared';

export default function ShopSettings() {
  const { shop, updateShop, fetchShop, loading } = useShopStore();
  const [name, setName] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [taxId, setTaxId] = useState('');
  const [email, setEmail] = useState('');
  const [website, setWebsite] = useState('');
  const [footerText, setFooterText] = useState('');
  const [logo, setLogo] = useState<File | null>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!shop) {
      fetchShop();
    } else {
      setName(shop.name);
      setAddress(shop.address || '');
      setPhone(shop.phone || '');
      setTaxId(shop.tax_id || '');
      setEmail(shop.email || '');
      setWebsite(shop.website || '');
      setFooterText(shop.footer_text || '');
    }
  }, [shop, fetchShop]);

  const handleLogoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setLogo(file);
      setPreview(URL.createObjectURL(file));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    const formData = new FormData();
    formData.append('name', name);
    formData.append('address', address);
    formData.append('phone', phone);
    formData.append('tax_id', taxId);
    formData.append('email', email);
    formData.append('website', website);
    formData.append('footer_text', footerText);
    if (logo) {
      formData.append('logo', logo);
    }

    try {
      await updateShop(formData);
      setSuccess('Shop settings updated successfully!');
      // Reset file input
      setLogo(null);
      setPreview(null);
      if (fileInputRef.current) {
        fileInputRef.current.value = '';
      }
    } catch (err) {
      setError('Failed to update shop settings. Please try again.');
      console.error(err);
    }
  };

  if (loading && !shop) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container mt-5" style={{ maxWidth: '800px' }}>
      <h1 className="mb-4">Shop Management</h1>
      
      {success && <div className="alert alert-success">{success}</div>}
      {error && <div className="alert alert-danger">{error}</div>}

      <div className="card shadow-sm">
        <div className="card-body p-4">
          <form onSubmit={handleSubmit}>
            <div className="mb-4 text-center">
              <label className="form-label d-block fw-bold">Shop Logo</label>
              <div className="mb-3">
                {preview ? (
                  <img src={preview} alt="Preview" className="img-thumbnail" style={{ maxHeight: '150px' }} />
                ) : shop?.logo_path ? (
                  <img src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${shop.logo_path}`} alt="Current Logo" className="img-thumbnail" style={{ maxHeight: '150px' }} />
                ) : (
                  <div className="text-muted border p-3 d-inline-block rounded bg-light">No Logo</div>
                )}
              </div>
              <input 
                type="file" 
                className="form-control" 
                accept="image/*"
                onChange={handleLogoChange}
                ref={fileInputRef}
              />
              <div className="form-text">Allowed formats: JPG, PNG, GIF. Max size: 2MB.</div>
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Shop Name</label>
              <input 
                type="text" 
                className="form-control" 
                value={name} 
                onChange={(e) => setName(e.target.value)} 
                required 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Address</label>
              <textarea 
                className="form-control" 
                rows={3}
                value={address} 
                onChange={(e) => setAddress(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Phone</label>
              <input 
                type="text" 
                className="form-control" 
                value={phone} 
                onChange={(e) => setPhone(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Tax ID (เลขประจำตัวผู้เสียภาษี)</label>
              <input 
                type="text" 
                className="form-control" 
                value={taxId} 
                onChange={(e) => setTaxId(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Email</label>
              <input 
                type="email" 
                className="form-control" 
                value={email} 
                onChange={(e) => setEmail(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Website</label>
              <input 
                type="url" 
                className="form-control" 
                value={website} 
                onChange={(e) => setWebsite(e.target.value)} 
              />
            </div>

            <div className="mb-3">
              <label className="form-label fw-bold">Footer Text (สำหรับใบเสร็จ)</label>
              <textarea 
                className="form-control" 
                rows={2}
                value={footerText} 
                onChange={(e) => setFooterText(e.target.value)} 
                placeholder="e.g. Thank you for your business"
              />
            </div>

            <div className="d-flex justify-content-end">
              <button type="submit" className="btn btn-primary" disabled={loading}>
                {loading ? 'Saving...' : 'Save Changes'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
