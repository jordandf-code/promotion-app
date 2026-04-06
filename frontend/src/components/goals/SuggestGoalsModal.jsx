// components/goals/SuggestGoalsModal.jsx
// Shows AI-suggested goals with checkboxes. User selects which to add.

import { useState } from 'react';

export default function SuggestGoalsModal({ suggestions, onAdd, onClose }) {
  const [selected, setSelected] = useState(new Set());

  function toggle(idx) {
    setSelected(s => {
      const next = new Set(s);
      next.has(idx) ? next.delete(idx) : next.add(idx);
      return next;
    });
  }

  function handleAdd() {
    suggestions
      .filter((_, i) => selected.has(i))
      .forEach(s => onAdd(s.title));
    onClose();
  }

  const count = selected.size;

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal modal--wide" onClick={e => e.stopPropagation()}>
        <div className="modal-header">
          <h3>✦ Suggested goals</h3>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>
        <div className="modal-body">
          <p className="suggest-goals-intro">
            Based on your IBM Partner criteria, wins, and current goals. Select the ones you want to add.
          </p>
          <div className="suggest-goals-list">
            {suggestions.map((s, i) => (
              <label key={i} className="suggest-goal-item">
                <input type="checkbox" checked={selected.has(i)} onChange={() => toggle(i)} />
                <div className="suggest-goal-content">
                  <div className="suggest-goal-title">{s.title}</div>
                  <div className="suggest-goal-rationale">{s.rationale}</div>
                </div>
              </label>
            ))}
          </div>
        </div>
        <div className="modal-actions">
          <button className="btn-secondary" onClick={onClose}>Cancel</button>
          <button className="btn-primary" onClick={handleAdd} disabled={count === 0}>
            Add {count > 0 ? count : ''} goal{count !== 1 ? 's' : ''}
          </button>
        </div>
      </div>
    </div>
  );
}
