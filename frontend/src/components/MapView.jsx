import { useEffect, useRef, useState, useMemo } from 'react';
import maplibregl from 'maplibre-gl';

const CATEGORY_COLORS = {
  'Trail spines': '#7a9a8c',
  'Pedestrian or walking bridges': '#6b5b95',
  'Neighborhoods': '#d4a96a',
  'Ride anchors': '#c06c44',
  'Boundary anchors': '#8c8970',
  'Key parks': '#5f7d70',
  'Planned / in progress': '#d98a5a',
  'Surface / connector notes': '#b9722a',
};

const DEFAULT_COLOR = '#999';

function colorExpression() {
  const stops = [];
  for (const [cat, color] of Object.entries(CATEGORY_COLORS)) {
    stops.push(cat, color);
  }
  return ['match', ['get', 'category'], ...stops, DEFAULT_COLOR];
}

function categoryFilter(active) {
  if (!active || active.length === 0) return ['boolean', false];
  return ['in', ['get', 'category'], ['literal', active]];
}

function centerOf(geometry) {
  if (!geometry) return null;
  if (geometry.type === 'Point') return geometry.coordinates;
  if (geometry.type === 'LineString') {
    let lon = 0, lat = 0;
    for (const [x, y] of geometry.coordinates) { lon += x; lat += y; }
    return [lon / geometry.coordinates.length, lat / geometry.coordinates.length];
  }
  return null;
}

export default function MapView({ mapObj }) {
  const [features, setFeatures] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const [activeCats, setActiveCats] = useState([]);
  const [selected, setSelected] = useState(null);
  const [detail, setDetail] = useState(null);
  const [comments, setComments] = useState([]);
  const [checkpoints, setCheckpoints] = useState([]);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const markerRef = useRef(null);
  const listeners = useRef([]);

  const categories = useMemo(() => {
    const cats = Array.from(new Set(features.map(f => f.properties?.category).filter(Boolean)));
    return cats;
  }, [features]);

  // Ensure all categories are active by default once loaded
  useEffect(() => {
    if (activeCats.length === 0 && categories.length > 0) {
      setActiveCats(categories);
    }
  }, [categories, activeCats.length]);

  const clearHighlight = () => {
    if (markerRef.current) { markerRef.current.remove(); markerRef.current = null; }
  };

  const highlight = (geometry) => {
    const map = mapObj.current;
    const center = centerOf(geometry);
    if (!map || !center) return;
    clearHighlight();
    const el = document.createElement('div');
    el.style.cssText = 'width:14px;height:14px;border-radius:50%;background:var(--green);border:3px solid #fff;box-shadow:0 0 0 4px rgba(122,154,140,.35);';
    markerRef.current = new maplibregl.Marker({ element: el }).setLngLat(center).addTo(map);
  };

  const loadLayers = () => {
    const map = mapObj.current;
    if (!map) return;

    if (!map.getSource('curated-points')) {
      map.addSource('curated-points', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 50,
      });
    }
    if (!map.getSource('curated-lines')) {
      map.addSource('curated-lines', { type: 'geojson', data: { type: 'FeatureCollection', features: [] } });
    }

    if (!map.getLayer('curated-lines')) {
      map.addLayer({
        id: 'curated-lines',
        type: 'line',
        source: 'curated-lines',
        filter: categoryFilter(activeCats),
        paint: {
          'line-color': colorExpression(),
          'line-width': 3,
          'line-opacity': 0.85,
        },
        layout: { 'line-cap': 'round', 'line-join': 'round' },
      }, 'route-casing');
    }

    if (!map.getLayer('curated-clusters')) {
      map.addLayer({
        id: 'curated-clusters',
        type: 'circle',
        source: 'curated-points',
        filter: ['all', ['has', 'point_count'], categoryFilter(activeCats)],
        paint: {
          'circle-color': '#7a9a8c',
          'circle-radius': ['step', ['get', 'point_count'], 18, 5, 24, 15, 32, 30, 42],
          'circle-opacity': 0.9,
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      }, 'route-casing');
    }

    if (!map.getLayer('curated-cluster-count')) {
      map.addLayer({
        id: 'curated-cluster-count',
        type: 'symbol',
        source: 'curated-points',
        filter: ['all', ['has', 'point_count'], categoryFilter(activeCats)],
        layout: {
          'text-field': '{point_count_abbreviated}',
          'text-size': 12,
          'text-font': ['literal', ['Outfit Medium', 'Open Sans Medium']],
        },
        paint: { 'text-color': '#fff' },
      }, 'route-casing');
    }

    if (!map.getLayer('curated-points')) {
      map.addLayer({
        id: 'curated-points',
        type: 'circle',
        source: 'curated-points',
        filter: ['all', ['!', ['has', 'point_count']], categoryFilter(activeCats)],
        paint: {
          'circle-radius': 7,
          'circle-color': colorExpression(),
          'circle-stroke-width': 2,
          'circle-stroke-color': '#fff',
        },
      }, 'route-casing');
    }

    updateData();
  };

  const updateData = () => {
    const map = mapObj.current;
    if (!map) return;
    const points = features.filter(f => f.geometry?.type === 'Point').map(f => ({
      ...f,
      properties: { ...f.properties, id: f.id },
    }));
    const lines = features.filter(f => f.geometry?.type === 'LineString').map(f => ({
      ...f,
      properties: { ...f.properties, id: f.id },
    }));
    const ptSrc = map.getSource('curated-points');
    if (ptSrc) ptSrc.setData({ type: 'FeatureCollection', features: points });
    const lineSrc = map.getSource('curated-lines');
    if (lineSrc) lineSrc.setData({ type: 'FeatureCollection', features: lines });
  };

  const updateFilters = () => {
    const map = mapObj.current;
    if (!map) return;
    for (const id of ['curated-lines', 'curated-clusters', 'curated-cluster-count', 'curated-points']) {
      if (map.getLayer(id)) map.setFilter(id, ['all', ...getBaseFilter(id), categoryFilter(activeCats)]);
    }
  };

  function getBaseFilter(id) {
    if (id === 'curated-lines') return [];
    if (id === 'curated-clusters' || id === 'curated-cluster-count') return [['has', 'point_count']];
    return [['!', ['has', 'point_count']]];
  }

  useEffect(() => {
    updateFilters();
  }, [activeCats]);

  useEffect(() => {
    updateData();
  }, [features]);

  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    setBusy(true);
    setError(false);

    const load = () => {
      loadLayers();
      setBusy(false);
    };

    if (map.loaded() || map.isStyleLoaded()) load();
    else map.once('load', load);

    const onClusterClick = async (e) => {
      const f = e.features[0];
      const clusterId = f.properties.cluster_id;
      const zoom = await new Promise((resolve, reject) => {
        map.getSource('curated-points').getClusterExpansionZoom(clusterId, (err, z) => (err ? reject(err) : resolve(z)));
      });
      map.flyTo({ center: f.geometry.coordinates, zoom: Math.min(zoom + 1, 16), duration: 500 });
    };

    const onPointClick = (e) => {
      const f = e.features[0];
      selectFeature(f.properties.id || f.id);
    };

    const onLineClick = (e) => {
      const f = e.features[0];
      selectFeature(f.properties.id || f.id);
    };

    map.on('click', 'curated-clusters', onClusterClick);
    map.on('click', 'curated-points', onPointClick);
    map.on('click', 'curated-lines', onLineClick);
    listeners.current.push(['click', 'curated-clusters', onClusterClick]);
    listeners.current.push(['click', 'curated-points', onPointClick]);
    listeners.current.push(['click', 'curated-lines', onLineClick]);

    const onStyleData = () => { if (!map.getSource('curated-points')) loadLayers(); };
    map.on('styledata', onStyleData);
    listeners.current.push(['styledata', null, onStyleData]);

    fetch('/api/curated-features?limit=500')
      .then(r => r.json())
      .then(d => setFeatures(d.features || []))
      .catch(() => setError(true));

    return () => {
      clearHighlight();
      for (const [event, layer, fn] of listeners.current) {
        if (layer) map.off(event, layer, fn);
        else map.off(event, fn);
      }
      listeners.current = [];
      for (const lid of ['curated-lines', 'curated-clusters', 'curated-cluster-count', 'curated-points']) {
        if (map.getLayer(lid)) map.removeLayer(lid);
      }
      for (const sid of ['curated-points', 'curated-lines']) {
        if (map.getSource(sid)) map.removeSource(sid);
      }
      map.off('load', load);
    };
  }, []);

  const selectFeature = (id) => {
    if (!id) return;
    const f = features.find(x => x.id === id);
    setSelected(f || null);
    if (f) highlight(f.geometry);
    setDetail(null);
    setComments([]);
    setCheckpoints([]);
    setLoadingDetail(true);
    Promise.all([
      fetch(`/api/curated-features/${id}`).then(r => r.ok ? r.json() : null).catch(() => null),
      fetch(`/api/curated-features/${id}/comments`).then(r => r.ok ? r.json() : { comments: [] }).catch(() => ({ comments: [] })),
      fetch(`/api/curated-features/${id}/checkpoints`).then(r => r.ok ? r.json() : { checkpoints: [] }).catch(() => ({ checkpoints: [] })),
    ]).then(([d, c, k]) => {
      setDetail(d);
      setComments(c.comments || []);
      setCheckpoints(k.checkpoints || []);
      setLoadingDetail(false);
    });
  };

  const toggleCat = (cat) => {
    setActiveCats(prev => prev.includes(cat) ? prev.filter(c => c !== cat) : [...prev, cat]);
  };

  const allActive = activeCats.length === categories.length;
  const toggleAll = () => setActiveCats(allActive ? [] : categories);

  return (
    <div className="fade-in" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
      <div style={{ fontSize: 12.5, color: 'var(--muted-txt)', lineHeight: 1.4 }}>
        Community-curated ride anchors, trail spines, and planned connectors for the KC metro.
      </div>

      {categories.length > 0 && (
        <>
          <div className="legend-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <span className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Legend</span>
            <button className="text-btn" onClick={toggleAll} style={{ fontSize: 11, color: 'var(--green)', background: 'none', border: 'none', cursor: 'pointer' }}>
              {allActive ? 'Hide all' : 'Show all'}
            </button>
          </div>
          <div className="legend-grid" style={{ display: 'grid', gap: 6 }}>
            {categories.map(cat => (
              <button key={cat} onClick={() => toggleCat(cat)} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                textAlign: 'left', padding: '8px 10px', borderRadius: 10,
                border: '1px solid var(--line)', background: activeCats.includes(cat) ? 'var(--green-soft)' : 'var(--paper-2)',
                color: 'var(--ink)', cursor: 'pointer', fontSize: 12,
              }}>
                <span style={{ width: 10, height: 10, borderRadius: '50%', background: CATEGORY_COLORS[cat] || DEFAULT_COLOR, flex: 'none' }} />
                <span style={{ flex: 1 }}>{cat}</span>
                <span style={{ fontSize: 10, color: 'var(--muted-txt)' }}>
                  {features.filter(f => f.properties?.category === cat).length}
                </span>
              </button>
            ))}
          </div>
        </>
      )}

      {busy && <div className="mono" style={{ color: 'var(--muted-txt)', fontSize: 12, padding: '8px 0' }}>Loading map features…</div>}
      {error && <div className="mono" style={{ color: 'var(--danger)', fontSize: 12, padding: '8px 0' }}>Failed to load curated features.</div>}

      {selected && (
        <div className="feature-card" style={{
          marginTop: 8, padding: 14, borderRadius: 14,
          background: 'var(--paper-2)', border: '1px solid var(--line)',
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 }}>
            <div className="nm" style={{ fontWeight: 600, fontFamily: 'var(--font-head)', fontSize: 15, color: 'var(--ink)' }}>
              {selected.properties?.name || selected.id}
            </div>
            <button className="text-btn" onClick={() => { setSelected(null); clearHighlight(); }} style={{ fontSize: 16, color: 'var(--muted-txt)', background: 'none', border: 'none', cursor: 'pointer' }}>×</button>
          </div>
          <div className="mono" style={{ fontSize: 11, color: 'var(--muted-txt)', marginBottom: 8 }}>
            {selected.properties?.category} · {selected.properties?.feature_type} · {selected.properties?.officiality}
          </div>
          {loadingDetail ? (
            <div className="mono" style={{ fontSize: 12, color: 'var(--muted-txt)', padding: '10px 0' }}>Loading details…</div>
          ) : detail ? (
            <>
              {detail.public_description && <div style={{ fontSize: 12.5, lineHeight: 1.5, color: 'var(--ink-2)', marginBottom: 10 }}>{detail.public_description}</div>}
              {detail.surface_note && <div style={{ fontSize: 12, color: 'var(--ink-2)', marginBottom: 6 }}><b>Surface:</b> {detail.surface_note}</div>}
              {detail.risk_note && <div style={{ fontSize: 12, color: 'var(--danger)', marginBottom: 6 }}><b>Risk:</b> {detail.risk_note}</div>}
              {detail.weather_sensitivity && <div style={{ fontSize: 12, color: 'var(--warn)', marginBottom: 6 }}><b>Weather:</b> {detail.weather_sensitivity}</div>}
              {comments.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', marginBottom: 4 }}>Comments</div>
                  {comments.slice(0, 5).map((c, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)', padding: '4px 0', borderBottom: '1px solid var(--line)' }}>
                      <b>{c.author_name || 'Anonymous'}:</b> {c.body}
                    </div>
                  ))}
                </div>
              )}
              {checkpoints.length > 0 && (
                <div style={{ marginTop: 10 }}>
                  <div className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', marginBottom: 4 }}>Checkpoints</div>
                  {checkpoints.slice(0, 5).map((k, i) => (
                    <div key={i} style={{ fontSize: 12, color: 'var(--ink-2)' }}>
                      {k.check_in_type} {k.note && `— ${k.note}`}
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="mono" style={{ fontSize: 12, color: 'var(--muted-txt)' }}>No details available.</div>
          )}
        </div>
      )}
    </div>
  );
}
