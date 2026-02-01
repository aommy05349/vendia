import React, { useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { useAuthStore, api, useShopStore } from '@vendia/shared';
import { DashboardLayout } from './layouts/DashboardLayout';
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
import { OrderList } from './pages/admin/OrderList';
import { CustomerList } from './pages/admin/CustomerList';
import { CreateCustomer } from './pages/admin/CreateCustomer';
import { EditCustomer } from './pages/admin/EditCustomer';
import { PrintOrder } from './pages/PrintOrder';
import { TechnicianDashboard } from './pages/technician/TechnicianDashboard';
import { AttendanceHistory } from './pages/admin/AttendanceHistory';
import { AppointmentList } from './pages/admin/AppointmentList';
import { CreateAppointment } from './pages/admin/CreateAppointment';
import { AppointmentDetail } from './pages/admin/AppointmentDetail';
import { EditAppointment } from './pages/admin/EditAppointment';
import { TechnicianJobs } from './pages/technician/TechnicianJobs';

function App() {
  const { user, login } = useAuthStore();
  const { shop, fetchShop } = useShopStore();
  const [email, setEmail] = React.useState('');
  const [password, setPassword] = React.useState('');
  const [error, setError] = React.useState('');

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
      setError('Invalid credentials');
    }
  };

  if (!user) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-light p-3">
        <div className="card shadow-sm w-100" style={{ maxWidth: '400px' }}>
          <div className="card-body p-4">
            <div className="text-center mb-4">
              {shop?.logo_path && (
                <img 
                  src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${shop.logo_path}`} 
                  alt="Shop Logo" 
                  className="mb-3"
                  style={{ maxHeight: '80px' }} 
                />
              )}
              <h1 className="h3">{shop?.name || 'Vendia Login'}</h1>
            </div>
            {error && <div className="alert alert-danger text-center py-2">{error}</div>}
            <form onSubmit={handleLogin} className="d-flex flex-column gap-3">
              <input
                type="email"
                placeholder="Email"
                className="form-control"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
              <input
                type="password"
                placeholder="Password"
                className="form-control"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
              <button type="submit" className="btn btn-primary w-100 fw-bold">
                Login
              </button>
            </form>
            <div className="mt-4 text-center small text-muted">
              <div className="mb-2 fw-bold">Demo Credentials:</div>
              <div>Admin: admin@vendia.com / password</div>
              <div>Staff: staff@vendia.com / password</div>
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
          <Route index element={<Pos />} />
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
          <Route path="orders" element={<OrderList />} />
          <Route path="customers" element={<CustomerList />} />
          <Route path="customers/create" element={<CreateCustomer />} />
          <Route path="customers/:id/edit" element={<EditCustomer />} />
          <Route path="technician" element={
            user.role === 'technician' || user.role === 'admin' ? <TechnicianDashboard /> : <Navigate to="/" />
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
        </Route>
        <Route path="/print/order/:id" element={<PrintOrder />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
