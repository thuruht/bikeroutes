import { useEffect, useRef, useMemo } from 'react';
import uPlot from 'uplot';
import 'uplot/dist/uPlot.min.css';
import styles from './ElevationProfile.module.css';

// Simple distance calculation (Haversine)
function getDistance(lon1, lat1, lon2, lat2) {
  const R = 3958.8; // Miles
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a = 
    Math.sin(dLat/2) * Math.sin(dLat/2) +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
    Math.sin(dLon/2) * Math.sin(dLon/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c;
}

export default function ElevationProfile({ geojson }) {
  const containerRef = useRef(null);
  const chartRef = useRef(null);

  const data = useMemo(() => {
    if (!geojson || !geojson.features || !geojson.features[0]) return null;
    const coords = geojson.features[0].geometry.coordinates;
    if (!coords || coords.length === 0) return null;

    const distances = [0];
    const elevations = [Math.round((coords[0][2] || 0) * 3.28084)]; // Convert meters to feet
    let totalDist = 0;

    for (let i = 1; i < coords.length; i++) {
      const d = getDistance(coords[i-1][0], coords[i-1][1], coords[i][0], coords[i][1]);
      totalDist += d;
      distances.push(parseFloat(totalDist.toFixed(2)));
      elevations.push(Math.round((coords[i][2] || 0) * 3.28084));
    }

    return [distances, elevations];
  }, [geojson]);

  useEffect(() => {
    if (!data || !containerRef.current) return;

    const opts = {
      width: containerRef.current.offsetWidth,
      height: 140,
      padding: [10, 10, 0, 10],
      cursor: {
        show: true,
        drag: { x: false, y: false },
      },
      scales: {
        x: { time: false },
      },
      series: [
        {},
        {
          label: "Elevation",
          stroke: "#1b7b81",
          fill: "rgba(27, 123, 129, 0.1)",
          width: 2,
          points: { show: false },
          value: (u, v) => v + " ft",
        },
      ],
      axes: [
        {
          stroke: "#5e5b56",
          grid: { show: false },
          size: 30,
          values: (u, vals) => vals.map(v => v + " mi"),
        },
        {
          stroke: "#5e5b56",
          grid: { stroke: "rgba(34, 33, 31, 0.05)", width: 1 },
          size: 50,
          values: (u, vals) => vals.map(v => v + " ft"),
        },
      ],
    };

    if (chartRef.current) {
      chartRef.current.setData(data);
    } else {
      chartRef.current = new uPlot(opts, data, containerRef.current);
    }

    const handleResize = () => {
      if (chartRef.current && containerRef.current) {
        chartRef.current.setSize({
          width: containerRef.current.offsetWidth,
          height: 140
        });
      }
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
    };
  }, [data]);

  if (!data) return null;

  return (
    <div className={`box ${styles.container}`}>
      <div className={styles.header}>
        <span className={styles.title}>Elevation Profile</span>
        <span className={styles.hint}>🦌 Reki's scouted terrain</span>
      </div>
      <div ref={containerRef} className={styles.chart} />
    </div>
  );
}
