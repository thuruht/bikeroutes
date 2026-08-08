import { useEffect, useState } from 'react';

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
    <div style={{ display: 'grid', gap: 6, maxHeight: 220, overflowY: 'auto', paddingRight: 4 }}>
      {routes.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11 }}>
          <span className="mono" style={{
            flex: 'none', padding: '2px 5px', borderRadius: 4,
            background: '#e8e0f0', color: '#5e4b7a', fontWeight: 600,
          }}>{r.ref}</span>
          <span style={{ color: 'var(--ink-2)' }}>{r.name}</span>
        </div>
      ))}
    </div>
  );
}
