// components/CommandPalette.jsx
// Cmd+K / Ctrl+K command palette for quick page navigation.

import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import NAV_GROUPS from '../navGroups.js';

// Derive flat command list from shared nav groups
const COMMANDS = NAV_GROUPS.flatMap(g =>
  g.items.map(item => ({ to: item.to, label: item.label, group: g.label ?? 'Home' }))
);

const RECENT_KEY = 'cmd_palette_recent';
const MAX_RECENT = 5;

function loadRecent() {
  try {
    const raw = localStorage.getItem(RECENT_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveRecent(routes) {
  try { localStorage.setItem(RECENT_KEY, JSON.stringify(routes)); } catch {}
}

export default function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [activeIndex, setActiveIndex] = useState(0);
  const [recent, setRecent] = useState(loadRecent);
  const inputRef = useRef(null);
  const listRef = useRef(null);
  const navigate = useNavigate();
  const location = useLocation();

  // Track page visits for recency
  useEffect(() => {
    const path = location.pathname;
    setRecent(prev => {
      const next = [path, ...prev.filter(r => r !== path)].slice(0, MAX_RECENT);
      saveRecent(next);
      return next;
    });
  }, [location.pathname]);

  // Global keyboard listener
  useEffect(() => {
    function handleKeyDown(e) {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setOpen(prev => !prev);
      }
    }
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setQuery('');
      setActiveIndex(0);
      // Small delay to ensure DOM is ready
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  }, [open]);

  // Filtered + sorted results
  const results = useMemo(() => {
    const q = query.toLowerCase().trim();
    let items = COMMANDS;

    if (q) {
      items = items.filter(cmd =>
        cmd.label.toLowerCase().includes(q) ||
        cmd.group.toLowerCase().includes(q)
      );
    } else {
      // No query: show recent pages first, then the rest
      const recentSet = new Set(recent);
      const recentItems = recent
        .map(r => COMMANDS.find(c => c.to === r))
        .filter(Boolean);
      const rest = items.filter(c => !recentSet.has(c.to));
      items = [...recentItems, ...rest];
    }

    return items;
  }, [query, recent]);

  // Clamp active index when results change
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  const close = useCallback(() => setOpen(false), []);

  const go = useCallback((to) => {
    navigate(to);
    close();
  }, [navigate, close]);

  // Scroll active item into view
  useEffect(() => {
    if (!listRef.current) return;
    const active = listRef.current.children[activeIndex];
    if (active) active.scrollIntoView({ block: 'nearest' });
  }, [activeIndex]);

  function handleKeyDown(e) {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIndex(i => (i + 1) % results.length || 0);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIndex(i => (i - 1 + results.length) % results.length || 0);
    } else if (e.key === 'Enter') {
      e.preventDefault();
      if (results[activeIndex]) go(results[activeIndex].to);
    } else if (e.key === 'Escape') {
      e.preventDefault();
      close();
    }
  }

  if (!open) return null;

  const isMac = navigator.platform?.toUpperCase().includes('MAC');

  return (
    <div className="cmd-palette-backdrop" onClick={close}>
      <div className="cmd-palette" onClick={e => e.stopPropagation()}>
        <input
          ref={inputRef}
          className="cmd-palette-input"
          type="text"
          placeholder={`Search pages... (${isMac ? '⌘' : 'Ctrl+'}K)`}
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={handleKeyDown}
          autoComplete="off"
          spellCheck={false}
        />

        {results.length > 0 ? (
          <div className="cmd-palette-list" ref={listRef}>
            {results.map((cmd, i) => (
              <div
                key={cmd.to}
                className={`cmd-palette-item${i === activeIndex ? ' cmd-palette-item--active' : ''}`}
                onClick={() => go(cmd.to)}
                onMouseEnter={() => setActiveIndex(i)}
              >
                <span className="cmd-palette-item-label">{cmd.label}</span>
                <span className="cmd-palette-item-group">{cmd.group}</span>
              </div>
            ))}
          </div>
        ) : (
          <div className="cmd-palette-empty">No matching pages</div>
        )}

        <div className="cmd-palette-hint">
          <span><kbd>↑</kbd> <kbd>↓</kbd> navigate</span>
          <span><kbd>↵</kbd> open</span>
          <span><kbd>esc</kbd> close</span>
        </div>
      </div>
    </div>
  );
}
