import { useState } from 'react'
import styles from './RouteInput.module.css'

export default function RouteInput({
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchResults,
  isSearching,
  onSnapLocation,
  setWaypoints
}) {
  const [isFocused, setIsFocused] = useState(false)

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      onSearchSubmit(searchQuery)
    }
  }

  return (
    <div className={styles.container}>
      <div className={`${styles.inputWrapper} ${isFocused ? styles.focused : ''}`}>
        <button 
          className={styles.snapBtn} 
          onClick={onSnapLocation}
          title="Use Current Location"
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/>
            <circle cx="12" cy="10" r="3"/>
          </svg>
        </button>
        <input
          type="text"
          className={styles.input}
          placeholder="Where to? (e.g. 'Riverside Trail')"
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setTimeout(() => setIsFocused(false), 200) /* delay for result clicks */}
          onKeyDown={handleKeyDown}
        />
        {isSearching && <div className={styles.loader} />}
      </div>

      {searchResults && isFocused && (
        <div className={styles.results}>
          <div className={styles.rekiSays}>{searchResults.reki_says}</div>
          {searchResults.results && searchResults.results.map((res, i) => (
            <button
              key={res.id || i}
              className={styles.resultItem}
              onClick={() => {
                setWaypoints(prev => {
                  if (prev.length >= 1) return [prev[0], res.coords]
                  return [[-94.5786, 39.0997], res.coords] // Default KC A
                })
                setIsFocused(false)
              }}
            >
              <div className={styles.resultName}>{res.name}</div>
              <div className={styles.resultDesc}>{res.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
