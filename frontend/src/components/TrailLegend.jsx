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
      {routes.map((r, i) => (
        <div key={i} title={`${r.ref ? r.ref + ' · ' : ''}${r.displayName || r.name}${r.context ? ' · ' + r.context : ''}`} style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 11 }}>
          {r.ref && (
            <span className="mono" style={{
              flex: 'none', padding: '2px 6px', borderRadius: 4,
              background: '#fff', color: '#111', fontWeight: 700,
              border: `1px solid ${NETWORK_COLOR[r.network] || '#999'}`,
              boxShadow: '0 1px 2px rgba(0,0,0,.25)',
              fontSize: 10, minWidth: 20, textAlign: 'center',
              textTransform: 'uppercase', letterSpacing: '.02em',
            }}>{r.ref}</span>
          )}
          <div style={{ minWidth: 0, lineHeight: 1.35 }}>
            <div style={{ color: 'var(--ink-2)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{r.displayName || r.name}</div>
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted-txt)' }}>
              {NETWORK_LABEL[r.network] || r.network || 'bike route'}
              {r.context ? ` · ${r.context}` : ''}
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
