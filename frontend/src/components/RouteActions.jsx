import styles from './RouteActions.module.css'

export default function RouteActions({ onExport, onShare, onClear, isNavigating, onToggleNavigation }) {
  return (
    <div className={styles.container}>
      <button 
        className={`${styles.primaryBtn} ${isNavigating ? styles.destructive : ''}`} 
        onClick={onToggleNavigation}
      >
        {isNavigating ? 'End Ride' : 'Start Ride'}
      </button>

      <div className={styles.secondaryGrid}>
        <button className={styles.secondaryBtn} onClick={onExport}>
          Export GPX
        </button>
        <button className={styles.secondaryBtn} onClick={onShare}>
          Share
        </button>
        <button className={`${styles.secondaryBtn} ${styles.clear}`} onClick={onClear}>
          Reset
        </button>
      </div>
    </div>
  )
}
