import styles from './LandingView.module.css'

function LandingView({ onOpenPlanner }) {
  return (
    <section className="panel box tint" aria-labelledby="hero-title">
      <div className="stack">
        <div className="eyebrow">Kansas City & beyond</div>
        <h1 id="hero-title">to</h1>
        <div className="hero">BikeRoutes.org</div>
        <div className="subtitle">ride better routes</div>
      </div>

      <div className={styles.actions}>
        <button className={styles.primaryBtn} onClick={onOpenPlanner}>
          Open the Route Planner
        </button>
        <button className={styles.secondaryBtn}>
          Learn about the project
        </button>
      </div>

      <p className="note">
        Free, open-source bike trail navigation. No ads, no tracking.
      </p>
    </section>
  )
}

export default LandingView
