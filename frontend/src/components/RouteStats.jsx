export default function RouteStats({ info }) {
  if (!info) return null

  const distKm = parseFloat(info.distance) || 0;
  const elevM = parseFloat(info.elevation) || 0;
  const grade = distKm > 0 ? (elevM / (distKm * 1000) * 100) : 0;
  const mPerKm = distKm > 0 ? elevM / distKm : 0;
  const diff = mPerKm < 8 ? 1 : mPerKm < 18 ? 2 : 3;
  const diffTxt = ["", "Easy", "Moderate", "Hard"][diff];
  const diffSub = ["", "gentle grades", "rolling terrain", "serious climbing"][diff];

  return (
    <div className="summary">
      <div className="summary-top">
        <div className="dist mono">{info.distance}<span>km</span></div>
        <div className="time">· <b>{info.time}</b></div>
      </div>
      <div className="stat-grid">
        <div className="stat">
          <div className="k">Climb</div>
          <div className="v mono">+{Math.round(elevM)}<small> m</small></div>
        </div>
        <div className="stat">
          <div className="k">Avg grade</div>
          <div className="v mono">{grade.toFixed(1)}<small> %</small></div>
        </div>
      </div>
      <div className="diffbar">
        <div className="dots">{[1, 2, 3].map(n => <i key={n} className={n <= diff ? "on" : ""} />)}</div>
        <span className="txt">{diffTxt} · {diffSub}</span>
      </div>
    </div>
  )
}
