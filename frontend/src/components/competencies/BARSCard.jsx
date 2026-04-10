// BARSCard.jsx — Displays the 4 behavioral anchors for a competency with the selected level highlighted.

const LEVEL_LABELS = { 1: 'Developing', 2: 'Competent', 3: 'Advanced', 4: 'Exemplary' };

export default function BARSCard({ bars, selectedLevel, onSelect, readOnly }) {
  if (!bars) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
      {[1, 2, 3, 4].map(level => {
        const desc = bars[String(level)];
        if (!desc) return null;
        const isSelected = selectedLevel === level;
        return (
          <button
            key={level}
            type="button"
            disabled={readOnly}
            onClick={() => !readOnly && onSelect?.(level)}
            className="card"
            style={{
              padding: '0.6rem 0.75rem',
              border: `2px solid ${isSelected ? 'var(--blue, #3b82f6)' : 'var(--border-color, #e2e8f0)'}`,
              background: isSelected ? 'var(--blue-light, rgba(59,130,246,0.08))' : 'transparent',
              cursor: readOnly ? 'default' : 'pointer',
              textAlign: 'left',
              transition: 'border-color 0.15s, background 0.15s',
            }}
          >
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
              <span style={{
                display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
                width: '1.5rem', height: '1.5rem', borderRadius: '50%', fontSize: '0.75rem', fontWeight: 700,
                background: isSelected ? 'var(--blue, #3b82f6)' : 'var(--bg-secondary, #f1f5f9)',
                color: isSelected ? '#fff' : 'var(--text-secondary, #64748b)',
              }}>
                {level}
              </span>
              <strong style={{ fontSize: '0.85rem' }}>{LEVEL_LABELS[level]}</strong>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary, #64748b)', lineHeight: 1.4 }}>
              {desc}
            </p>
          </button>
        );
      })}
    </div>
  );
}
