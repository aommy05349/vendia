import React from 'react';

type MetaRow = { label: string; value: React.ReactNode };

type MobileListCardProps = {
  title: React.ReactNode;
  subtitle?: React.ReactNode;
  badge?: React.ReactNode;
  meta?: MetaRow[];
  onClick?: () => void;
  actions?: React.ReactNode;
};

export const MobileListCard: React.FC<MobileListCardProps> = ({
  title,
  subtitle,
  badge,
  meta,
  onClick,
  actions,
}) => {
  const interactive = Boolean(onClick);

  return (
    <div
      className="card border-0 shadow-sm text-start w-100 admin-mobile-list-card"
      onClick={onClick}
      role={interactive ? 'button' : undefined}
      tabIndex={interactive ? 0 : undefined}
      style={{ cursor: interactive ? 'pointer' : undefined }}
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClick?.();
              }
            }
          : undefined
      }
    >
      <div className="card-body py-3">
        <div className="d-flex justify-content-between align-items-start gap-2">
          <div style={{ minWidth: 0 }}>
            <div className="fw-bold text-truncate">{title}</div>
            {subtitle && <div className="small text-muted">{subtitle}</div>}
          </div>
          {badge && <div className="text-end flex-shrink-0">{badge}</div>}
        </div>
        {meta && meta.length > 0 && (
          <div className="mt-2 small text-muted">
            {meta.map((row, i) => (
              <div key={i} className="text-truncate">
                {row.label}: {row.value}
              </div>
            ))}
          </div>
        )}
        {actions && (
          <div className="d-flex justify-content-end gap-2 mt-3 flex-wrap">{actions}</div>
        )}
      </div>
    </div>
  );
};
