// components/Layout.jsx
// App shell: fixed sidebar with nav + scrollable main content area.
// Child pages render via <Outlet />.

import { useState } from 'react';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAdminData } from '../hooks/useAdminData.js';
import BottomTabBar, { useBottomTabRoutes, STAR_ELIGIBLE } from './BottomTabBar.jsx';
import ReportIssueModal from './ReportIssueModal.jsx';
import PWAInstallBanner from './PWAInstallBanner.jsx';

const ALL_NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',   end: true },
  { to: '/scorecard', label: 'Scorecard'             },
  { to: '/opportunities', label: 'Opportunities'      },
  { to: '/goals',     label: 'Goals'                 },
  { to: '/people',    label: 'People'                },
  { to: '/wins',      label: 'Wins'                  },
  { to: '/eminence',  label: 'Eminence'              },
  { to: '/actions',   label: 'Action items'          },
  { to: '/reflections',  label: 'Reflections'          },
  { to: '/competencies', label: 'Competencies'         },
  { to: '/learning',  label: 'Learning'              },
  { to: '/story',     label: 'Narrative + Gaps'       },
  { to: '/influence-map', label: 'Influence Map'                },
  { to: '/brand',     label: 'Brand'                            },
  { to: '/mock-panel', label: 'Mock Panel'                       },
  { to: '/promotion-package', label: 'Package Generator'        },
  { to: '/vault',     label: 'Documents'                        },
  { to: '/import-export', label: 'Import / Export' },
  { to: '/sponsees',  label: 'Sponsees'                          },
  { to: '/benchmark', label: 'Benchmarking'                      },
  { to: '/calendar',  label: 'Calendar'              },
  { to: '/sharing',   label: 'Sharing'               },
  { to: '/view-others', label: 'View others'         },
  { to: '/admin',     label: 'Admin'                 },
];

// Routes that viewers can access (everything else is hidden)
const VIEWER_ROUTES = new Set(['/view-others', '/admin']);

// These tabs are not reorderable via navOrder — they sit in fixed positions
const NON_REORDERABLE = new Set(['/view-others', '/super-admin']);

export default function Layout() {
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useSettings();
  const { navOrder, bottomBarTabs, setBottomBarTabs } = useAdminData();
  const [menuOpen, setMenuOpen] = useState(false);
  const [showIssueModal, setShowIssueModal] = useState(false);

  // Filter nav items by role and hidden flag
  let baseItems;
  if (user.role === 'viewer') {
    baseItems = ALL_NAV_ITEMS.filter(n => VIEWER_ROUTES.has(n.to));
  } else {
    baseItems = ALL_NAV_ITEMS.filter(n => !n.hidden);
  }

  // Apply user's custom tab ordering (only for reorderable items)
  let navItems;
  if ((navOrder ?? []).length && user.role !== 'viewer') {
    const reorderable = baseItems.filter(n => !NON_REORDERABLE.has(n.to));
    navItems = [
      ...navOrder.map(route => reorderable.find(n => n.to === route)).filter(Boolean),
      ...reorderable.filter(n => !(navOrder ?? []).includes(n.to)),
    ];
  } else {
    navItems = baseItems;
  }

  // Superuser gets "Super Admin" tab always last
  if (user.role === 'superuser') {
    navItems = [...navItems, { to: '/super-admin', label: 'Super Admin' }];
  }

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

      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <img src="/icon.svg" alt="" className="sidebar-brand-icon" />
            <div>
              <span className="sidebar-brand-name">Promotion</span>
              <span className="sidebar-brand-sub">Tracker</span>
            </div>
          </div>

          <nav className="sidebar-nav">
            {navItems.map(({ to, label, end }) => {
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
          <button className="sidebar-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>

      <BottomTabBar onReportIssue={() => setShowIssueModal(true)} />

      {showIssueModal && <ReportIssueModal onClose={() => setShowIssueModal(false)} />}
    </div>
  );
}
