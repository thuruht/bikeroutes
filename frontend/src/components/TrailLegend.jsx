import { useEffect, useRef, useState } from 'react';

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
  // The tile renderer uses relation ref when available.
  if (r.ref) return r.ref;
  const name = r.displayName || r.name || '';
  if (!name) return '?';
  return name.slice(0, 5);
}

const Ic = {
  chevron: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 9l6 6 6-6"/></svg>,
};

export default function TrailLegend() {
  const [routes, setRoutes] = useState(null);
  const [err, setErr] = useState(false);
  const [open, setOpen] = useState(false);
  const [hovered, setHovered] = useState(null);
  const [tooltipPos, setTooltipPos] = useState({ x: 0, y: 0 });
  const listRef = useRef(null);

  useEffect(() => {
    fetch('/api/trail-overlay-legend')
      .then(r => r.json())
      .then(d => setRoutes(d.routes || []))
      .catch(() => setErr(true));
  }, []);

  const handleMouseEnter = (e, r) => {
    setHovered(r);
    updateTooltipPos(e);
  };

  const updateTooltipPos = (e) => {
    const rect = e.currentTarget.getBoundingClientRect();
    setTooltipPos({ x: rect.right + 8, y: rect.top });
  };

  const count = routes?.length ?? 0;

  return (
    <div style={{ marginTop: 4, padding: 12, borderRadius: 14, background: 'var(--paper-2)', border: '1px solid var(--line)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between', background: 'transparent', border: 0, padding: 0, color: 'var(--ink)', cursor: 'pointer' }}
      >
        <span className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', textTransform: 'uppercase', letterSpacing: '.05em' }}>
          Route shields {count > 0 && `· ${count}`}
        </span>
        <span style={{ display: 'grid', placeItems: 'center', width: 20, height: 20, color: 'var(--muted-txt)', transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform .15s ease' }}>{Ic.chevron}</span>
      </button>

      {open && (
        <div ref={listRef} style={{ marginTop: 10, display: 'grid', gap: 6, maxHeight: 240, overflowY: 'auto', paddingRight: 2 }}>
          {err && <div className="mono" style={{ fontSize: 11, color: 'var(--muted-txt)' }}>Could not load route legend.</div>}
          {!err && routes === null && <div className="mono" style={{ fontSize: 11, color: 'var(--muted-txt)' }}>Loading route legend…</div>}
          {!err && routes && routes.length === 0 && <div className="mono" style={{ fontSize: 11, color: 'var(--muted-txt)' }}>No signed routes found in overlay.</div>}

          {!err && routes && routes.map((r, i) => {
            const badge = badgeText(r);
            const fullName = r.displayName || r.name;
            const showName = fullName && badge.toLowerCase() !== fullName.toLowerCase();
            return (
              <div
                key={i}
                onMouseEnter={(e) => handleMouseEnter(e, r)}
                onMouseLeave={() => setHovered(null)}
                onMouseMove={updateTooltipPos}
                style={{ display: 'flex', alignItems: 'center', gap: 10, cursor: 'help' }}
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
                  {showName && (
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
      )}

      {hovered && (
        <div style={{
          position: 'fixed',
          left: tooltipPos.x,
          top: tooltipPos.y,
          zIndex: 100,
          maxWidth: 260,
          padding: '8px 10px',
          background: 'var(--panel-solid)',
          border: '1px solid var(--line)',
          borderRadius: 8,
          boxShadow: 'var(--shadow)',
          fontSize: 11.5,
          color: 'var(--ink-2)',
          lineHeight: 1.45,
          pointerEvents: 'none',
        }}>
          <div style={{ fontWeight: 700, color: 'var(--ink)', marginBottom: 3 }}>{hovered.displayName || hovered.name}</div>
          <div><b>Badge:</b> {badgeText(hovered)}</div>
          {hovered.ref && <div><b>Ref:</b> {hovered.ref}</div>}
          {hovered.network && <div><b>Network:</b> {NETWORK_LABEL[hovered.network] || hovered.network}</div>}
          {hovered.context && <div>{hovered.context}</div>}
        </div>
      )}
    </div>
  );
}
