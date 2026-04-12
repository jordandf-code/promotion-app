// components/Layout.jsx
// App shell: fixed sidebar with nav + scrollable main content area.
// Child pages render via <Outlet />.

import { useState, useCallback } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAdminData } from '../hooks/useAdminData.js';
import BottomTabBar, { useBottomTabRoutes, STAR_ELIGIBLE } from './BottomTabBar.jsx';
import ReportIssueModal from './ReportIssueModal.jsx';
import PWAInstallBanner from './PWAInstallBanner.jsx';
import CommandPalette from './CommandPalette.jsx';
import NAV_GROUPS, { DEFAULT_GROUP_ORDER } from '../navGroups.js';

// Routes that viewers can access (everything else is hidden)
const VIEWER_ROUTES = new Set(['/view-others', '/admin']);


export default function Layout() {
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useSettings();
  const { navOrder, bottomBarTabs, setBottomBarTabs } = useAdminData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Collapsible sidebar — persisted in localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    try { return localStorage.getItem('sidebar_collapsed') === 'true'; }
    catch { return false; }
  });
  const toggleSidebar = useCallback(() => {
    setSidebarCollapsed(prev => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  }, []);

  // Collapsed nav groups — persisted in localStorage
  const [collapsedGroups, setCollapsedGroups] = useState(() => {
    try {
      const saved = localStorage.getItem('nav_collapsed');
      return saved ? JSON.parse(saved) : {};
    } catch { return {}; }
  });

  const toggleGroup = useCallback((groupId) => {
    setCollapsedGroups(prev => {
      const next = { ...prev, [groupId]: !prev[groupId] };
      localStorage.setItem('nav_collapsed', JSON.stringify(next));
      return next;
    });
  }, []);

  // Build grouped nav: filter by role, apply saved ordering, handle superuser groups
  const isViewer = user.role === 'viewer';
  const isSuperuser = user.role === 'superuser';

  // 1. Filter groups by role
  let visibleGroups = NAV_GROUPS
    .filter(g => {
      if (g.superuserOnly && !isSuperuser) return false;
      return true;
    })
    .map(group => ({
      ...group,
      items: group.items.filter(n => {
        if (isViewer) return VIEWER_ROUTES.has(n.to);
        return !n.hidden;
      }),
    }))
    .filter(g => g.items.length > 0);

  // 2. Apply saved group order
  const savedGroupOrder = navOrder?.groupOrder;
  if (savedGroupOrder?.length) {
    const groupMap = Object.fromEntries(visibleGroups.map(g => [g.id, g]));
    visibleGroups = [
      ...savedGroupOrder.map(id => groupMap[id]).filter(Boolean),
      ...visibleGroups.filter(g => !savedGroupOrder.includes(g.id)),
    ];
  }

  // 3. Apply saved item order within each group
  const savedItemOrder = navOrder?.itemOrder;
  if (savedItemOrder) {
    visibleGroups = visibleGroups.map(group => {
      const order = savedItemOrder[group.id];
      if (!order?.length) return group;
      const itemMap = Object.fromEntries(group.items.map(n => [n.to, n]));
      return {
        ...group,
        items: [
          ...order.map(route => itemMap[route]).filter(Boolean),
          ...group.items.filter(n => !order.includes(n.to)),
        ],
      };
    });
  }

  // 4. Superuser gets "Super Admin" in the settings group
  if (isSuperuser) {
    const settingsGroup = visibleGroups.find(g => g.id === 'settings');
    if (settingsGroup) {
      settingsGroup.items.push({ to: '/super-admin', label: 'Super Admin' });
    }
  }

  // Flat list for current tab label detection
  const navItems = visibleGroups.flatMap(g => g.items);

  // Display-friendly role label
  const roleLabel = user.role === 'superuser' ? 'Superuser'
    : user.role === 'viewer' ? 'Viewer'
    : user.company || 'User';

  const location = useLocation();
  const currentTabLabel = navItems.find(n =>
    n.to === '/' ? location.pathname === '/' : location.pathname.startsWith(n.to)
  )?.label ?? '';

  const bottomTabRoutes = useBottomTabRoutes();

  function toggleBottomBar(route) {
    // When bottomBarTabs is null, the bottom bar shows defaults — initialize from those
    const current = bottomBarTabs != null ? [...bottomBarTabs] : ['/', '/scorecard', '/opportunities', '/wins', '/story'];
    if (current.includes(route)) {
      setBottomBarTabs(current.filter(r => r !== route));
    } else if (current.length < 5) {
      setBottomBarTabs([...current, route]);
    }
  }

  function closeMenu() { setMenuOpen(false); }

  return (
    <div className="app-shell">
      <PWAInstallBanner />
      {/* Mobile top bar */}
      <header className="mobile-header">
        <div className="mobile-header-left">
          <button className="mobile-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
            <span /><span /><span />
          </button>
          <span className="mobile-header-title"><strong>Promotion</strong> Tracker</span>
          {currentTabLabel && <span className="mobile-header-tab">— {currentTabLabel}</span>}
        </div>
        <div className="mobile-header-right">
          <div className="mobile-currency-toggle">
            <button
              className={`mobile-currency-btn ${currency === 'CAD' ? 'mobile-currency-btn--active' : ''}`}
              onClick={() => setCurrency('CAD')}
            >CAD</button>
            <button
              className={`mobile-currency-btn ${currency === 'USD' ? 'mobile-currency-btn--active' : ''}`}
              onClick={() => setCurrency('USD')}
            >USD</button>
          </div>
          <button className="mobile-signout" onClick={() => { if (window.confirm('Sign out?')) logout(); }} title="Sign out">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          </button>
        </div>
      </header>

      {/* Backdrop */}
      {menuOpen && <div className="sidebar-backdrop" onClick={closeMenu} />}

      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}${sidebarCollapsed ? ' sidebar--collapsed' : ''}`}>
        <div className="sidebar-top">
          <button
            className="sidebar-collapse-toggle"
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
            aria-label={sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {sidebarCollapsed ? '»' : '«'}
          </button>
          <div className="sidebar-brand">
            <img src="/icon.svg" alt="" className="sidebar-brand-icon" />
            <div>
              <span className="sidebar-brand-name">Promotion</span>
              <span className="sidebar-brand-sub">Tracker</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {visibleGroups.map(group => {
              const isCollapsed = !!collapsedGroups[group.id];
              return (
                <div key={group.id} className="nav-group">
                  {group.label && (
                    <button
                      className="nav-group-header"
                      onClick={() => toggleGroup(group.id)}
                      aria-expanded={!isCollapsed}
                    >
                      <span className="nav-group-label">{group.label}</span>
                      <svg className={`nav-group-chevron ${isCollapsed ? 'nav-group-chevron--collapsed' : ''}`} width="12" height="12" viewBox="0 0 12 12" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="2 4 6 8 10 4"/></svg>
                    </button>
                  )}
                  {(!isCollapsed || sidebarCollapsed) && group.items.map(({ to, label, end }) => {
                    const canStar = STAR_ELIGIBLE.has(to);
                    const isStarred = bottomTabRoutes.has(to);
                    return (
                      <div key={to} className="nav-item-row">
                        <NavLink
                          to={to}
                          end={end}
                          className={({ isActive }) =>
                            'nav-item' + (isActive ? ' nav-item--active' : '')
                          }
                          onClick={closeMenu}
                          title={sidebarCollapsed ? label : undefined}
                        >
                          {label}
                        </NavLink>
                        {canStar && to !== '/' && (
                          <button
                            className={`nav-star ${isStarred ? 'nav-star--active' : ''}`}
                            onClick={(e) => { e.stopPropagation(); toggleBottomBar(to); }}
                            title={isStarred ? 'Remove from quick access' : 'Add to quick access'}
                            aria-label={isStarred ? 'Remove from quick access' : 'Add to quick access'}
                          >
                            {isStarred ? '★' : '☆'}
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </nav>
        </div>

        <div className="sidebar-footer">
          <div className="currency-toggle">
            <button
              className={`currency-btn ${currency === 'CAD' ? 'currency-btn--active' : ''}`}
              onClick={() => setCurrency('CAD')}
            >
              CAD
            </button>
            <button
              className={`currency-btn ${currency === 'USD' ? 'currency-btn--active' : ''}`}
              onClick={() => setCurrency('USD')}
            >
              USD
            </button>
          </div>
          <div className="sidebar-user-name">{user.name}</div>
          <div className="sidebar-user-role">{roleLabel}</div>
          <button className="sidebar-report-btn" onClick={() => { setShowIssueModal(true); closeMenu(); }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>
            Report issue
          </button>
          <button className="sidebar-logout" onClick={() => { if (window.confirm('Sign out?')) logout(); }}>Sign out</button>
        </div>
      </aside>

      <main className={`main-content${sidebarCollapsed ? ' main-content--sidebar-collapsed' : ''}`}>
        <Outlet />
      </main>

      <BottomTabBar onReportIssue={() => setShowIssueModal(true)} />

      {showIssueModal && <ReportIssueModal onClose={() => setShowIssueModal(false)} />}

      <CommandPalette />
    </div>
  );
}
