import styles from './PlannerView.module.css'

function PlannerView({ leftColumn, rightColumn }) {
  return (
    <div className={styles.planner}>
      <aside className={styles.sidebar}>
        {leftColumn}
      </aside>
      <main className={styles.mapContainer}>
        {rightColumn}
      </main>
    </div>
  )
}

export default PlannerView
