import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, api, useShopStore } from '@vendia/shared';
import { useTranslation } from 'react-i18next';
import { DashboardLayout } from './layouts/DashboardLayout';
import { LanguageSwitcher } from './components/LanguageSwitcher';
import { Pos } from './pages/Pos';
import { UserList } from './pages/admin/UserList';
import { CreateUser } from './pages/admin/CreateUser';
import { EditUser } from './pages/admin/EditUser';
import ShopSettings from './pages/admin/ShopSettings';
import { CategoryList } from './pages/admin/CategoryList';
import { CreateCategory } from './pages/admin/CreateCategory';
import { EditCategory } from './pages/admin/EditCategory';
import { ProductList } from './pages/admin/ProductList';
import { CreateProduct } from './pages/admin/CreateProduct';
import { EditProduct } from './pages/admin/EditProduct';
import { BrandList } from './pages/admin/BrandList';
import { CreateBrand } from './pages/admin/CreateBrand';
import { EditBrand } from './pages/admin/EditBrand';
import { UnitList } from './pages/admin/UnitList';
import { CreateUnit } from './pages/admin/CreateUnit';
import { EditUnit } from './pages/admin/EditUnit';
import { WarehouseList } from './pages/admin/WarehouseList';
import { CreateWarehouse } from './pages/admin/CreateWarehouse';
import { EditWarehouse } from './pages/admin/EditWarehouse';
import { DocumentList } from './pages/admin/DocumentList';
import { OrderList } from './pages/admin/OrderList';
import { OrderDetail } from './pages/admin/OrderDetail';
import { Dashboard } from './pages/admin/Dashboard';
import { CustomerList } from './pages/admin/CustomerList';
import { CreateCustomer } from './pages/admin/CreateCustomer';
import { EditCustomer } from './pages/admin/EditCustomer';
import { PrintOrder } from './pages/PrintOrder';
import { TechnicianDashboard } from './pages/technician/TechnicianDashboard';
import { TeamList } from './pages/admin/TeamList';
import { AttendanceHistory } from './pages/admin/AttendanceHistory';
import { AppointmentList } from './pages/admin/AppointmentList';
import { CreateAppointment } from './pages/admin/CreateAppointment';
import { AppointmentDetail } from './pages/admin/AppointmentDetail';
import { EditAppointment } from './pages/admin/EditAppointment';
import { TechnicianJobs } from './pages/technician/TechnicianJobs';
import { Profile } from './pages/Profile';

function App() {
  const { user, login } = useAuthStore();
  const { shop, fetchShop } = useShopStore();
  const { t } = useTranslation();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');
  const [loginBgOk, setLoginBgOk] = React.useState(true);
  const apiUrlRaw = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';
  const apiUrl = typeof apiUrlRaw === 'string' ? apiUrlRaw : 'http://localhost:8000/api';
  const apiUrlNormalized = apiUrl.replace(/^https:\/(?!\/)/, 'https://').replace(/^http:\/(?!\/)/, 'http://');
  const apiOrigin = apiUrlNormalized.replace(/\/api\/?$/, '');
  const loginBgUrl = '/avatars/coverprofile.png';

  const getStorageUrl = (path?: string | null) => {
    if (!path) return '';
    if (path.startsWith('http://') || path.startsWith('https://')) {
      return path.replace('/api/storage/', '/storage/');
    }

    let normalizedPath = path.startsWith('/') ? path : `/${path}`;
    if (normalizedPath.startsWith('/api/storage/')) {
      normalizedPath = normalizedPath.replace(/^\/api\/storage\//, '/storage/');
    }
    if (normalizedPath.startsWith('/storage/')) {
      return `${apiOrigin}${normalizedPath}`;
    }
    return `${apiOrigin}/storage${normalizedPath}`;
  };

  useEffect(() => {
    fetchShop();
  }, [fetchShop]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const response = await api.post('/login', { email, password });
      login(response.data.user, response.data.access_token);
    } catch (err: any) {
      console.error(err);
      const messageFromApi = err?.response?.data?.message;
      const errorsFromApi = err?.response?.data?.errors;
      const firstError =
        errorsFromApi && typeof errorsFromApi === 'object'
          ? Object.values(errorsFromApi).flat()?.[0]
          : undefined;

      setError(
        (typeof firstError === 'string' && firstError) ||
          (typeof messageFromApi === 'string' && messageFromApi) ||
          t('login.invalid_credentials')
      );
    }
  };

  if (!user) {
    return (
      <div className="min-vh-100 d-flex align-items-center bg-light py-4">
        <div className="container">
          <div className="card border-0 shadow-lg overflow-hidden" style={{ borderRadius: '18px' }}>
            <div className="row g-0">
              <div className="d-none d-lg-block col-lg-6 position-relative">
                {loginBgOk ? (
                  <img
                    src={loginBgUrl}
                    alt="Login Background"
                    className="w-100 h-100"
                    style={{ objectFit: 'cover', minHeight: '640px' }}
                    onError={() => setLoginBgOk(false)}
                  />
                ) : (
                  <div
                    className="w-100 h-100"
                    style={{
                      minHeight: '640px',
                      background:
                        'linear-gradient(135deg, rgba(15, 23, 42, 1) 0%, rgba(30, 58, 138, 1) 50%, rgba(15, 23, 42, 1) 100%)',
                    }}
                  />
                )}
                <div
                  className="position-absolute top-0 start-0 w-100 h-100"
                  style={{
                    background:
                      'linear-gradient(180deg, rgba(2, 6, 23, 0.25) 0%, rgba(2, 6, 23, 0.65) 70%, rgba(2, 6, 23, 0.92) 100%)',
                  }}
                />
                <div className="position-absolute bottom-0 start-0 p-4 p-xl-5 text-white" style={{ maxWidth: '540px' }}>
                  <div className="fw-bold" style={{ letterSpacing: '0.02em' }}>
                    {shop?.name || t('login.title', 'Login')}
                  </div>
                  <div className="opacity-75 mt-2">
                    {t('login.subtitle', 'เข้าสู่ระบบเพื่อจัดการงานขาย เอกสาร และงานติดตั้ง')}
                  </div>
                </div>
              </div>

              <div className="col-12 col-lg-6 position-relative bg-white">
                <div className="position-absolute top-0 end-0 p-3">
                  <LanguageSwitcher />
                </div>

                <div className="p-4 p-md-5 d-flex flex-column justify-content-center" style={{ minHeight: '640px' }}>
                  <div className="text-center mb-4">
                    {shop?.logo_path ? (
                      <img
                        src={getStorageUrl(shop.logo_path)}
                        alt="Shop Logo"
                        style={{ maxHeight: '72px', maxWidth: '240px', objectFit: 'contain' }}
                      />
                    ) : (
                      <div className="d-inline-flex align-items-center justify-content-center rounded-4 bg-light" style={{ width: '72px', height: '72px' }}>
                        <i className="bi bi-shop text-primary" style={{ fontSize: '1.8rem' }}></i>
                      </div>
                    )}
                  </div>

                  <div className="text-center mb-4">
                    <div className="fw-bold" style={{ fontSize: '1.6rem' }}>
                      {t('login.welcome_back', 'Welcome Back')}
                    </div>
                    <div className="text-muted small mt-1">
                      {shop?.company_name || shop?.name || t('login.title')}
                    </div>
                  </div>

                  <div className="mx-auto w-100" style={{ maxWidth: '420px' }}>
                    {error && <div className="alert alert-danger text-center py-2 mb-3">{error}</div>}

                    <form onSubmit={handleLogin} className="d-flex flex-column gap-3">
                      <div className="input-group">
                        <span className="input-group-text bg-white">
                          <i className="bi bi-envelope text-muted"></i>
                        </span>
                        <input
                          type="email"
                          placeholder={t('login.email')}
                          className="form-control"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            if (error) setError('');
                          }}
                          autoComplete="email"
                          required
                        />
                      </div>

                      <div className="input-group">
                        <span className="input-group-text bg-white">
                          <i className="bi bi-lock text-muted"></i>
                        </span>
                        <input
                          type="password"
                          placeholder={t('login.password')}
                          className="form-control"
                          value={password}
                          onChange={(e) => {
                            setPassword(e.target.value);
                            if (error) setError('');
                          }}
                          autoComplete="current-password"
                          required
                        />
                      </div>

                      <button type="submit" className="btn btn-primary w-100 fw-semibold rounded-pill py-2">
                        {t('login.title')}
                      </button>
                    </form>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<DashboardLayout />}>
          <Route
            index
            element={
              user.role === 'technician' ? <Navigate to="/technician" replace /> : <Pos />
            }
          />
          <Route path="pos" element={<Pos />} />
          <Route path="users" element={
            user.role === 'admin' ? <UserList /> : <Navigate to="/" />
          } />
          <Route path="users/create" element={
            user.role === 'admin' ? <CreateUser /> : <Navigate to="/" />
          } />
          <Route path="users/:id/edit" element={
            user.role === 'admin' ? <EditUser /> : <Navigate to="/" />
          } />
          <Route path="categories" element={
            user.role === 'admin' ? <CategoryList /> : <Navigate to="/" />
          } />
          <Route path="categories/create" element={
            user.role === 'admin' ? <CreateCategory /> : <Navigate to="/" />
          } />
          <Route path="categories/:id/edit" element={
            user.role === 'admin' ? <EditCategory /> : <Navigate to="/" />
          } />
          <Route path="products" element={
            user.role === 'admin' ? <ProductList /> : <Navigate to="/" />
          } />
          <Route path="products/create" element={
            user.role === 'admin' ? <CreateProduct /> : <Navigate to="/" />
          } />
          <Route path="products/:id/edit" element={
            user.role === 'admin' ? <EditProduct /> : <Navigate to="/" />
          } />
          {/* Brands */}
          <Route path="brands" element={
            user.role === 'admin' ? <BrandList /> : <Navigate to="/" />
          } />
          <Route path="brands/create" element={
            user.role === 'admin' ? <CreateBrand /> : <Navigate to="/" />
          } />
          <Route path="brands/:id/edit" element={
            user.role === 'admin' ? <EditBrand /> : <Navigate to="/" />
          } />
          {/* Units */}
          <Route path="units" element={
            user.role === 'admin' ? <UnitList /> : <Navigate to="/" />
          } />
          <Route path="units/create" element={
            user.role === 'admin' ? <CreateUnit /> : <Navigate to="/" />
          } />
          <Route path="units/:id/edit" element={
            user.role === 'admin' ? <EditUnit /> : <Navigate to="/" />
          } />
          {/* Warehouses */}
          <Route path="warehouses" element={
            user.role === 'admin' ? <WarehouseList /> : <Navigate to="/" />
          } />
          <Route path="warehouses/create" element={
            user.role === 'admin' ? <CreateWarehouse /> : <Navigate to="/" />
          } />
          <Route path="warehouses/:id/edit" element={
            user.role === 'admin' ? <EditWarehouse /> : <Navigate to="/" />
          } />
          <Route path="settings" element={
            user.role === 'admin' ? <ShopSettings /> : <Navigate to="/" />
          } />
          <Route path="dashboard" element={
            user.role === 'admin' ? <Dashboard /> : <Navigate to="/" />
          } />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="documents" element={
            user.role === 'admin' ? <DocumentList /> : <Navigate to="/" />
          } />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/create" element={<CreateCustomer />} />
          <Route path="customers/:id/edit" element={<EditCustomer />} />
          <Route path="technician" element={
            user.role === 'technician' || user.role === 'admin' ? <TechnicianDashboard /> : <Navigate to="/" />
          } />
          <Route path="teams" element={
            user.role === 'admin' ? <TeamList /> : <Navigate to="/" />
          } />
          <Route path="attendance/history" element={
            user.role === 'admin' ? <AttendanceHistory /> : <Navigate to="/" />
          } />
          {/* Appointments */}
          <Route path="appointments" element={
            user.role === 'admin' || user.role === 'technician' ? <AppointmentList /> : <Navigate to="/" />
          } />
          <Route path="appointments/create" element={
            user.role === 'admin' ? <CreateAppointment /> : <Navigate to="/" />
          } />
          <Route path="appointments/:id" element={
            user.role === 'admin' || user.role === 'technician' ? <AppointmentDetail /> : <Navigate to="/" />
          } />
          <Route path="appointments/:id/edit" element={
            user.role === 'admin' ? <EditAppointment /> : <Navigate to="/" />
          } />
          <Route path="technician/jobs" element={
            user.role === 'technician' || user.role === 'admin' ? <TechnicianJobs /> : <Navigate to="/" />
          } />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="/print/order/:id" element={<PrintOrder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
