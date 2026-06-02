import styles from './RouteFilters.module.css'

const SURFACE_TYPES = [
  { id: 'paved', label: 'Paved', color: 'var(--paved)' },
  { id: 'gravel', label: 'Gravel', color: 'var(--gravel)' },
  { id: 'dirt', label: 'Dirt', color: 'var(--dirt)' },
  { id: 'mtb', label: 'MTB', color: 'var(--mtb)' },
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
              style={{ backgroundColor: activeFilters.includes(type.id) ? type.color : 'var(--color-border)' }} 
            />
            {type.label}
          </button>
        ))}
      </div>
    </div>
  )
}
