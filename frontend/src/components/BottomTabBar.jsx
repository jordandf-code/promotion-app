// components/BottomTabBar.jsx
// Fixed bottom navigation bar for mobile (≤ 768px).
// Shows user-selected "starred" tabs (up to 5). Defaults to 5 primary tabs.

import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { useAdminData } from '../hooks/useAdminData.js';

// Default 5 primary routes if user hasn't customized
const DEFAULT_PRIMARY = ['/', '/scorecard', '/opportunities', '/wins', '/story'];

// Viewer role shows only this
const VIEWER_PRIMARY = ['/view-others'];

// Routes eligible for starring (excludes super-admin and view-others)
export const STAR_ELIGIBLE = new Set([
  '/', '/scorecard', '/opportunities', '/goals', '/people', '/wins', '/eminence',
  '/actions', '/learning', '/story', '/calendar', '/sharing', '/admin',
]);

// SVG icons (24px, stroke-based for consistency)
const ICONS = {
  '/':          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
  '/scorecard': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 20V10"/><path d="M12 20V4"/><path d="M6 20v-6"/></svg>,
  '/opportunities': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><path d="M16 8l-4 4-4-4"/></svg>,
  '/goals':     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>,
  '/people':    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>,
  '/wins':      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>,
  '/eminence':  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/></svg>,
  '/actions':   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 11 12 14 22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>,
  '/learning':  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M2 3h6a4 4 0 014 4v14a3 3 0 00-3-3H2z"/><path d="M22 3h-6a4 4 0 00-4 4v14a3 3 0 013-3h7z"/></svg>,
  '/story':     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M14 2H6a2 2 0 00-2 2v16a2 2 0 002 2h12a2 2 0 002-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/></svg>,
  '/calendar':  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>,
  '/sharing':   <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>,
  '/view-others': <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  '/admin':     <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 00.33 1.82l.06.06a2 2 0 01-2.83 2.83l-.06-.06a1.65 1.65 0 00-1.82-.33 1.65 1.65 0 00-1 1.51V21a2 2 0 01-4 0v-.09A1.65 1.65 0 009 19.4a1.65 1.65 0 00-1.82.33l-.06.06a2 2 0 01-2.83-2.83l.06-.06A1.65 1.65 0 004.68 15a1.65 1.65 0 00-1.51-1H3a2 2 0 010-4h.09A1.65 1.65 0 004.6 9a1.65 1.65 0 00-.33-1.82l-.06-.06a2 2 0 012.83-2.83l.06.06A1.65 1.65 0 009 4.68a1.65 1.65 0 001-1.51V3a2 2 0 014 0v.09a1.65 1.65 0 001 1.51 1.65 1.65 0 001.82-.33l.06-.06a2 2 0 012.83 2.83l-.06.06A1.65 1.65 0 0019.4 9a1.65 1.65 0 001.51 1H21a2 2 0 010 4h-.09a1.65 1.65 0 00-1.51 1z"/></svg>,
};

// Short labels for bottom bar (≤ 10 chars)
const SHORT_LABELS = {
  '/':            'Home',
  '/scorecard':   'Scorecard',
  '/opportunities': 'Opps',
  '/goals':       'Goals',
  '/people':      'People',
  '/wins':        'Wins',
  '/eminence':    'Eminence',
  '/actions':     'Actions',
  '/learning':    'Learning',
  '/story':       'Story',
  '/calendar':    'Calendar',
  '/sharing':     'Sharing',
  '/view-others': 'Peers',
  '/admin':       'Admin',
};

function getActiveRoutes(bottomBarTabs) {
  const custom = bottomBarTabs ?? [];
  if (custom.length > 0) {
    // Dashboard is always pinned first — add it if not already present
    const filtered = custom.filter(r => ICONS[r] && r !== '/');
    return ['/', ...filtered].slice(0, 4);
  }
  return DEFAULT_PRIMARY.slice(0, 4);
}

const REPORT_ICON = <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/></svg>;

export default function BottomTabBar({ onReportIssue }) {
  const { user } = useAuth();
  const { bottomBarTabs } = useAdminData();

  // Hide bottom bar when virtual keyboard is open (Issue #11c)
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  useEffect(() => {
    if (!window.visualViewport) return;
    const vv = window.visualViewport;
    const handler = () => {
      const isKeyboard = vv.height < window.innerHeight * 0.75;
      setKeyboardOpen(isKeyboard);
    };
    vv.addEventListener('resize', handler);
    return () => vv.removeEventListener('resize', handler);
  }, []);

  if (keyboardOpen) return null;

  if (user.role === 'viewer') {
    return (
      <nav className="bottom-tab-bar">
        {VIEWER_PRIMARY.map(route => (
          <TabItem key={route} to={route} />
        ))}
        <ReportButton onClick={onReportIssue} />
      </nav>
    );
  }

  const routes = getActiveRoutes(bottomBarTabs).slice(0, 4);

  if (routes.length === 0) return null;

  return (
    <nav className="bottom-tab-bar">
      {routes.map(route => (
        <TabItem key={route} to={route} end={route === '/'} />
      ))}
      <ReportButton onClick={onReportIssue} />
    </nav>
  );
}

function ReportButton({ onClick }) {
  return (
    <button className="bottom-tab" onClick={onClick}>
      <span className="bottom-tab-icon">{REPORT_ICON}</span>
      <span className="bottom-tab-label">Report</span>
    </button>
  );
}

function TabItem({ to, end }) {
  return (
    <NavLink
      to={to}
      end={end}
      className={({ isActive }) => `bottom-tab ${isActive ? 'bottom-tab--active' : ''}`}
    >
      <span className="bottom-tab-icon">{ICONS[to]}</span>
      <span className="bottom-tab-label">{SHORT_LABELS[to] ?? ''}</span>
    </NavLink>
  );
}

// Hook for other components to know which routes are in the bottom bar
export function useBottomTabRoutes() {
  const { user } = useAuth();
  const { bottomBarTabs } = useAdminData();

  if (user.role === 'viewer') return new Set(VIEWER_PRIMARY);
  return new Set(getActiveRoutes(bottomBarTabs));
}
