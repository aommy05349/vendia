import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
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
import { SubcategoryDashboard } from './pages/admin/SubcategoryDashboard';
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
import { LandingPage } from './pages/LandingPage';

function App() {
  const { user, login } = useAuthStore();
  const { shop, fetchShop } = useShopStore();
  const { t } = useTranslation();
  const role = user?.role;
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

  const LoginPage = () => {
    const [email, setEmail] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [error, setError] = React.useState('');
    const [loginBgOk, setLoginBgOk] = React.useState(true);

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
  };

  const AdminIndex = () => {
    if (user?.role === 'technician') return <Navigate to="technician" replace />;
    if (user?.role === 'admin') return <Navigate to="dashboard" replace />;
    return <Navigate to="pos" replace />;
  };

  const RequireAuth = ({ children }: { children: React.ReactNode }) => {
    if (!user) return <Navigate to="/admin/login" replace />;
    return <>{children}</>;
  };

  const MaybeLegacyRedirect = () => {
    const location = useLocation();
    const seg = (location.pathname.split('/')[1] || '').trim();
    const allow = new Set([
      'pos',
      'orders',
      'customers',
      'dashboard',
      'documents',
      'users',
      'products',
      'categories',
      'units',
      'brands',
      'warehouses',
      'settings',
      'appointments',
      'teams',
      'technician',
      'profile',
      'attendance',
    ]);
    if (allow.has(seg)) return <Navigate to={`/admin${location.pathname}`} replace />;
    return <Navigate to="/" replace />;
  };

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<LandingPage shop={shop} user={user} getStorageUrl={getStorageUrl} />} />
        <Route path="/admin/login" element={user ? <Navigate to="/admin" replace /> : <LoginPage />} />
        <Route path="/login" element={<Navigate to="/admin/login" replace />} />

        <Route path="/admin" element={<RequireAuth><DashboardLayout /></RequireAuth>}>
          <Route
            index
            element={<AdminIndex />}
          />
          <Route path="pos" element={<Pos />} />
          <Route path="users" element={
            role === 'admin' ? <UserList /> : <Navigate to="/admin" replace />
          } />
          <Route path="users/create" element={
            role === 'admin' ? <CreateUser /> : <Navigate to="/admin" replace />
          } />
          <Route path="users/:id/edit" element={
            role === 'admin' ? <EditUser /> : <Navigate to="/admin" replace />
          } />
          <Route path="categories" element={
            role === 'admin' ? <CategoryList /> : <Navigate to="/admin" replace />
          } />
          <Route path="categories/create" element={
            role === 'admin' ? <CreateCategory /> : <Navigate to="/admin" replace />
          } />
          <Route path="categories/:id/edit" element={
            role === 'admin' ? <EditCategory /> : <Navigate to="/admin" replace />
          } />
          <Route path="products" element={
            role === 'admin' ? <ProductList /> : <Navigate to="/admin" replace />
          } />
          <Route path="products/create" element={
            role === 'admin' ? <CreateProduct /> : <Navigate to="/admin" replace />
          } />
          <Route path="products/:id/edit" element={
            role === 'admin' ? <EditProduct /> : <Navigate to="/admin" replace />
          } />
          {/* Brands */}
          <Route path="brands" element={
            role === 'admin' ? <BrandList /> : <Navigate to="/admin" replace />
          } />
          <Route path="brands/create" element={
            role === 'admin' ? <CreateBrand /> : <Navigate to="/admin" replace />
          } />
          <Route path="brands/:id/edit" element={
            role === 'admin' ? <EditBrand /> : <Navigate to="/admin" replace />
          } />
          {/* Units */}
          <Route path="units" element={
            role === 'admin' ? <UnitList /> : <Navigate to="/admin" replace />
          } />
          <Route path="units/create" element={
            role === 'admin' ? <CreateUnit /> : <Navigate to="/admin" replace />
          } />
          <Route path="units/:id/edit" element={
            role === 'admin' ? <EditUnit /> : <Navigate to="/admin" replace />
          } />
          {/* Warehouses */}
          <Route path="warehouses" element={
            role === 'admin' ? <WarehouseList /> : <Navigate to="/admin" replace />
          } />
          <Route path="warehouses/create" element={
            role === 'admin' ? <CreateWarehouse /> : <Navigate to="/admin" replace />
          } />
          <Route path="warehouses/:id/edit" element={
            role === 'admin' ? <EditWarehouse /> : <Navigate to="/admin" replace />
          } />
          <Route path="settings" element={
            role === 'admin' ? <ShopSettings /> : <Navigate to="/admin" replace />
          } />
          <Route path="dashboard" element={
            role === 'admin' ? <Dashboard /> : <Navigate to="/admin" replace />
          } />
          <Route path="dashboard/subcategory" element={
            role === 'admin' ? <SubcategoryDashboard /> : <Navigate to="/admin" replace />
          } />
          <Route path="orders" element={<OrderList />} />
          <Route path="orders/:id" element={<OrderDetail />} />
          <Route path="documents" element={
            role === 'admin' ? <DocumentList /> : <Navigate to="/admin" replace />
          } />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/create" element={<CreateCustomer />} />
          <Route path="customers/:id/edit" element={<EditCustomer />} />
          <Route path="technician" element={
            role === 'technician' || role === 'admin' ? <TechnicianDashboard /> : <Navigate to="/admin" replace />
          } />
          <Route path="teams" element={
            role === 'admin' ? <TeamList /> : <Navigate to="/admin" replace />
          } />
          <Route path="attendance/history" element={
            role === 'admin' ? <AttendanceHistory /> : <Navigate to="/admin" replace />
          } />
          {/* Appointments */}
          <Route path="appointments" element={
            role === 'admin' || role === 'technician' ? <AppointmentList /> : <Navigate to="/admin" replace />
          } />
          <Route path="appointments/create" element={
            role === 'admin' ? <CreateAppointment /> : <Navigate to="/admin" replace />
          } />
          <Route path="appointments/:id" element={
            role === 'admin' || role === 'technician' ? <AppointmentDetail /> : <Navigate to="/admin" replace />
          } />
          <Route path="appointments/:id/edit" element={
            role === 'admin' ? <EditAppointment /> : <Navigate to="/admin" replace />
          } />
          <Route path="technician/jobs" element={
            role === 'technician' || role === 'admin' ? <TechnicianJobs /> : <Navigate to="/admin" replace />
          } />
          <Route path="profile" element={<Profile />} />
        </Route>
        <Route path="/print/order/:id" element={<PrintOrder />} />
        <Route path="/:seg/*" element={<MaybeLegacyRedirect />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
