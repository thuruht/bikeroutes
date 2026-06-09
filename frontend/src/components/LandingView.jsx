import styles from './LandingView.module.css'

function LandingView({ onOpenPlanner, onAboutClick }) {
  return (
    <div className={styles.container}>
      <img src="/reki_icon.png" alt="Reki the scout deer" className={styles.heroIcon} />
      
      <div className={styles.heroContent}>
        <div className="eyebrow">Kansas City & Midwest Trails</div>
        <h1 className={styles.heroTitle}>BikeRoutes.org</h1>
        <p className={styles.heroSubtitle}>
          Community-driven navigation for Midwest bike trails and connectors.
        </p>

        <div className={styles.actions}>
          <button className={styles.primaryBtn} onClick={onOpenPlanner}>
            OPEN ROUTE PLANNER →
          </button>
          <button className={styles.secondaryBtn} onClick={onAboutClick}>
            LEARN MORE
          </button>
        </div>
      </div>
    </div>
  )
}

export default LandingView
