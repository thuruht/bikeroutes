import { useEffect, useState } from 'react';

const NETWORK_COLOR = {
  ncn: '#c45c5c', // national
  rcn: '#8a6bc9', // regional
  lcn: '#4a9aa8', // local
};

const NETWORK_LABEL = {
  ncn: 'national',
  rcn: 'regional',
  lcn: 'local',
};

export default function TrailLegend() {
  const [routes, setRoutes] = useState(null);
  const [err, setErr] = useState(false);

  useEffect(() => {
    fetch('/api/trail-overlay-legend')
      .then(r => r.json())
      .then(d => setRoutes(d.routes || []))
      .catch(() => setErr(true));
  }, []);

  if (err) return <div className="mono" style={{ fontSize: 11, color: 'var(--muted-txt)' }}>Could not load route legend.</div>;
  if (!routes) return <div className="mono" style={{ fontSize: 11, color: 'var(--muted-txt)' }}>Loading route legend…</div>;
  if (routes.length === 0) return <div className="mono" style={{ fontSize: 11, color: 'var(--muted-txt)' }}>No signed routes found in overlay.</div>;

  return (
    <div style={{ display: 'grid', gap: 6, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
      {routes.map((r, i) => {
        const badge = r.ref || r.name || '?';
        const fullName = r.displayName || r.name;
        return (
          <div
            key={i}
            title={`${badge}${fullName && badge !== fullName ? ' · ' + fullName : ''}${r.context ? ' · ' + r.context : ''}`}
            style={{ display: 'flex', alignItems: 'center', gap: 10 }}
          >
            <span className="mono" style={{
              flex: 'none',
              minWidth: 30, padding: '3px 7px',
              borderRadius: 5,
              background: '#fff', color: '#111',
              border: `2px solid ${NETWORK_COLOR[r.network] || '#999'}`,
              boxShadow: '0 1px 2px rgba(0,0,0,.25)',
              fontSize: 12, fontWeight: 800,
              textAlign: 'center',
              textTransform: 'uppercase', letterSpacing: '.03em',
            }}>{badge}</span>
            <div style={{ minWidth: 0, lineHeight: 1.3 }}>
              {fullName && badge.toLowerCase() !== fullName.toLowerCase() && (
                <div style={{ fontSize: 11, color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{fullName}</div>
              )}
              <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted-txt)' }}>
                {NETWORK_LABEL[r.network] || r.network || 'bike route'}
                {r.context ? ` · ${r.context}` : ''}
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
