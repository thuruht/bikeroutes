import './WCContextBar.css'

export default function WCContextBar({ onMatchDayRoutes, onTrailsForVisitors, onExit }) {
  return (
    <div className="wc-context-bar" id="wc-context-bar">
      <div className="wc-context-left">
        <span className="wc-context-icon">⚽</span>
        <span className="wc-context-label">FIFA World Cup 26 — Kansas City Mode</span>
      </div>
      <div className="wc-context-center">
        <span className="wc-context-tagline">Bike to the game. Beat the traffic.</span>
      </div>
      <div className="wc-context-right">
        <button className="wc-context-btn" onClick={onMatchDayRoutes}>
          <span>📍</span> <span className="wc-ctx-btn-text">Match Day Routes</span>
        </button>
        <button className="wc-context-btn" onClick={onTrailsForVisitors}>
          <span>🚲</span> <span className="wc-ctx-btn-text">Trails for Visitors</span>
        </button>
        <button className="wc-context-btn exit" onClick={onExit} aria-label="Exit KC Mode">
          EXIT ✕
        </button>
      </div>
    </div>
  )
}
