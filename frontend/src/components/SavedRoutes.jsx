import { useEffect, useState } from 'react';
import { useAuth } from '../AuthContext';
import * as BR from '../api';

const Ic = {
  save: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M6 3h10l4 4v14l-7-3-7 3V5a2 2 0 0 1 2-2z"/></svg>,
  load: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M4 14h6v6M20 10h-6V4M20 4l-7 7M4 20l7-7"/></svg>,
  trash: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14z"/></svg>,
  check: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 6L9 17l-5-5"/></svg>,
};

export default function SavedRoutes({ result, wps, costing, onLoad }) {
  const { user } = useAuth();
  const [routes, setRoutes] = useState([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [justSaved, setJustSaved] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const d = await BR.fetchSavedRoutes();
      setRoutes(d.routes || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (user) load();
  }, [user]);

  useEffect(() => {
    if (justSaved) {
      const t = setTimeout(() => setJustSaved(false), 2000);
      return () => clearTimeout(t);
    }
  }, [justSaved]);

  if (!user) return null;

  const handleSave = async () => {
    if (!result || !wps.filter(Boolean).length) return;
    const validWps = wps.filter(Boolean);
    const geometry = result.coords?.length
      ? { type: "LineString", coordinates: result.coords.map(c => [c[0], c[1]]) }
      : null;
    setSaving(true);
    try {
      const name = `${validWps[0]?.label || "Start"} → ${validWps[validWps.length - 1]?.label || "End"}`;
      await BR.saveRoute({
        name,
        waypoints: validWps.map(w => ({ lat: w.lat, lon: w.lon, label: w.label })),
        geometry,
        costing,
        distanceKm: result.dist,
        durationMin: result.time,
      });
      setJustSaved(true);
      await load();
    } catch (e) {
      alert("Could not save route. Sign in?");
      console.error(e);
    }
    setSaving(false);
  };

  const handleDelete = async (id) => {
    if (!confirm("Delete this saved route?")) return;
    try {
      await BR.deleteSavedRoute(id);
      await load();
    } catch (e) { console.error(e); }
  };

  const handleLoad = (r) => {
    onLoad(r);
  };

  return (
    <div style={{ marginTop: 14, padding: 12, background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 12 }}>
      <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-txt)', letterSpacing: '.04em', textTransform: 'uppercase', marginBottom: 8 }}>Saved routes</div>

      {result && (
        <button className="pillbtn" onClick={handleSave} disabled={saving} style={{ width: '100%', marginBottom: 10 }}>
          {justSaved ? <>{Ic.check} Saved</> : <>{Ic.save} {saving ? 'Saving…' : 'Save current route'}</>}
        </button>
      )}

      {loading && routes.length === 0 && <div style={{ fontSize: 12, color: 'var(--muted-txt)' }}>Loading…</div>}

      {routes.length === 0 && !loading && (
        <div style={{ fontSize: 12, color: 'var(--muted-txt)', padding: '6px 0' }}>No saved routes yet.</div>
      )}

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {routes.map(r => (
          <div key={r.id} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: 8, background: 'var(--paper)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 12.5, fontWeight: 600, color: 'var(--ink)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{r.name}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)' }}>
                {r.distance_km ? `${BR.fmtKm(r.distance_km)} km · ` : ''}
                {r.duration_min ? BR.fmtTime(r.duration_min) : ''}
                {r.costing ? ` · ${r.costing}` : ''}
              </div>
            </div>
            <button className="io-clear" onClick={() => handleLoad(r)} title="Load" style={{ color: 'var(--green)' }}>{Ic.load}</button>
            <button className="io-clear" onClick={() => handleDelete(r.id)} title="Delete" style={{ color: 'var(--muted-txt)' }}>{Ic.trash}</button>
          </div>
        ))}
      </div>
    </div>
  );
}
