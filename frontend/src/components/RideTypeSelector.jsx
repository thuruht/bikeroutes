import styles from './RideTypeSelector.module.css'

const RIDE_TYPES = [
  { id: 'commute', label: 'Commute', icon: '🚲' },
  { id: 'chill', label: 'Chill loop', icon: '🌳' },
  { id: 'gravel', label: 'Gravel', icon: '🪨' },
  { id: 'mtb', label: 'MTB', icon: '🚵' },
  { id: 'family', label: 'Family', icon: '👶' },
]

export default function RideTypeSelector({ activeType, onChange }) {
  return (
    <div className={styles.container}>
      {RIDE_TYPES.map((type) => (
        <button
          key={type.id}
          className={`${styles.typeBtn} ${activeType === type.id ? styles.active : ''}`}
          onClick={() => onChange(type.id)}
        >
          <span className={styles.icon}>{type.icon}</span>
          <span className={styles.label}>{type.label}</span>
        </button>
      ))}
    </div>
  )
}
