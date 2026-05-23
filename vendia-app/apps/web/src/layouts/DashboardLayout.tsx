import React, { useState, useEffect, useRef } from 'react';
import { Outlet, Link, useNavigate, useLocation } from 'react-router-dom';
import { api, useAuthStore, useShopStore } from '@vendia/shared';
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
  const [adminGroupsOpen, setAdminGroupsOpen] = useState<{ dashboard: boolean; user: boolean; product: boolean; shop: boolean; documents: boolean }>(() => ({
    dashboard: false,
    user: false,
    product: false,
    shop: false,
    documents: false,
  }));
  const [documentsBillingDebtorCount, setDocumentsBillingDebtorCount] = useState(0);
  const [documentsMissingReceiptCount, setDocumentsMissingReceiptCount] = useState(0);
  const mobileProfileDropdownRef = useRef<HTMLDivElement>(null);
  const desktopProfileDropdownRef = useRef<HTMLDivElement>(null);
  const remindersRequestIdRef = useRef(0);
  const apiUrlRaw = (import.meta as any).env?.VITE_API_URL || 'http://localhost:8000/api';
  const apiUrl = typeof apiUrlRaw === 'string' ? apiUrlRaw : 'http://localhost:8000/api';
  const apiUrlNormalized = apiUrl.replace(/^https:\/(?!\/)/, 'https://').replace(/^http:\/(?!\/)/, 'http://');
  const apiOrigin = apiUrlNormalized.replace(/\/api\/?$/, '');

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

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setShowMobileSidebar(false);
    setShowProfileMenu(false);
  }, [location]);

  useEffect(() => {
    const path = location.pathname;
    const group =
      path.startsWith('/dashboard')
        ? 'dashboard'
        : path.startsWith('/users') || path.startsWith('/teams') || path.startsWith('/customers')
          ? 'user'
          : path.startsWith('/products') || path.startsWith('/categories') || path.startsWith('/units') || path.startsWith('/brands')
            ? 'product'
            : path.startsWith('/warehouses') || path.startsWith('/settings')
              ? 'shop'
              : path.startsWith('/documents')
                ? 'documents'
                : null;
    if (!group) return;
    setAdminGroupsOpen((prev) => ({ ...prev, [group]: true }));
  }, [location.pathname]);

  useEffect(() => {
    if (user?.role !== 'admin') return;
    const requestId = (remindersRequestIdRef.current += 1);
    const fetchCounts = async () => {
      try {
        const res = await api.get('/orders/reminders', { params: { scope: 'all' } });
        if (requestId !== remindersRequestIdRef.current) return;
        const count = Number((res as any)?.data?.billing_unpaid?.count ?? 0);
        const receiptCount = Number((res as any)?.data?.missing_receipt?.count ?? 0);
        setDocumentsBillingDebtorCount(Number.isFinite(count) ? Math.max(0, Math.trunc(count)) : 0);
        setDocumentsMissingReceiptCount(Number.isFinite(receiptCount) ? Math.max(0, Math.trunc(receiptCount)) : 0);
      } catch {
        if (requestId !== remindersRequestIdRef.current) return;
        setDocumentsBillingDebtorCount(0);
        setDocumentsMissingReceiptCount(0);
      }
    };
    fetchCounts();
  }, [user?.role, location.pathname]);

  const toggleAdminGroup = (key: 'dashboard' | 'user' | 'product' | 'shop' | 'documents') => {
    setAdminGroupsOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      const inMobile = mobileProfileDropdownRef.current?.contains(target) ?? false;
      const inDesktop = desktopProfileDropdownRef.current?.contains(target) ?? false;
      if (!inMobile && !inDesktop) setShowProfileMenu(false);
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

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
    if (path.startsWith('/dashboard/subcategory')) return t('analytics.title', 'ข้อมูลสินค้าและบริการ');
    if (path.startsWith('/dashboard')) return t('common.dashboard');

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
        <div className="d-flex align-items-center gap-2 flex-grow-1" style={{ minWidth: 0 }}>
          {shop?.logo_path && (
            <img 
              src={getStorageUrl(shop.logo_path)}
              alt="Shop Logo" 
              style={{ height: '30px', marginRight: '10px' }} 
            />
          )}
          <div style={{ minWidth: 0 }}>
            <div className="fw-bold text-truncate" style={{ maxWidth: '100%' }}>
              {shop?.name || 'Vendia POS'}
            </div>
            <div className="small text-muted text-truncate" style={{ maxWidth: '100%' }}>
              {getPageTitle()}
            </div>
          </div>
        </div>

        <div className="d-flex align-items-center gap-2 ms-2">
          <LanguageSwitcher compact />
          <div className="dropdown" ref={mobileProfileDropdownRef}>
            <button
              className="btn btn-light border-0 d-flex align-items-center justify-content-center"
              type="button"
              onClick={() => setShowProfileMenu(!showProfileMenu)}
              aria-expanded={showProfileMenu}
              aria-label="Profile menu"
              style={{ width: '40px', height: '40px' }}
            >
              <div className="rounded-circle bg-secondary bg-opacity-25 d-flex align-items-center justify-content-center overflow-hidden" style={{ width: '32px', height: '32px', minWidth: '32px' }}>
                <div className="fw-bold text-secondary">
                  {user.name.charAt(0)}
                </div>
              </div>
            </button>
            <ul
              className={`dropdown-menu dropdown-menu-end shadow ${showProfileMenu ? 'show' : ''}`}
              style={{
                zIndex: 1060,
                right: 0,
                left: 'auto',
                marginTop: '8px',
                maxWidth: 'calc(100vw - 24px)',
                transform: 'none',
              }}
            >
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
          <button 
            className="btn btn-light border" 
            onClick={() => setShowMobileSidebar(!showMobileSidebar)}
            aria-label="Toggle menu"
          >
            <span className="fs-5">☰</span>
          </button>
        </div>
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
                src={getStorageUrl(shop.logo_path)}
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
                {user.role === 'admin' && (
                  <>
                    <button
                      type="button"
                      className={`btn border rounded w-100 d-flex justify-content-between align-items-center text-start ${
                        location.pathname.startsWith('/dashboard') ? 'btn-primary text-white border-primary' : 'btn-light'
                      }`}
                      onClick={() => toggleAdminGroup('dashboard')}
                      aria-expanded={adminGroupsOpen.dashboard}
                      aria-controls="nav-group-dashboard"
                    >
                      <span className="fw-semibold">📊 {t('common.dashboard')}</span>
                      <i className={`bi bi-chevron-${adminGroupsOpen.dashboard ? 'up' : 'down'}`}></i>
                    </button>
                    <div id="nav-group-dashboard" className={`ps-2 d-flex flex-column gap-2 ${adminGroupsOpen.dashboard ? '' : 'd-none'}`}>
                      <Link
                        to="/dashboard"
                        className={`nav-link border rounded text-dark w-100 ${
                          location.pathname === '/dashboard' ? 'bg-primary text-white border-primary' : 'bg-white'
                        }`}
                      >
                        📊 {t('common.overview')}
                      </Link>
                      <Link
                        to="/dashboard/subcategory"
                        className={`nav-link border rounded text-dark w-100 ${
                          location.pathname.startsWith('/dashboard/subcategory') ? 'bg-primary text-white border-primary' : 'bg-white'
                        }`}
                      >
                        📈 {t('analytics.title', 'ข้อมูลสินค้าและบริการ')}
                      </Link>
                    </div>
                  </>
                )}
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
                {user.role !== 'admin' && (
                  <Link
                    to="/customers"
                    className={`nav-link border rounded text-dark w-100 ${
                      location.pathname === '/customers' ? 'bg-primary text-white border-primary' : 'bg-white'
                    }`}
                  >
                    👥 {t('common.customers')}
                  </Link>
                )}
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

                <div className="d-flex flex-column gap-2 mt-2">
                  <button
                    type="button"
                    className="btn btn-light border rounded w-100 d-flex justify-content-between align-items-center text-start"
                    onClick={() => toggleAdminGroup('documents')}
                    aria-expanded={adminGroupsOpen.documents}
                    aria-controls="admin-group-documents"
                  >
                    <span className="fw-semibold">
                      {t('common.document_management', 'จัดการเอกสาร')}
                      {documentsBillingDebtorCount > 0 && (
                        <span className="badge ms-2 vendia-badge-billing">
                          {documentsBillingDebtorCount}
                        </span>
                      )}
                      {documentsMissingReceiptCount > 0 && (
                        <span className="badge bg-secondary ms-2">
                          {documentsMissingReceiptCount}
                        </span>
                      )}
                    </span>
                    <i className={`bi bi-chevron-${adminGroupsOpen.documents ? 'up' : 'down'}`}></i>
                  </button>
                  <div id="admin-group-documents" className={`ps-2 d-flex flex-column gap-2 ${adminGroupsOpen.documents ? '' : 'd-none'}`}>
                    <Link to="/documents" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/documents') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>
                      <span className="d-flex justify-content-between align-items-center w-100">
                        <span>🧾 {t('common.documents', 'เอกสาร')}</span>
                        <span className="d-flex align-items-center gap-2">
                          {documentsBillingDebtorCount > 0 && (
                            <span className="badge vendia-badge-billing">
                              {documentsBillingDebtorCount}
                            </span>
                          )}
                          {documentsMissingReceiptCount > 0 && (
                            <span className="badge bg-secondary">
                              {documentsMissingReceiptCount}
                            </span>
                          )}
                        </span>
                      </span>
                    </Link>
                  </div>

                  <button
                    type="button"
                    className="btn btn-light border rounded w-100 d-flex justify-content-between align-items-center text-start"
                    onClick={() => toggleAdminGroup('user')}
                    aria-expanded={adminGroupsOpen.user}
                    aria-controls="admin-group-user"
                  >
                    <span className="fw-semibold">{t('common.user_management', 'User management')}</span>
                    <i className={`bi bi-chevron-${adminGroupsOpen.user ? 'up' : 'down'}`}></i>
                  </button>
                  <div id="admin-group-user" className={`ps-2 d-flex flex-column gap-2 ${adminGroupsOpen.user ? '' : 'd-none'}`}>
                    <Link to="/users" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/users') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>👥 {t('common.users')}</Link>
                    <Link to="/teams" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/teams') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>👨‍🔧 {t('common.teams', 'Teams')}</Link>
                    <Link to="/customers" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/customers') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>👥 {t('common.customers')}</Link>
                  </div>

                  <button
                    type="button"
                    className="btn btn-light border rounded w-100 d-flex justify-content-between align-items-center text-start"
                    onClick={() => toggleAdminGroup('product')}
                    aria-expanded={adminGroupsOpen.product}
                    aria-controls="admin-group-product"
                  >
                    <span className="fw-semibold">{t('common.product_management', 'Product management')}</span>
                    <i className={`bi bi-chevron-${adminGroupsOpen.product ? 'up' : 'down'}`}></i>
                  </button>
                  <div id="admin-group-product" className={`ps-2 d-flex flex-column gap-2 ${adminGroupsOpen.product ? '' : 'd-none'}`}>
                    <Link to="/products" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/products') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📦 {t('common.products')}</Link>
                    <Link to="/categories" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/categories') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>📁 {t('common.categories')}</Link>
                    <Link to="/units" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/units') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>⚖️ {t('common.units')}</Link>
                    <Link to="/brands" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/brands') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>🏷️ {t('common.brands')}</Link>
                  </div>

                  <button
                    type="button"
                    className="btn btn-light border rounded w-100 d-flex justify-content-between align-items-center text-start"
                    onClick={() => toggleAdminGroup('shop')}
                    aria-expanded={adminGroupsOpen.shop}
                    aria-controls="admin-group-shop"
                  >
                    <span className="fw-semibold">{t('common.shop_management', 'Shop management')}</span>
                    <i className={`bi bi-chevron-${adminGroupsOpen.shop ? 'up' : 'down'}`}></i>
                  </button>
                  <div id="admin-group-shop" className={`ps-2 d-flex flex-column gap-2 ${adminGroupsOpen.shop ? '' : 'd-none'}`}>
                    <Link to="/warehouses" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/warehouses') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>🏭 {t('common.warehouses')}</Link>
                    <Link to="/settings" className={`nav-link border rounded text-dark w-100 ${location.pathname.startsWith('/settings') ? 'bg-primary text-white border-primary' : 'bg-white'}`}>⚙️ {t('common.settings')}</Link>
                  </div>
                </div>
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
              <div className="dropdown" ref={desktopProfileDropdownRef}>
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
                <ul
                  className={`dropdown-menu dropdown-menu-end shadow ${showProfileMenu ? 'show' : ''}`}
                  style={{ marginTop: '8px' }}
                >
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
