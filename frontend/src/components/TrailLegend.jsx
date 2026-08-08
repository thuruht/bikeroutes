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
    <div style={{ display: 'grid', gap: 8, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
      {routes.map((r, i) => (
        <div key={i} style={{ display: 'flex', alignItems: 'baseline', gap: 8, fontSize: 11 }}>
          {r.ref && (
            <span className="mono" style={{
              flex: 'none', padding: '2px 6px', borderRadius: 4,
              background: 'var(--green-soft)', color: 'var(--green)', fontWeight: 600,
              border: '1px solid var(--line)',
            }}>{r.ref}</span>
          )}
          <div style={{ minWidth: 0 }}>
            <span style={{ color: 'var(--ink-2)' }}>{r.displayName || r.name}</span>
            {r.context && <div className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', marginTop: 2 }}>{r.context}</div>}
          </div>
        </div>
      ))}
    </div>
  );
}
