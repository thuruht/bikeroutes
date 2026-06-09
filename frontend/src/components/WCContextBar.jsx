import styles from './WCContextBar.module.css'

export default function WCContextBar({ onMatchDayRoutes, onTrailsForVisitors, onExit }) {
  return (
    <div className={styles.contextBar} id="wc-context-bar">
      <div className={styles.left}>
        <span>⚽</span>
        <span>FIFA World Cup 26 — Kansas City Mode</span>
      </div>
      <div className={styles.center}>
        <span>Bike to the game. Beat the traffic.</span>
      </div>
      <div className={styles.right}>
        <button type="button" className={styles.btn} onClick={onMatchDayRoutes}>
          Route to Venue
        </button>
        <button type="button" className={styles.btn} onClick={onTrailsForVisitors}>
          Visitor Routing
        </button>
        <button type="button" className={`${styles.btn} ${styles.exit}`} onClick={onExit} aria-label="Exit KC Mode">
          ✕
        </button>
      </div>
    </div>
  )
}
