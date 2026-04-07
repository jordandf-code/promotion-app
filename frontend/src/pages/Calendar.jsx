// pages/Calendar.jsx
// Aggregates key dates from goals, action items, wins, opportunities, and planned contacts.

import { useState, useMemo } from 'react';
import { useNavigate }       from 'react-router-dom';
import { useGoalsData }      from '../hooks/useGoalsData.js';
import { useActionsData }    from '../hooks/useActionsData.js';
import { useWinsData }       from '../hooks/useWinsData.js';
import { useScorecardData }  from '../hooks/useScorecardData.js';
import { usePeopleData }     from '../hooks/usePeopleData.js';
import { useEminenceData }   from '../hooks/useEminenceData.js';

const MONTHS = ['January','February','March','April','May','June',
                'July','August','September','October','November','December'];
const DOW    = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];

const TYPE_META = {
  goal:        { label: 'Goal',            color: '#b45309', route: '/goals'     },
  action:      { label: 'Action item',     color: '#1d4ed8', route: '/actions'   },
  win:         { label: 'Win',             color: '#15803d', route: '/wins'      },
  opportunity: { label: 'Opportunity',     color: '#7c3aed', route: '/scorecard' },
  touchpoint:  { label: 'Planned contact', color: '#0f766e', route: '/people'    },
  eminence:    { label: 'Eminence',        color: '#c2410c', route: '/eminence'  },
};

function dateKey(d) {
  if (typeof d === 'string') return d.slice(0, 10);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

function buildGrid(year, month) {
  const firstDow    = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const cells = [];
  for (let i = firstDow - 1; i >= 0; i--)
    cells.push({ date: new Date(year, month, -i), current: false });
  for (let d = 1; d <= daysInMonth; d++)
    cells.push({ date: new Date(year, month, d), current: true });
  while (cells.length < 42)
    cells.push({ date: new Date(year, month + 1, cells.length - firstDow - daysInMonth + 1), current: false });
  return cells;
}

function addEvent(map, dateStr, event) {
  if (!dateStr) return;
  const k = dateKey(dateStr);
  if (!map[k]) map[k] = [];
  map[k].push(event);
}

export default function Calendar() {
  const today    = new Date();
  const navigate = useNavigate();

  const [year,    setYear]    = useState(today.getFullYear());
  const [month,   setMonth]   = useState(today.getMonth());
  const [tooltip, setTooltip] = useState(null); // { text, x, y }

  const { goals }         = useGoalsData();
  const { actions }       = useActionsData();
  const { wins }          = useWinsData();
  const { opportunities } = useScorecardData();
  const { people }        = usePeopleData();
  const { activities: eminenceActivities } = useEminenceData();

  const eventMap = useMemo(() => {
    const map = {};
    goals.forEach(g =>
      g.targetDate && addEvent(map, g.targetDate, { type: 'goal', label: g.title }));
    actions.forEach(a =>
      a.dueDate && !a.done && addEvent(map, a.dueDate, { type: 'action', label: a.title }));
    wins.forEach(w =>
      w.date && addEvent(map, w.date, { type: 'win', label: w.title }));
    opportunities.forEach(o =>
      o.winDate && o.status === 'won' && addEvent(map, o.winDate, { type: 'opportunity', label: o.name }));
    people.forEach(p =>
      (p.plannedTouchpoints ?? []).forEach(pt =>
        pt.date && addEvent(map, pt.date, { type: 'touchpoint', label: p.name })));
    eminenceActivities.forEach(a =>
      a.date && addEvent(map, a.date, { type: 'eminence', label: a.title }));
    return map;
  }, [goals, actions, wins, opportunities, people, eminenceActivities]);

  const grid     = useMemo(() => buildGrid(year, month), [year, month]);
  const todayKey = dateKey(today);

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }

  function showTooltip(e, text) {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltip({ text, x: rect.left + rect.width / 2, y: rect.top });
  }

  return (
    <div className="page" onMouseLeave={() => setTooltip(null)}>
      <div className="page-header">
        <h1 className="page-title">Calendar</h1>
      </div>

      <div className="cal-nav">
        <button className="cal-nav-btn" onClick={prevMonth}>‹</button>
        <span className="cal-nav-label">{MONTHS[month]} {year}</span>
        <button className="cal-nav-btn" onClick={nextMonth}>›</button>
        <button className="btn-secondary cal-today-btn"
          onClick={() => { setYear(today.getFullYear()); setMonth(today.getMonth()); }}>
          Today
        </button>
      </div>

      <div className="cal-grid">
        {DOW.map(d => <div key={d} className="cal-dow">{d}</div>)}
        {grid.map(({ date, current }, i) => {
          const key     = dateKey(date);
          const events  = eventMap[key] ?? [];
          const visible = events.slice(0, 3);
          const extra   = events.length - visible.length;
          return (
            <div key={i} className={`cal-day${!current ? ' cal-day--other' : ''}${key === todayKey ? ' cal-day--today' : ''}`}>
              <span className="cal-day-num">{date.getDate()}</span>
              <div className="cal-events">
                {visible.map((ev, j) => (
                  <div key={j} className="cal-event"
                    style={{ background: TYPE_META[ev.type].color + '18',
                             color:      TYPE_META[ev.type].color,
                             borderColor: TYPE_META[ev.type].color + '50' }}
                    onMouseEnter={e => showTooltip(e, ev.label)}
                    onMouseLeave={() => setTooltip(null)}
                    onClick={() => navigate(TYPE_META[ev.type].route)}>
                    {ev.label}
                  </div>
                ))}
                {extra > 0 && <div className="cal-overflow">+{extra} more</div>}
              </div>
            </div>
          );
        })}
      </div>

      <div className="cal-legend">
        {Object.entries(TYPE_META).map(([type, { label, color }]) => (
          <span key={type} className="cal-legend-item">
            <span className="cal-legend-dot" style={{ background: color }} />
            {label}
          </span>
        ))}
      </div>

      {tooltip && (
        <div className="cal-tooltip" style={{ left: tooltip.x, top: tooltip.y }}>
          {tooltip.text}
        </div>
      )}
    </div>
  );
}
