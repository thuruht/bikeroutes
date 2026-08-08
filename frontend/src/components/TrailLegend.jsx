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

function badgeText(r) {
  // Prefer OSM ref because Waymarked Trails renders the ref in the shield.
  if (r.ref) return r.ref;
  // If there is no ref, the tile renderer shows a truncated version of the name.
  const name = r.displayName || r.name || '';
  if (!name) return '?';
  return name.slice(0, 5);
}

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
    <div style={{ display: 'grid', gap: 5, maxHeight: 240, overflowY: 'auto', paddingRight: 4 }}>
      {routes.map((r, i) => {
        const badge = badgeText(r);
        const fullName = r.displayName || r.name;
        return (
          <div
            key={i}
            title={fullName || badge}
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
            <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted-txt)', lineHeight: 1.3 }}>
              {NETWORK_LABEL[r.network] || r.network || 'bike route'}
              {r.context ? ` · ${r.context}` : ''}
            </div>
          </div>
        );
      })}
    </div>
  );
}
