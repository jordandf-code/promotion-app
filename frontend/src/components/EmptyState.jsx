// components/EmptyState.jsx
// Reusable empty state with description and optional CTA.

export default function EmptyState({ icon, title, description, action, actionLabel, className = '' }) {
  return (
    <div className={`empty-state ${className}`}>
      {icon && <div className="empty-state-icon">{icon}</div>}
      <p className="empty-state-title">{title}</p>
      {description && <p className="empty-state-desc">{description}</p>}
      {action && (
        <button className="btn-primary" onClick={action} style={{ marginTop: '0.75rem' }}>
          {actionLabel || 'Get started'}
        </button>
      )}
    </div>
  );
}
