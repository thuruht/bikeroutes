import styles from './PlannerView.module.css'

export default function PlannerView({ leftColumn, rightColumn, hasBanner }) {
  return (
    <div className={`${styles.plannerShell} ${hasBanner ? styles.withBanner : ''}`}>
      <aside className={styles.leftColumn}>
        {leftColumn}
      </aside>
      <section className={styles.rightColumn}>
        {rightColumn}
      </section>
    </div>
  )
}
