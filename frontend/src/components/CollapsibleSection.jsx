// components/CollapsibleSection.jsx
// Reusable collapsible section wrapper for progressive disclosure.
// Persists open/closed state in localStorage by key.

import { useState } from 'react';

export default function CollapsibleSection({ id, title, defaultOpen = true, count, children, className = '' }) {
  const storageKey = `section_${id}`;
  const [open, setOpen] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      return saved !== null ? saved === 'true' : defaultOpen;
    } catch { return defaultOpen; }
  });

  function toggle() {
    setOpen(prev => {
      const next = !prev;
      try { localStorage.setItem(storageKey, String(next)); } catch {}
      return next;
    });
  }

  return (
    <div className={`collapsible-section ${className}`}>
      <button className="collapsible-header" onClick={toggle} aria-expanded={open}>
        <div className="collapsible-header-left">
          <svg className={`collapsible-chevron ${open ? '' : 'collapsible-chevron--closed'}`} width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><polyline points="3 5 7 9 11 5"/></svg>
          <span className="collapsible-title">{title}</span>
          {count != null && <span className="collapsible-count">{count}</span>}
        </div>
      </button>
      {open && <div className="collapsible-body">{children}</div>}
    </div>
  );
}
