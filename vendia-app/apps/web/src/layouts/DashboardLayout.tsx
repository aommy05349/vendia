import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useShopStore } from '@vendia/shared';

export const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const { shop } = useShopStore();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setShowMobileSidebar(false);
  }, [location]);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div className="container mt-5"><div className="alert alert-warning">Please login</div></div>;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Mobile Header */}
      <header className="d-lg-none bg-white border-bottom p-3 d-flex justify-content-between align-items-center sticky-top shadow-sm">
        <div className="d-flex align-items-center gap-2">
          {shop?.logo_path && (
            <img 
              src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${shop.logo_path}`} 
              alt="Logo" 
              style={{ maxHeight: '32px' }} 
            />
          )}
          <h1 className="h5 m-0 fw-bold">{shop?.name || 'Vendia POS'}</h1>
        </div>
        <button 
          className="btn btn-light border" 
          onClick={() => setShowMobileSidebar(!showMobileSidebar)}
          aria-label="Toggle menu"
        >
          <span className="fs-5">☰</span>
        </button>
      </header>

      <div className="d-flex flex-grow-1 position-relative">
        {/* Mobile Backdrop */}
        {showMobileSidebar && (
          <div 
            className="d-lg-none position-fixed top-0 start-0 w-100 h-100 bg-dark bg-opacity-50"
            onClick={() => setShowMobileSidebar(false)}
            style={{ backdropFilter: 'blur(2px)', zIndex: 1040 }}
          />
        )}

        {/* Sidebar */}
        <aside 
          className={`bg-light border-end p-3 d-flex flex-column ${showMobileSidebar ? 'position-fixed top-0 start-0 h-100 shadow' : 'd-none d-lg-flex'}`} 
          style={{ width: '250px', minWidth: '250px', transition: 'transform 0.3s ease-in-out', zIndex: showMobileSidebar ? 1050 : 1 }}
        >
          {/* Mobile Close Button */}
          <div className="d-lg-none d-flex justify-content-end mb-3">
            <button className="btn-close" onClick={() => setShowMobileSidebar(false)} aria-label="Close"></button>
          </div>

          <div className="mb-4 text-center d-none d-lg-block">
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
          <nav className="nav flex-column gap-2 overflow-auto flex-grow-1">
            <Link to="/" className={`nav-link border rounded text-dark ${location.pathname === '/' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>🛒 POS System</Link>
            <Link to="/orders" className={`nav-link border rounded text-dark ${location.pathname === '/orders' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📄 Orders / Bill</Link>
            
            {user.role === 'admin' && (
              <>
                <div className="mt-4 mb-2 text-muted fw-bold small ps-2">ADMIN</div>
                <Link to="/users" className={`nav-link border rounded text-dark ${location.pathname === '/users' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>👥 User Management</Link>
                <Link to="/categories" className={`nav-link border rounded text-dark ${location.pathname === '/categories' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📁 Categories</Link>
                <Link to="/products" className={`nav-link border rounded text-dark ${location.pathname === '/products' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📦 Products</Link>
                <Link to="/brands" className={`nav-link border rounded text-dark ${location.pathname === '/brands' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>🏷️ Brands</Link>
                <Link to="/units" className={`nav-link border rounded text-dark ${location.pathname === '/units' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>⚖️ Units</Link>
                <Link to="/warehouses" className={`nav-link border rounded text-dark ${location.pathname === '/warehouses' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>🏭 Warehouses</Link>
                <Link to="/settings" className={`nav-link border rounded text-dark ${location.pathname === '/settings' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>⚙️ Shop Settings</Link>
              </>
            )}
          </nav>
          
          <div className="mt-3 pt-3 border-top">
            <div className="d-flex align-items-center gap-2 mb-3">
              <div className="rounded-circle bg-secondary bg-opacity-25 d-flex align-items-center justify-content-center overflow-hidden" style={{ width: '40px', height: '40px', minWidth: '40px' }}>
                 {/* Placeholder for user image if available, else initials */}
                 <div className="fw-bold text-secondary">
                   {user.name.charAt(0)}
                 </div>
              </div>
              <div className="overflow-hidden">
                  <div className="fw-bold small text-truncate">{user.name}</div>
                  <div className="small text-muted text-capitalize">{user.role}</div>
              </div>
            </div>
            <button onClick={handleLogout} className="btn btn-danger w-100 bg-danger bg-opacity-10 text-danger border-0 fw-bold">
              Logout
            </button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-grow-1 overflow-auto bg-white w-100">
          <Outlet />
        </main>
      </div>
    </div>
  );
};
