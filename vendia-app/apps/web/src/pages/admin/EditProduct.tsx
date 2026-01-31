import React, { useState, useEffect } from 'react';
import { useProductStore, useCategoryStore, useAuxStore, Product } from '@vendia/shared';
import { useNavigate, useParams } from 'react-router-dom';

export const EditProduct = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { products, fetchProducts, updateProduct, loading, products: searchResults, fetchProducts: searchProducts } = useProductStore();
  const { categories, fetchCategories } = useCategoryStore();
  const { brands, units, warehouses, fetchBrands, fetchUnits, fetchWarehouses } = useAuxStore();
  
  // Product Information
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [sku, setSku] = useState('');
  const [barcode, setBarcode] = useState('');
  const [barcodeSymbology, setBarcodeSymbology] = useState('Code128');
  const [categoryId, setCategoryId] = useState('');
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
  const [images, setImages] = useState<FileList | null>(null);

  // Bundle Items
  const [bundleItems, setBundleItems] = useState<{id: number, name: string, quantity: number, price: number}[]>([]);
  const [searchTerm, setSearchTerm] = useState('');

  const [error, setError] = useState('');
  const [initialLoading, setInitialLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        products.length === 0 ? fetchProducts() : Promise.resolve(),
        categories.length === 0 ? fetchCategories() : Promise.resolve(),
        fetchBrands(),
        fetchUnits(),
        fetchWarehouses()
      ]);
      setInitialLoading(false);
    };
    loadData();
  }, [fetchProducts, fetchCategories, fetchBrands, fetchUnits, fetchWarehouses, products.length, categories.length]);

  useEffect(() => {
    const delayDebounceFn = setTimeout(() => {
      if (searchTerm) {
        searchProducts({ search: searchTerm, per_page: 5 });
      }
    }, 500);
    return () => clearTimeout(delayDebounceFn);
  }, [searchTerm, searchProducts]);

  useEffect(() => {
    if (!initialLoading && id) {
      const product = products.find(p => p.id === parseInt(id));
      if (product) {
        setName(product.name);
        setSlug(product.slug || '');
        setSku(product.sku);
        setBarcode(product.barcode || '');
        setBarcodeSymbology(product.barcode_symbology || 'Code128');
        setCategoryId(product.category_id ? product.category_id.toString() : '');
        setBrandId(product.brand_id ? product.brand_id.toString() : '');
        setUnitId(product.unit_id ? product.unit_id.toString() : '');
        setWarehouseId(product.warehouse_id ? product.warehouse_id.toString() : '');
        setDescription(product.description || '');
        
        setProductType(product.product_type || 'single');
        setPrice(product.price.toString());
        setStock(product.stock.toString());
        setQuantityAlert(product.quantity_alert ? product.quantity_alert.toString() : '0');
        setTaxType(product.tax_type || 'exclusive');
        setTaxAmount(product.tax_amount ? product.tax_amount.toString() : '0');
        setDiscountType(product.discount_type || 'fixed');
        setDiscountValue(product.discount_value ? product.discount_value.toString() : '0');

        if (product.product_type === 'bundle' && product.bundle_items) {
           setBundleItems(product.bundle_items.map(item => ({
             id: item.id,
             name: item.name,
             quantity: item.pivot.quantity,
             price: item.price
           })));
        }
      } else {
        setError('Product not found');
      }
    }
  }, [initialLoading, id, products]);

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

    if (!id) return;

    try {
      const formData = new FormData();
      formData.append('name', name);
      if (slug) formData.append('slug', slug);
      formData.append('sku', sku);
      if (barcode) formData.append('barcode', barcode);
      formData.append('barcode_symbology', barcodeSymbology);
      formData.append('category_id', categoryId);
      if (brandId) formData.append('brand_id', brandId);
      if (unitId) formData.append('unit_id', unitId);
      if (warehouseId) formData.append('warehouse_id', warehouseId);
      formData.append('description', description);
      
      formData.append('product_type', productType);
      formData.append('price', price);
      formData.append('stock', stock);
      formData.append('quantity_alert', quantityAlert);
      formData.append('tax_type', taxType);
      formData.append('tax_amount', taxAmount);
      formData.append('discount_type', discountType);
      formData.append('discount_value', discountValue);

      if (images) {
        for (let i = 0; i < images.length; i++) {
          formData.append('images[]', images[i]);
        }
      }

      if (productType === 'bundle') {
        bundleItems.forEach((item, index) => {
          formData.append(`bundle_items[${index}][id]`, item.id.toString());
          formData.append(`bundle_items[${index}][quantity]`, item.quantity.toString());
        });
      }

      await updateProduct(parseInt(id), formData);
      navigate('/products', { state: { success: 'Product updated successfully!' } });
    } catch (err: any) {
      setError(err.message || 'Failed to update product');
    }
  };

  if (initialLoading) return <div className="text-center mt-5"><div className="spinner-border text-primary" role="status"></div></div>;

  return (
    <div className="container-fluid p-4">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h2>Edit Product</h2>
        <button className="btn btn-secondary" onClick={() => navigate('/products')}>
          Back to List
        </button>
      </div>

      {error && <div className="alert alert-danger">{error}</div>}

      <form onSubmit={handleSubmit}>
        <div className="row">
          {/* Product Information Section */}
          <div className="col-lg-8">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0">Product Information</h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Product Name <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" value={name} onChange={e => setName(e.target.value)} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Slug</label>
                    <input type="text" className="form-control" value={slug} onChange={e => setSlug(e.target.value)} placeholder="Auto-generated if empty" />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-4">
                    <label className="form-label">SKU <span className="text-danger">*</span></label>
                    <input type="text" className="form-control" value={sku} onChange={e => setSku(e.target.value)} required />
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Barcode Symbology</label>
                    <select className="form-select" value={barcodeSymbology} onChange={e => setBarcodeSymbology(e.target.value)}>
                      <option value="Code128">Code 128</option>
                      <option value="Code39">Code 39</option>
                      <option value="EAN8">EAN-8</option>
                      <option value="EAN13">EAN-13</option>
                      <option value="UPC">UPC</option>
                    </select>
                  </div>
                  <div className="col-md-4">
                    <label className="form-label">Item Barcode</label>
                    <input type="text" className="form-control" value={barcode} onChange={e => setBarcode(e.target.value)} />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Category <span className="text-danger">*</span></label>
                    <select className="form-select" value={categoryId} onChange={e => setCategoryId(e.target.value)} required>
                      <option value="">Select Category</option>
                      {categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Brand</label>
                    <select className="form-select" value={brandId} onChange={e => setBrandId(e.target.value)}>
                      <option value="">Select Brand</option>
                      {brands.map(b => <option key={b.id} value={b.id}>{b.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Unit</label>
                    <select className="form-select" value={unitId} onChange={e => setUnitId(e.target.value)}>
                      <option value="">Select Unit</option>
                      {units.map(u => <option key={u.id} value={u.id}>{u.name}</option>)}
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Warehouse</label>
                    <select className="form-select" value={warehouseId} onChange={e => setWarehouseId(e.target.value)}>
                      <option value="">Select Warehouse</option>
                      {warehouses.map(w => <option key={w.id} value={w.id}>{w.name}</option>)}
                    </select>
                  </div>
                </div>

                <div className="mb-3">
                  <label className="form-label">Description</label>
                  <textarea className="form-control" rows={4} value={description} onChange={e => setDescription(e.target.value)}></textarea>
                </div>
              </div>
            </div>

            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0">Pricing & Stocks</h5>
              </div>
              <div className="card-body">
                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Product Type</label>
                    <select className="form-select" value={productType} onChange={e => setProductType(e.target.value)}>
                      <option value="single">Single Product</option>
                      <option value="variable">Variable Product</option>
                      <option value="bundle">Bundle/Set Product</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Quantity Alert</label>
                    <input type="number" className="form-control" value={quantityAlert} onChange={e => setQuantityAlert(e.target.value)} />
                  </div>
                </div>

                {productType === 'bundle' && (
                  <div className="mb-3">
                    <label className="form-label">Bundle Items</label>
                    <div className="card bg-light border-0 p-3">
                      <div className="mb-3 position-relative">
                        <input
                          type="text"
                          className="form-control"
                          placeholder="Search by Name, SKU, Barcode, or Description..."
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
                                <th>Product</th>
                                <th style={{ width: '100px' }}>Qty</th>
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
                        <p className="text-muted small mb-0 text-center">No items added to bundle yet.</p>
                      )}
                    </div>
                  </div>
                )}

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Price <span className="text-danger">*</span></label>
                    <input type="number" step="0.01" className="form-control" value={price} onChange={e => setPrice(e.target.value)} required />
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Quantity <span className="text-danger">*</span></label>
                    <input type="number" className="form-control" value={stock} onChange={e => setStock(e.target.value)} required />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Tax Type</label>
                    <select className="form-select" value={taxType} onChange={e => setTaxType(e.target.value)}>
                      <option value="exclusive">Exclusive</option>
                      <option value="inclusive">Inclusive</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Tax (%)</label>
                    <input type="number" step="0.01" className="form-control" value={taxAmount} onChange={e => setTaxAmount(e.target.value)} />
                  </div>
                </div>

                <div className="row mb-3">
                  <div className="col-md-6">
                    <label className="form-label">Discount Type</label>
                    <select className="form-select" value={discountType} onChange={e => setDiscountType(e.target.value)}>
                      <option value="fixed">Fixed</option>
                      <option value="percentage">Percentage</option>
                    </select>
                  </div>
                  <div className="col-md-6">
                    <label className="form-label">Discount Value</label>
                    <input type="number" step="0.01" className="form-control" value={discountValue} onChange={e => setDiscountValue(e.target.value)} />
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Images & Actions */}
          <div className="col-lg-4">
            <div className="card shadow-sm mb-4">
              <div className="card-header bg-white py-3">
                <h5 className="mb-0">Product Images</h5>
              </div>
              <div className="card-body">
                <div className="mb-3">
                  <label className="form-label">Upload New Images</label>
                  <input 
                    type="file" 
                    className="form-control" 
                    multiple 
                    accept="image/*"
                    onChange={e => setImages(e.target.files)} 
                  />
                  <div className="form-text">Allowed: jpg, jpeg, png, gif</div>
                </div>
                {/* Future: Display existing images here */}
              </div>
            </div>

            <div className="card shadow-sm">
              <div className="card-body">
                <button type="submit" className="btn btn-primary w-100 mb-2" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Product'}
                </button>
                <button type="button" className="btn btn-outline-secondary w-100" onClick={() => navigate('/products')}>
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      </form>
    </div>
  );
};
