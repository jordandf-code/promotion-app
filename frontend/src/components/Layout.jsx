// components/Layout.jsx
// App shell: fixed sidebar with nav + scrollable main content area.
// Child pages render via <Outlet />.

import { useState } from 'react';
import { NavLink, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useSettings } from '../context/SettingsContext.jsx';
import { useAdminData } from '../hooks/useAdminData.js';

const ALL_NAV_ITEMS = [
  { to: '/',          label: 'Dashboard',   end: true },
  { to: '/scorecard', label: 'Scorecard'             },
  { to: '/pursuits',  label: 'Pursuits'              },
  { to: '/goals',     label: 'Goals'                 },
  { to: '/people',    label: 'People'                },
  { to: '/wins',      label: 'Wins'                  },
  { to: '/actions',   label: 'Action items'          },
  { to: '/story',     label: 'My story'              },
  { to: '/calendar',  label: 'Calendar'              },
  { to: '/sharing',   label: 'Sharing'               },
  { to: '/admin',     label: 'Admin'                 },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const { currency, setCurrency } = useSettings();
  const { navOrder } = useAdminData();
  const [menuOpen, setMenuOpen] = useState(false);

  const navItems = (navOrder ?? []).length
    ? [
        ...navOrder.map(route => ALL_NAV_ITEMS.find(n => n.to === route)).filter(Boolean),
        ...ALL_NAV_ITEMS.filter(n => !(navOrder ?? []).includes(n.to)),
      ]
    : ALL_NAV_ITEMS;

  function closeMenu() { setMenuOpen(false); }

  return (
    <div className="app-shell">
      {/* Mobile top bar */}
      <header className="mobile-header">
        <button className="mobile-hamburger" onClick={() => setMenuOpen(o => !o)} aria-label="Menu">
          <span /><span /><span />
        </button>
        <span className="mobile-header-title">Promotion Tracker</span>
      </header>

      {/* Backdrop */}
      {menuOpen && <div className="sidebar-backdrop" onClick={closeMenu} />}

      <aside className={`sidebar ${menuOpen ? 'sidebar--open' : ''}`}>
        <div className="sidebar-top">
          <div className="sidebar-brand">
            <span className="sidebar-brand-name">Promotion</span>
            <span className="sidebar-brand-sub">Tracker</span>
          </div>

          <nav className="sidebar-nav">
            {navItems.map(({ to, label, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) => 'nav-item' + (isActive ? ' nav-item--active' : '')}
                onClick={closeMenu}
              >
                {label}
              </NavLink>
            ))}
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
          <div className="sidebar-user-role">{user.role || user.company || 'IBM'}</div>
          <button className="sidebar-logout" onClick={logout}>Sign out</button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
