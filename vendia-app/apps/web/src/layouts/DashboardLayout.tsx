import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore, useShopStore } from '@vendia/shared';
import { useTranslation } from 'react-i18next';
import { LanguageSwitcher } from '../components/LanguageSwitcher';

export const DashboardLayout = () => {
  const { user, logout } = useAuthStore();
  const { shop } = useShopStore();
  const { t } = useTranslation();
  const navigate = useNavigate();
  const location = useLocation();
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setShowMobileSidebar(false);
  }, [location]);

  const getPageTitle = () => {
    const path = location.pathname;

    if (path === '/') return t('common.pos');
    if (path.startsWith('/orders')) return t('common.orders');
    if (path.startsWith('/customers')) return t('common.customers');
    if (path.startsWith('/profile')) return t('common.profile');
    if (path.startsWith('/appointments')) return t('common.appointments');
    if (path === '/technician') return t('common.attendance');
    if (path.startsWith('/technician/jobs')) return t('common.my_jobs');
    if (path.startsWith('/users')) return t('common.users');
    if (path.startsWith('/categories')) return t('common.categories');
    if (path.startsWith('/products')) return t('common.products');
    if (path.startsWith('/brands')) return t('common.brands');
    if (path.startsWith('/units')) return t('common.units');
    if (path.startsWith('/warehouses')) return t('common.warehouses');
    if (path.startsWith('/settings')) return t('common.settings');

    return shop?.name || 'Vendia POS';
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  if (!user) {
    return <div className="container mt-5"><div className="alert alert-warning">{t('common.please_login')}</div></div>;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      {/* Mobile Header */}
      <header className="d-lg-none bg-white border-bottom p-3 d-flex justify-content-between align-items-center sticky-top shadow-sm">
        <div className="d-flex align-items-center gap-2">
          {shop?.logo_path && (
            <img 
              src={`${import.meta.env.VITE_API_URL?.replace('/api', '')}/storage/${shop.logo_path}`} 
              alt="Shop Logo" 
              style={{ height: '30px', marginRight: '10px' }} 
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
          className={`bg-light border-end p-3 d-flex flex-column overflow-hidden ${showMobileSidebar ? 'position-fixed top-0 start-0 h-100 shadow' : 'd-none d-lg-flex position-sticky top-0 vh-100'}`} 
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
                style={{ maxHeight: '120px', width: 'auto' }} 
              />
            )}
            <h2 className="h5 text-dark m-0 fw-bold">{shop?.name || 'Vendia POS'}</h2>
          </div>
          <nav className="nav flex-column gap-2 overflow-y-auto overflow-x-hidden flex-grow-1" style={{ scrollbarWidth: 'thin', minHeight: 0 }}>
            {user.role !== 'technician' && (
              <>
                <Link
                  to="/"
                  className={`nav-link border rounded text-dark w-100 ${
                    location.pathname === '/' ? 'bg-primary text-white border-primary' : 'bg-white'
                  }`}
                >
                  🛒 {t('common.pos')}
                </Link>
                <Link
                  to="/orders"
                  className={`nav-link border rounded text-dark w-100 ${
                    location.pathname === '/orders' ? 'bg-primary text-white border-primary' : 'bg-white'
                  }`}
                >
                  📄 {t('common.orders')}
                </Link>
                <Link
                  to="/customers"
                  className={`nav-link border rounded text-dark w-100 ${
                    location.pathname === '/customers' ? 'bg-primary text-white border-primary' : 'bg-white'
                  }`}
                >
                  👥 {t('common.customers')}
                </Link>
              </>
            )}
            
            {user.role === 'admin' && (
              <Link to="/appointments" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/appointments') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📅 {t('common.appointments')}</Link>
            )}

            {(user.role === 'technician' || user.role === 'admin') && (
              <>
                <div className=" text-muted fw-bold small ps-2">{t('common.technician_section')}</div>
                <Link to="/technician" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/technician' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>⏱️ {t('common.attendance')}</Link>
                {user.role === 'technician' && (
                  <Link to="/technician/jobs" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/technician/jobs') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📅 {t('common.my_jobs')}</Link>
                )}
              </>
            )}

            {user.role === 'admin' && (
              <>
                <div className="text-muted fw-bold small ps-2">{t('common.admin_section')}</div>
                {/* <Link to="/attendance/history" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/attendance/history' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📅 Attendance History</Link> */}
                <Link to="/users" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/users' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>👥 {t('common.users')}</Link>
                <Link to="/categories" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/categories' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📁 {t('common.categories')}</Link>
                <Link to="/products" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/products' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📦 {t('common.products')}</Link>
                <Link to="/brands" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/brands' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>🏷️ {t('common.brands')}</Link>
                <Link to="/units" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/units' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>⚖️ {t('common.units')}</Link>
                <Link to="/teams" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/teams' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>👨‍🔧 {t('common.teams', 'Teams')}</Link>
                <Link to="/warehouses" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/warehouses' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>🏭 {t('common.warehouses')}</Link>
                <Link to="/settings" className={`nav-link border rounded text-dark w-100 ${location.pathname === '/settings' ? 'bg-primary text-white border-primary' : 'bg-white'}`}>⚙️ {t('common.settings')}</Link>
                {/* <div className="pb-4"></div> */}
              </>
            )}
          </nav>

        </aside>

        {/* Main Content */}
        <main className="flex-grow-1 overflow-hidden bg-white w-100 d-flex flex-column">
          <div className="border-bottom bg-white d-none d-lg-flex align-items-center justify-content-between px-4 py-3 position-sticky top-0" style={{ zIndex: 5 }}>
            <div>
              <h1 className="h5 mb-0">{getPageTitle()}</h1>
            </div>
            <div className="d-flex align-items-center gap-3">
              <LanguageSwitcher />
              <div className="dropdown">
                <button
                  className="btn btn-light border-0 d-flex align-items-center gap-2"
                  type="button"
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  aria-expanded={showProfileMenu}
                >
                  <div className="rounded-circle bg-secondary bg-opacity-25 d-flex align-items-center justify-content-center overflow-hidden" style={{ width: '36px', height: '36px', minWidth: '36px' }}>
                    <div className="fw-bold text-secondary">
                      {user.name.charAt(0)}
                    </div>
                  </div>
                  <div className="d-none d-xl-block text-start">
                    <div className="fw-bold small text-truncate" style={{ maxWidth: '160px' }}>{user.name}</div>
                    <div className="small text-muted text-capitalize">{user.role}</div>
                  </div>
                  <span className="ms-1 small">
                    <i className="bi bi-caret-down-fill"></i>
                  </span>
                </button>
                <ul className={`dropdown-menu dropdown-menu-end ${showProfileMenu ? 'show' : ''}`}>
                  <li>
                    <button
                      className="dropdown-item"
                      onClick={() => {
                        setShowProfileMenu(false);
                        navigate('/profile');
                      }}
                    >
                      {t('common.profile')}
                    </button>
                  </li>
                  <li>
                    <button
                      className="dropdown-item text-danger"
                      onClick={() => {
                        setShowProfileMenu(false);
                        handleLogout();
                      }}
                    >
                      {t('common.logout')}
                    </button>
                  </li>
                </ul>
              </div>
            </div>
          </div>
          <div className="flex-grow-1 overflow-auto" style={{ minHeight: 0 }}>
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
};
