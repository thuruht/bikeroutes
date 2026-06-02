import styles from './LandingView.module.css'

function LandingView({ onOpenPlanner }) {
  return (
    <div className={styles.container}>
      <div className="stack">
        <div className="eyebrow">Kansas City & beyond</div>
        <h1 className={styles.title}>bikeroutes.org</h1>
        <div className="hero-text">ride better routes</div>
        <div className="subtitle">plan, explore, share</div>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={onOpenPlanner}>
          Open the Route Planner
        </button>
        <button className={styles.secondaryBtn}>
          Learn about the project
        </button>
      </div>

      <p className={styles.note}>
        Free, open-source bike trail navigation. No ads, no tracking.
      </p>
    </div>
  )
}

export default LandingView
