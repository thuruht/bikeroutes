import styles from './RouteStats.module.css'

export default function RouteStats({ info }) {
  if (!info) return null

  return (
    <div className={`box ${styles.container}`}>
      <div className={styles.stat}>
        <div className={styles.label}>Distance</div>
        <div className={styles.value}>
          {info.distance} <span className={styles.unit}>mi</span>
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <div className={styles.label}>Elevation</div>
        <div className={styles.value}>
          {info.elevation} <span className={styles.unit}>ft ↑</span>
        </div>
      </div>
      <div className={styles.divider} />
      <div className={styles.stat}>
        <div className={styles.label}>Est. Time</div>
        <div className={styles.value}>
          {info.time}
        </div>
      </div>
    </div>
  )
}
