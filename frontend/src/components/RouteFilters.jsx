import styles from './RouteFilters.module.css'

const SURFACE_TYPES = [
  { id: 'paved', label: 'Paved', color: 'var(--orange)' },
  { id: 'gravel', label: 'Gravel', color: '#c4a484' },
  { id: 'dirt', label: 'Dirt', color: '#8b5a2b' },
  { id: 'mtb', label: 'MTB', color: '#556b2f' },
]

const ACCESSIBILITY_FILTERS = [
  { id: 'wheelchair', label: 'Wheelchair Friendly', icon: '♿' },
  { id: 'kid-trailer', label: 'Kid-trailer Friendly', icon: '👶' },
]

export default function RouteFilters({ activeFilters, onToggleFilter }) {
  return (
    <div className={styles.container}>
      <h3 className={styles.title}>Surface</h3>
      <div className={styles.grid}>
        {SURFACE_TYPES.map((type) => (
          <button
            key={type.id}
            className={`${styles.chip} ${activeFilters.includes(type.id) ? styles.active : ''}`}
            onClick={() => onToggleFilter(type.id)}
          >
            <span 
              className={styles.dot} 
              style={{ backgroundColor: activeFilters.includes(type.id) ? type.color : 'var(--line)' }} 
            />
            {type.label}
          </button>
        ))}
      </div>
      
      <h3 className={styles.title} style={{ marginTop: 'var(--space-4)' }}>Accessibility</h3>
      <div className={styles.grid}>
        {ACCESSIBILITY_FILTERS.map((type) => (
          <button
            key={type.id}
            className={`${styles.chip} ${activeFilters.includes(type.id) ? styles.active : ''}`}
            onClick={() => onToggleFilter(type.id)}
          >
            <span style={{ fontSize: '12px' }}>{type.icon}</span>
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
