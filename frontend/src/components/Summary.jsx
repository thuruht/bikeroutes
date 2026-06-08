import React from 'react';

export default function Summary({ route }) {
  if (!route) return null;
  const distKm = (route.dist / 1000).toFixed(1);
  const timeMins = Math.round(route.time / 60);
  const timeStr = timeMins < 60 ? `${timeMins} min` : `${Math.floor(timeMins / 60)}h ${timeMins % 60}m`;

  const grade = route.dist > 0 ? (route.ascend / route.dist) * 100 : 0;
  const difficulty = grade > 4 ? 3 : grade > 1.5 ? 2 : 1;
  const diffTxt = ["", "Easy", "Moderate", "Hard"][difficulty];

  return (
    <div className="summary">
      <div className="summary-top">
        <div className="dist mono">{distKm}<span>km</span></div>
        <div className="time">· <b>{timeStr}</b> riding</div>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <div className="k">Climb</div>
          <div className="v mono">+{Math.round(route.ascend)}<small> m</small></div>
        </div>
        <div className="stat">
          <div className="k">Surface</div>
          <div className="v mono">{route.surface?.paved || 0}%<small> paved</small></div>
        </div>
      </div>
      <div className="diffbar">
        <div className="dots">
          {[1, 2, 3].map(n => <i key={n} className={n <= difficulty ? "on" : ""} />)}
        </div>
        <span className="txt">{diffTxt} · {route.source === 'worker' ? 'Official Route' : 'Estimated'}</span>
      </div>
    </div>
  );
}
