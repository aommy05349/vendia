import React, { useMemo, useState, useEffect } from 'react';
import { useProductStore, useCategoryStore, useAuxStore, Product } from '@vendia/shared';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';

export const CreateProduct = () => {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { createProduct, loading, products: searchResults, fetchProducts: searchProducts } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { brands, units, warehouses, fetchBrands, fetchUnits, fetchWarehouses } = useAuxStore();
  const showTaxAndDiscountFields = false;
  const disableBarcodeFields = true;
  const [imageUrlInput, setImageUrlInput] = useState('');
  const [imageUrls, setImageUrls] = useState<string[]>([]);
  
  // Product Information
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [skuTouched, setSkuTouched] = useState(false);
  const [barcode, setBarcode] = useState('');
  const [barcodeSymbology, setBarcodeSymbology] = useState('Code128');
  const [categoryId, setCategoryId] = useState('');
  const [parentCategoryId, setParentCategoryId] = useState('');
  const [subCategoryId, setSubCategoryId] = useState('');
  const [brandId, setBrandId] = useState('');
  const [unitId, setUnitId] = useState('');
  const [warehouseId, setWarehouseId] = useState('');
  const [description, setDescription] = useState('');
  
  // Pricing & Stocks
  const [productType, setProductType] = useState('single');
  const [price, setPrice] = useState('');
  const [stock, setStock] = useState('');
  const [quantityAlert, setQuantityAlert] = useState('0');
  const [taxType, setTaxType] = useState('exclusive');
  const [taxAmount, setTaxAmount] = useState('0');
  const [discountType, setDiscountType] = useState('fixed');
  const [discountValue, setDiscountValue] = useState('0');
  
  // Images
  const [images, setImages] = useState<File[]>([]);

  // Bundle Items
  const [bundleItems, setBundleItems] = useState<{id: number, name: string, quantity: number, price: number}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const normalizeImageUrl = (value: string) => value.trim();
  const isValidImageUrl = (value: string) => /^https?:\/\/\S+$/i.test(value.trim());
  const addImageUrl = () => {
    const normalized = normalizeImageUrl(imageUrlInput);
    if (!normalized) return;
    if (!isValidImageUrl(normalized)) {
      setError(t('products.images.url_invalid', 'กรุณาใส่ลิงก์รูปภาพที่ขึ้นต้นด้วย http:// หรือ https://'));
      return;
    }
    setError('');
    setImageUrls(prev => (prev.includes(normalized) ? prev : [...prev, normalized]));
    setImageUrlInput('');
  };

  const [error, setError] = useState('');

  useEffect(() => {
    fetchCategories();
    fetchBrands(1, 1000);
    fetchUnits();
    fetchWarehouses();
  }, [fetchCategories, fetchBrands, fetchUnits, fetchWarehouses]);

  const parents = useMemo(() => categories.filter((c) => !c.parent_id), [categories]);
  const childrenByParent = useMemo(() => {
    return categories.reduce<Record<number, typeof categories>>((acc, c) => {
      if (c.parent_id) {
        acc[c.parent_id] = acc[c.parent_id] || [];
        acc[c.parent_id].push(c);
      }
      return acc;
    }, {});
  }, [categories]);

  const activeChildren = useMemo(() => {
    const pid = Number(parentCategoryId);
    if (!pid) return [];
    return (childrenByParent[pid] || []).slice().sort((a, b) => a.name.localeCompare(b.name));
  }, [childrenByParent, parentCategoryId]);

  useEffect(() => {
    if (!parentCategoryId) {
      setSubCategoryId('');
      setCategoryId('');
      return;
    }
    const pid = Number(parentCategoryId);
    const hasChildren = (childrenByParent[pid] || []).length > 0;
    if (hasChildren) {
      setSubCategoryId('');
      setCategoryId(parentCategoryId);
      return;
    }
    setSubCategoryId('');
    setCategoryId(parentCategoryId);
  }, [parentCategoryId, childrenByParent]);

  useEffect(() => {
    if (subCategoryId) {
      setCategoryId(subCategoryId);
    } else if (parentCategoryId) {
      setCategoryId(parentCategoryId);
    } else {
      setCategoryId('');
    }
  }, [subCategoryId, parentCategoryId]);

  useEffect(() => {
    if (!warehouseId && warehouses.length === 1) {
      setWarehouseId(warehouses[0]!.id.toString());
    }
  }, [warehouses, warehouseId]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        searchProducts({ search: searchTerm, per_page: 5 });
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchProducts]);

  const generateSku = (productName: string) => {
    const base = productName
      .trim()
      .toUpperCase()
      .replace(/[^A-Z0-9]+/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 12);
    const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
    return `${base || 'SKU'}-${suffix}`;
  };

  useEffect(() => {
    if (!skuTouched && name.trim() && !sku.trim()) {
      setSku(generateSku(name));
    }
  }, [name, skuTouched, sku]);

  const addBundleItem = (product: Product) => {
    if (bundleItems.find(item => item.id === product.id)) return;
    setBundleItems([...bundleItems, { id: product.id, name: product.name, quantity: 1, price: product.price }]);
    setSearchTerm(''); // Clear search after adding
  };

  const removeBundleItem = (id: number) => {
    setBundleItems(bundleItems.filter(item => item.id !== id));
  };

  const updateBundleItemQuantity = (id: number, quantity: number) => {
    setBundleItems(bundleItems.map(item => item.id === id ? { ...item, quantity } : item));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (productType === 'bundle' && bundleItems.length === 0) {
      setError(t('products.form.bundle.error_empty'));
      window.scrollTo(0, 0);
      return;
    }

    try {
      const formData = new FormData();
      formData.append('name', name);
      if (slug) formData.append('slug', slug);
      const skuToSubmit = sku.trim() || generateSku(name);
      formData.append('sku', skuToSubmit);
      if (barcode.trim()) {
        formData.append('barcode', barcode.trim());
        formData.append('barcode_symbology', barcodeSymbology);
      }
      formData.append('category_id', categoryId);
      if (brandId) formData.append('brand_id', brandId);
      if (unitId) formData.append('unit_id', unitId);
      if (warehouseId) formData.append('warehouse_id', warehouseId);
      formData.append('description', description);
      
      formData.append('product_type', productType);
      formData.append('price', price);
      
      if (productType === 'service') {
        formData.append('stock', '0'); // Service items don't track stock
      } else {
        formData.append('stock', stock);
      }
      
      formData.append('quantity_alert', productType === 'service' ? '0' : quantityAlert);
      formData.append('tax_type', taxType);
      formData.append('tax_amount', taxAmount);
      formData.append('discount_type', discountType);
      formData.append('discount_value', discountValue);

      if (images) {
        for (let i = 0; i < images.length; i++) {
          formData.append('images[]', images[i]);
        }
      }
      if (imageUrls.length) {
        imageUrls.forEach((url) => formData.append('image_urls[]', url));
      }

      if (productType === 'bundle') {
        bundleItems.forEach((item, index) => {
          formData.append(`bundle_items[${index}][id]`, item.id.toString());
          formData.append(`bundle_items[${index}][quantity]`, item.quantity.toString());
        });
      }

      await createProduct(formData);
      navigate('/products', { state: { success: t('products.alerts.create_success') } });
    } catch (err: any) {
      setError(err.message || t('products.alerts.create_error'));
    }
  };

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>{t('products.create_title')}</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/products')}>
          {t('products.form.buttons.back_to_list')}
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Product Information Section */}
          <div className="col-lg-8">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0">{t('products.form.sections.info')}</h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('products.form.fields.name')} <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('products.form.fields.slug')}</label>
                    <input type="text" className="form-control" value={slug} onChange={e => setSlug(e.target.value)} placeholder={t('products.form.fields.slug_placeholder')} />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">{t('products.form.fields.sku')} <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      value={sku}
                      onChange={e => {
                        setSkuTouched(true);
                        setSku(e.target.value);
                      }}
                      required
                    />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t('products.form.fields.barcode_symbology')}</label>
                    <select
                      className="form-select"
                      value={barcodeSymbology}
                      onChange={e => setBarcodeSymbology(e.target.value)}
                      disabled={disableBarcodeFields}
                    >
                      <option value="Code128">Code 128</option>
                      <option value="Code39">Code 39</option>
                      <option value="EAN8">EAN-8</option>
                      <option value="EAN13">EAN-13</option>
                      <option value="UPC">UPC</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">{t('products.form.fields.item_barcode')}</label>
                    <input
                      type="text"
                      className="form-control"
                      value={barcode}
                      onChange={e => setBarcode(e.target.value)}
                      disabled={disableBarcodeFields}
                    />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('products.form.fields.category')} <span className="text-danger">*</span></label>
                    <div className="border rounded p-3 bg-light">
                      <div className="mb-2 text-muted small">
                        {t('categories.form.hint_related', 'เลือกหมวดหลักก่อน แล้วเลือกหมวดย่อย (ถ้ามี)')}
                      </div>
                      <div className="mb-2">
                        <label className="form-label mb-1">{t('categories.parent_category', 'หมวดหลัก')}</label>
                        <select
                          className="form-select"
                          value={parentCategoryId}
                          onChange={(e) => setParentCategoryId(e.target.value)}
                          required
                        >
                          <option value="">{t('products.form.fields.select_category')}</option>
                          {parents.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="form-label mb-1 d-flex align-items-center gap-2">
                          <span>{t('categories.subcategory', 'หมวดย่อย')}</span>
                          <span className="text-muted small">{t('common.optional', '(ถ้ามี)')}</span>
                        </label>
                        <select
                          className="form-select"
                          value={subCategoryId}
                          onChange={(e) => setSubCategoryId(e.target.value)}
                          disabled={!parentCategoryId || activeChildren.length === 0}
                        >
                          {!parentCategoryId ? (
                            <option value="">{t('categories.subcategory_select_parent_first', 'เลือกหมวดหลักก่อน')}</option>
                          ) : activeChildren.length === 0 ? (
                            <option value="">{t('categories.subcategory_none', 'ไม่มีหมวดย่อย')}</option>
                          ) : (
                            <option value="">{t('categories.subcategory_use_parent', 'ใช้หมวดหลักนี้')}</option>
                          )}
                          {activeChildren.map((c) => (
                            <option key={c.id} value={String(c.id)}>
                              {c.name}
                            </option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('products.form.fields.brand')}</label>
                    <select className="form-select" value={brandId} onChange={e => setBrandId(e.target.value)}>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('products.form.fields.unit')}</label>
                    <select className="form-select" value={unitId} onChange={e => setUnitId(e.target.value)}>
                      <option value="">{t('products.form.fields.select_unit')}</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">{t('products.form.fields.warehouse')}</label>
                    <select
                      className="form-select"
                      value={warehouseId}
                      onChange={e => setWarehouseId(e.target.value)}
                      disabled={warehouses.length === 1}
                    >
                      <option value="">{t('products.form.fields.select_warehouse')}</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">{t('products.form.fields.description')}</label>
                  <textarea className="form-control" rows={4} value={description} onChange={e => setDescription(e.target.value)}></textarea>
                </div>
              </div>
            </div>

            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0">{t('products.form.sections.pricing')}</h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('products.form.fields.product_type')}</label>
                    <select className="form-select" value={productType} onChange={e => setProductType(e.target.value)}>
                      <option value="single">{t('products.form.fields.types.single')}</option>
                      <option value="bundle">{t('products.form.fields.types.bundle')}</option>
                      <option value="service">{t('products.form.fields.types.service')}</option>
                    </select>
                  </div>
                  {productType !== 'service' ? (
                    <div className="col-md-6">
                      <label className="form-label">{t('products.form.fields.quantity_alert')}</label>
                      <input type="number" className="form-control" value={quantityAlert} onChange={e => setQuantityAlert(e.target.value)} />
                    </div>
                  ) : (
                    <div className="col-md-6">
                      <label className="form-label">{t('products.form.fields.quantity_alert')}</label>
                      <input type="text" className="form-control" value={t('products.form.service.no_stock_alert', 'บริการไม่ใช้การแจ้งเตือนสต๊อก')} disabled />
                    </div>
                  )}
                </div>

                {productType === 'bundle' && (
                  <div className="mb-3">
                    <label className="form-label">{t('products.form.bundle.title')}</label>
                    <div className="card bg-light border-0 p-3">
                      <div className="mb-3 position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder={t('products.form.bundle.search_placeholder')}
                          value={searchTerm}
                          onChange={(e) => setSearchTerm(e.target.value)}
                        />
                        {searchTerm && searchResults && searchResults.length > 0 && (
                          <ul className="list-group position-absolute w-100 shadow-sm" style={{ zIndex: 1000, maxHeight: '200px', overflowY: 'auto' }}>
                            {searchResults.map(product => (
                              <button
                                key={product.id}
                                type="button"
                                className="list-group-item list-group-item-action d-flex justify-content-between align-items-center"
                                onClick={() => addBundleItem(product)}
                              >
                                <span>{product.name} ({product.sku})</span>
                                <span className="badge bg-primary rounded-pill">฿{product.price}</span>
                              </button>
                            ))}
                          </ul>
                        )}
                      </div>

                      {bundleItems.length > 0 ? (
                        <div className="table-responsive bg-white rounded shadow-sm">
                          <table className="table mb-0">
                            <thead>
                              <tr>
                                <th>{t('products.form.bundle.table.product')}</th>
                                <th style={{ width: '100px' }}>{t('products.form.bundle.table.qty')}</th>
                                <th style={{ width: '50px' }}></th>
                              </tr>
                            </thead>
                            <tbody>
                              {bundleItems.map((item) => (
                                <tr key={item.id}>
                                  <td className="align-middle">{item.name}</td>
                                  <td>
                                    <input
                                      type="number"
                                      className="form-control form-control-sm"
                                      min="1"
                                      value={item.quantity}
                                      onChange={(e) => updateBundleItemQuantity(item.id, parseInt(e.target.value) || 1)}
                                    />
                                  </td>
                                  <td className="align-middle">
                                    <button
                                      type="button"
                                      className="btn btn-sm btn-outline-danger"
                                      onClick={() => removeBundleItem(item.id)}
                                    >
                                      &times;
                                    </button>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <p className="text-muted small mb-0 text-center">{t('products.form.bundle.no_items')}</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">{t('products.form.fields.price')} <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      step="0.01"
                      min={productType === 'service' ? undefined : 0}
                      className="form-control"
                      value={price}
                      onChange={e => setPrice(e.target.value)}
                      required
                    />
                  </div>
                  {productType !== 'service' && (
                  <div className="col-md-6">
                    <label className="form-label">{t('products.form.fields.quantity')} <span className="text-danger">*</span></label>
                    <input type="number" className="form-control" value={stock} onChange={e => setStock(e.target.value)} required />
                  </div>
                  )}
                </div>

                {showTaxAndDiscountFields && (
                  <>
                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">{t('products.form.fields.tax_type')}</label>
                        <select className="form-select" value={taxType} onChange={e => setTaxType(e.target.value)}>
                          <option value="exclusive">{t('products.form.fields.tax_types.exclusive')}</option>
                          <option value="inclusive">{t('products.form.fields.tax_types.inclusive')}</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">{t('products.form.fields.tax_amount')}</label>
                        <input type="number" step="0.01" className="form-control" value={taxAmount} onChange={e => setTaxAmount(e.target.value)} />
                      </div>
                    </div>

                    <div className="row mb-3">
                      <div className="col-md-6">
                        <label className="form-label">{t('products.form.fields.discount_type')}</label>
                        <select className="form-select" value={discountType} onChange={e => setDiscountType(e.target.value)}>
                          <option value="fixed">{t('products.form.fields.discount_types.fixed')}</option>
                          <option value="percentage">{t('products.form.fields.discount_types.percentage')}</option>
                        </select>
                      </div>
                      <div className="col-md-6">
                        <label className="form-label">{t('products.form.fields.discount_value')}</label>
                        <input type="number" step="0.01" className="form-control" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
                      </div>
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Right Column: Images & Actions */}
          <div className="col-lg-4">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0">{t('products.form.sections.images')}</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">{t('products.form.fields.upload_images')}</label>
                  <div 
                    className="border rounded-3 p-4 text-center position-relative"
                    style={{ borderStyle: 'dashed', cursor: 'pointer', backgroundColor: '#f8f9fa', transition: 'all 0.2s' }}
                    onClick={() => document.getElementById('image-upload')?.click()}
                    onDragOver={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#e9ecef'; e.currentTarget.style.borderColor = '#0d6efd'; }}
                    onDragLeave={(e) => { e.preventDefault(); e.currentTarget.style.backgroundColor = '#f8f9fa'; e.currentTarget.style.borderColor = '#dee2e6'; }}
                    onDrop={(e) => {
                      e.preventDefault();
                      e.currentTarget.style.backgroundColor = '#f8f9fa';
                      e.currentTarget.style.borderColor = '#dee2e6';
                      if (e.dataTransfer.files) {
                        setImages(prev => [...prev, ...Array.from(e.dataTransfer.files).filter(file => file.type.startsWith('image/'))]);
                      }
                    }}
                  >
                    <i className="bi bi-cloud-arrow-up text-primary display-4 mb-2 d-block"></i>
                    <span className="text-muted fw-medium d-block mb-1">Click to upload or drag and drop</span>
                    <span className="text-muted small d-block" style={{ fontSize: '0.8rem' }}>SVG, PNG, JPG or GIF</span>
                    <input 
                      id="image-upload"
                      type="file" 
                      className="d-none" 
                      multiple 
                      accept="image/*"
                      onChange={e => {
                        if (e.target.files) {
                          const files = Array.from(e.target.files);
                          setImages(prev => [...prev, ...files]);
                          e.target.value = '';
                        }
                      }} 
                    />
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">{t('products.form.fields.image_url', 'ลิงก์รูปภาพ')}</label>
                  <div className="input-group">
                    <input
                      type="text"
                      className="form-control"
                      value={imageUrlInput}
                      onChange={(e) => setImageUrlInput(e.target.value)}
                      placeholder="https://..."
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          addImageUrl();
                        }
                      }}
                    />
                    <button type="button" className="btn btn-outline-primary" onClick={addImageUrl}>
                      {t('common.add', 'เพิ่ม')}
                    </button>
                  </div>
                </div>
                
                {(images.length > 0 || imageUrls.length > 0) && (
                  <div className="row g-2">
                    {images.map((file, index) => (
                      <div key={index} className="col-4 col-md-6 position-relative">
                        <div className="border rounded overflow-hidden position-relative" style={{ paddingTop: '100%' }}>
                          <img 
                            src={URL.createObjectURL(file)} 
                            alt={`Preview ${index}`} 
                            className="position-absolute top-0 start-0 w-100 h-100"
                            style={{ objectFit: 'cover' }} 
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm"
                          style={{ width: '24px', height: '24px' }}
                          onClick={() => setImages(prev => prev.filter((_, i) => i !== index))}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                    {imageUrls.map((url, index) => (
                      <div key={`${url}-${index}`} className="col-4 col-md-6 position-relative">
                        <div className="border rounded overflow-hidden position-relative" style={{ paddingTop: '100%' }}>
                          <img
                            src={url}
                            alt={`URL Preview ${index}`}
                            className="position-absolute top-0 start-0 w-100 h-100"
                            style={{ objectFit: 'cover' }}
                          />
                        </div>
                        <button
                          type="button"
                          className="btn btn-danger btn-sm position-absolute top-0 end-0 m-1 rounded-circle p-0 d-flex align-items-center justify-content-center shadow-sm"
                          style={{ width: '24px', height: '24px' }}
                          onClick={() => setImageUrls(prev => prev.filter((u) => u !== url))}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-body">
                <button type="submit" className="btn btn-primary w-100 mb-2" disabled={loading}>
                  {loading ? t('products.form.buttons.creating') : t('products.form.buttons.create')}
                </button>
                <button type="button" className="btn btn-outline-secondary w-100" onClick={() => navigate('/products')}>
                  {t('products.form.buttons.cancel')}
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
