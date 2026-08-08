import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as BR from '../api';

const Ic = {
  point: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="4"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>,
  line: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M4 20L20 4"/></svg>,
  locate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><circle cx="12" cy="12" r="3"/><path d="M12 2v4M12 18v4M2 12h4M18 12h4"/></svg>,
  undo: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 7v6h6M3 7c3-4 9-5 13-1s5 9 1 13"/></svg>,
  clear: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 6h18M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2m3 0v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6h14"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
};

function geomTypeFor(coords) {
  if (!coords || coords.length === 0) return 'point';
  return coords.length === 1 && Array.isArray(coords[0]) ? 'line' : 'point';
}

export default function FeatureSubmissionEditor({ mapObj, categories, feature, onClose, onSubmitted }) {
  const [user, setUser] = useState(null);
  const [name, setName] = useState(feature?.properties?.name || '');
  const [category, setCategory] = useState(feature?.properties?.category || (categories[0] ?? 'Ride anchors'));
  const [description, setDescription] = useState(feature?.properties?.public_description || '');
  const [sourceNote, setSourceNote] = useState('');
  const [mode, setMode] = useState(() => {
    if (feature?.geometry?.type === 'LineString') return 'line';
    return 'point';
  });
  const [coords, setCoords] = useState(() => initCoords(feature));
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState('');
  const listeners = useRef([]);
  const draftMarker = useRef(null);

  useEffect(() => { BR.fetchMe().then(setUser); }, []);

  function initCoords(f) {
    if (!f?.geometry) return [];
    if (f.geometry.type === 'Point') return [f.geometry.coordinates];
    if (f.geometry.type === 'LineString') return f.geometry.coordinates;
    return [];
  }

  function syncDraftLayers() {
    const map = mapObj.current; if (!map) return;
    let src = map.getSource('draft-geometry');
    if (!src) return;
    let geom;
    if (coords.length === 0) {
      geom = { type: 'FeatureCollection', features: [] };
    } else if (mode === 'point') {
      geom = { type: 'Feature', geometry: { type: 'Point', coordinates: coords[0] }, properties: {} };
    } else {
      geom = { type: 'Feature', geometry: { type: 'LineString', coordinates: coords }, properties: {} };
    }
    src.setData(geom);

    if (draftMarker.current) { draftMarker.current.remove(); draftMarker.current = null; }
    if (mode === 'point' && coords.length > 0) {
      const el = document.createElement('div');
      el.style.cssText = 'width:16px;height:16px;border-radius:50%;background:var(--orange);border:3px solid #fff;box-shadow:0 2px 8px rgba(0,0,0,.5);';
      draftMarker.current = new maplibregl.Marker({ element: el }).setLngLat(coords[0]).addTo(map);
    }
  }

  useEffect(() => {
    const map = mapObj.current; if (!map) return;

    if (!map.getSource('draft-geometry')) {
      map.addSource('draft-geometry', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }
    if (!map.getLayer('draft-line')) {
      map.addLayer({
        id: 'draft-line', type: 'line', source: 'draft-geometry',
        filter: ['==', ['geometry-type'], 'LineString'],
        paint: { 'line-color': 'var(--orange)', 'line-width': 5, 'line-opacity': 0.9 },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      }, 'route-casing');
    }
    if (!map.getLayer('draft-vertices')) {
      map.addLayer({
        id: 'draft-vertices', type: 'circle', source: 'draft-geometry',
        paint: { 'circle-radius': 7, 'circle-color': 'var(--orange)', 'circle-stroke-width': 2, 'circle-stroke-color': '#fff' },
      }, 'route-casing');
    }

    const click = (e) => {
      const c = [e.lngLat.lng, e.lngLat.lat];
      setCoords(prev => {
        if (mode === 'point') return [c];
        if (prev.length > 0) {
          const last = prev[prev.length - 1];
          if (Math.abs(last[0] - c[0]) < 1e-8 && Math.abs(last[1] - c[1]) < 1e-8) return prev;
        }
        return [...prev, c];
      });
    };
    const doubleClick = (e) => {
      if (mode === 'line') {
        e.stopPropagation();
        setMessage('Line edit done. Submit when ready.');
      }
    };
    const move = (e) => {
      map.getCanvas().style.cursor = mode === 'point' ? 'crosshair' : 'crosshair';
    };
    const leave = () => { map.getCanvas().style.cursor = ''; };

    map.on('click', click);
    map.on('dblclick', doubleClick);
    map.on('mousemove', move);
    map.on('mouseout', leave);
    listeners.current.push(['click', click], ['dblclick', doubleClick], ['mousemove', move], ['mouseout', leave]);

    syncDraftLayers();

    return () => {
      for (const [ev, fn] of listeners.current) map.off(ev, fn);
      listeners.current = [];
      if (draftMarker.current) { draftMarker.current.remove(); draftMarker.current = null; }
      if (map.getLayer('draft-line')) map.removeLayer('draft-line');
      if (map.getLayer('draft-vertices')) map.removeLayer('draft-vertices');
      if (map.getSource('draft-geometry')) map.removeSource('draft-geometry');
    };
  }, []);

  useEffect(() => { syncDraftLayers(); }, [coords, mode]);

  const locateMe = () => {
    if (!navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition((pos) => {
      const c = [pos.coords.longitude, pos.coords.latitude];
      if (mode === 'point') setCoords([c]);
      else setCoords(prev => [...prev, c]);
      mapObj.current?.flyTo({ center: c, zoom: Math.max(mapObj.current.getZoom(), 15) });
    }, () => {});
  };

  const submit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setMessage('Name is required'); return; }
    if (coords.length === 0) { setMessage('Place a point or draw a line on the map first'); return; }
    if (mode === 'line' && coords.length < 2) { setMessage('A line needs at least two points'); return; }
    if (!user) { setMessage('Sign in required to submit'); return; }

    const geometry = mode === 'point'
      ? { type: 'Point', coordinates: coords[0] }
      : { type: 'LineString', coordinates: coords };

    setBusy(true); setMessage('');
    try {
      await BR.submitFeature({
        target_feature_id: feature?.id || null,
        name: name.trim(),
        category: category || categories[0] || 'Ride anchors',
        description: description.trim(),
        source_note: sourceNote.trim(),
        geometry,
      });
      onSubmitted();
      onClose();
    } catch (err) {
      setMessage('Submit failed. Sign in or try again.');
      console.error(err);
    }
    setBusy(false);
  };

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ fontWeight: 700, fontSize: 15, color: 'var(--ink)' }}>{feature ? 'Suggest an edit' : 'Suggest a feature'}</div>
        <button className="io-clear" onClick={onClose} style={{ color: 'var(--muted-txt)', width: 22, height: 22, display: 'grid', placeItems: 'center' }}>{Ic.x}</button>
      </div>

      <div style={{ fontSize: 11.5, color: 'var(--muted-txt)', lineHeight: 1.4 }}>
        {mode === 'point'
          ? 'Click the map to place a point. Drag/zoom as needed.'
          : 'Click the map to add line points. Double-click to finish.'}
      </div>

      <form onSubmit={submit}>
        <input placeholder="Feature name" value={name} onChange={(e) => setName(e.target.value)} required />
        <select value={category} onChange={(e) => setCategory(e.target.value)} style={{ marginTop: 8, width: '100%', padding: '9px 10px', borderRadius: 10, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)' }}>
          {categories.map((c) => <option key={c} value={c}>{c}</option>)}
        </select>
        <textarea placeholder="Description / why this matters" value={description} onChange={(e) => setDescription(e.target.value)} rows={3} style={{ marginTop: 8 }} />
        <textarea placeholder="Source (URL, photo, your own ride, etc.)" value={sourceNote} onChange={(e) => setSourceNote(e.target.value)} rows={2} style={{ marginTop: 8 }} />

        <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
          <button type="button" className={mode === 'point' ? 'primary' : 'pillbtn'} style={{ flex: 1 }} onClick={() => setMode('point')}><span style={{ width: 16, height: 16, display: 'grid', placeItems: 'center' }}>{Ic.point}</span> Point</button>
          <button type="button" className={mode === 'line' ? 'primary' : 'pillbtn'} style={{ flex: 1 }} onClick={() => setMode('line')}><span style={{ width: 16, height: 16, display: 'grid', placeItems: 'center' }}>{Ic.line}</span> Line</button>
        </div>

        <div style={{ display: 'flex', gap: 8, marginTop: 10, flexWrap: 'wrap' }}>
          <button type="button" className="pillbtn" onClick={locateMe}><span style={{ width: 15, height: 15, display: 'grid', placeItems: 'center' }}>{Ic.locate}</span> Use location</button>
          {mode === 'line' && (
            <button type="button" className="pillbtn" onClick={() => setCoords(prev => prev.slice(0, -1))}><span style={{ width: 15, height: 15, display: 'grid', placeItems: 'center' }}>{Ic.undo}</span> Undo</button>
          )}
          <button type="button" className="pillbtn" onClick={() => setCoords([])}><span style={{ width: 15, height: 15, display: 'grid', placeItems: 'center' }}>{Ic.clear}</span> Clear</button>
        </div>

        <div className="mono" style={{ fontSize: 11, color: 'var(--muted-txt)', marginTop: 8 }}>
          {coords.length === 0 ? 'No geometry yet' : mode === 'point' ? `Point placed` : `${coords.length} line points`}
        </div>

        {message && <div className="field-error" style={{ marginTop: 10 }}>{message}</div>}

        <button type="submit" className="primary" style={{ width: '100%', marginTop: 12 }} disabled={busy || coords.length === 0 || !name.trim()}>
          <span style={{ width: 16, height: 16, display: 'grid', placeItems: 'center' }}>{Ic.send}</span>
          {busy ? 'Submitting…' : 'Submit for review'}
        </button>
      </form>
    </div>
  );
}
