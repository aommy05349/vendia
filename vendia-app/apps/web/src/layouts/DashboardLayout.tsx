import React from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuthStore, useShopStore } from '@vendia/shared';

export const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const { shop } = useShopStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div className="container mt-5"><div className="alert alert-warning">Please login</div></div>;
  }

  return (
    <div className="d-flex min-vh-100">
      {/* Sidebar */}
      <aside className="bg-light border-end p-3 d-flex flex-column" style={{ width: '250px' }}>
        <div className="mb-4 text-center">
          {shop?.logo_path && (
            <img 
              src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${shop.logo_path}`} 
              alt="Logo" 
              className="mb-2 img-fluid d-block mx-auto"
              style={{ maxHeight: '60px' }} 
            />
          )}
          <h2 className="h4 text-dark m-0">{shop?.name || 'Vendia POS'}</h2>
        </div>
        <nav className="nav flex-column gap-2">
          <Link to="/" className="nav-link bg-white border rounded text-dark">🛒 POS System</Link>
          
          {user.role === 'admin' && (
            <>
              <div className="mt-4 mb-2 text-muted fw-bold small ps-2">ADMIN</div>
              <Link to="/users" className="nav-link bg-white border rounded text-dark">👥 User Management</Link>
              <Link to="/categories" className="nav-link bg-white border rounded text-dark">📁 Categories</Link>
              <Link to="/products" className="nav-link bg-white border rounded text-dark">📦 Products</Link>
              <Link to="/brands" className="nav-link bg-white border rounded text-dark">🏷️ Brands</Link>
              <Link to="/units" className="nav-link bg-white border rounded text-dark">⚖️ Units</Link>
              <Link to="/warehouses" className="nav-link bg-white border rounded text-dark">🏭 Warehouses</Link>
              <Link to="/settings" className="nav-link bg-white border rounded text-dark">⚙️ Shop Settings</Link>
            </>
          )}
        </nav>
        
        <div className="mt-auto pt-3 border-top">
          <div className="d-flex align-items-center gap-2 mb-3">
            <div className="rounded-circle bg-secondary bg-opacity-25 d-flex align-items-center justify-content-center overflow-hidden" style={{ width: '40px', height: '40px' }}>
               {/* Placeholder for user image if available, else initials */}
               <div className="fw-bold text-secondary">
                 {user.name.charAt(0)}
               </div>
            </div>
            <div>
                <div className="fw-bold small">{user.name}</div>
                <div className="small text-muted text-capitalize">{user.role}</div>
            </div>
          </div>
          <button onClick={handleLogout} className="btn btn-danger w-100 bg-danger bg-opacity-10 text-danger border-0 fw-bold">
            Logout
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-grow-1 overflow-auto bg-white">
        <Outlet />
      </main>
    </div>
  );
};
