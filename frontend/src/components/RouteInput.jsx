import { useState } from 'react'

export default function RouteInput({
  onSearchSubmit,
  searchResults,
  isSearching,
  onSnapLocation,
  setWaypoints,
  waypoints
}) {
  const [startText, setStartText] = useState('')
  const [endText, setEndText] = useState('')
  const [activeField, setActiveField] = useState(null)

  const handleKeyDown = (e, field) => {
    if (e.key === 'Enter') {
      onSearchSubmit(field === 'start' ? startText : endText)
    }
  }

  const handleSelectResult = (res) => {
    if (activeField === 'start') {
      setStartText(res.name)
      setWaypoints(prev => {
        const newWp = [...prev]
        newWp[0] = res.coords
        return newWp
      })
    } else {
      setEndText(res.name)
      setWaypoints(prev => {
        const newWp = [...prev]
        if (newWp.length === 0) {
          return [[-94.5786, 39.0997], res.coords]
        }
        newWp[1] = res.coords
        return newWp
      })
    }
    setActiveField(null)
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "2px", position: "relative" }}>
      <div className="io-row">
        <span className="dot" style={{ background: "var(--orange)" }}></span>
        <input
          className="io"
          type="text"
          placeholder="Start (or click map)"
          value={startText}
          onChange={(e) => setStartText(e.target.value)}
          onFocus={() => setActiveField('start')}
          onBlur={() => setTimeout(() => { if (activeField === 'start') setActiveField(null) }, 200)}
          onKeyDown={(e) => handleKeyDown(e, 'start')}
        />
        <button 
          onClick={() => { setStartText('Current Location'); onSnapLocation() }}
          style={{ position: 'absolute', right: 12, top: 12, background: 'none', border: 'none', color: 'var(--ink-2)', cursor: 'pointer' }}
          title="Use current location"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s-8-4.5-8-11.8A8 8 0 0 1 12 2a8 8 0 0 1 8 8.2c0 7.3-8 11.8-8 11.8z"/><circle cx="12" cy="10" r="3"/>
          </svg>
        </button>
      </div>

      <div className="io-row">
        <span className="dot" style={{ background: "var(--line)" }}></span>
        <input
          className="io"
          type="text"
          placeholder="Destination"
          value={endText}
          onChange={(e) => setEndText(e.target.value)}
          onFocus={() => setActiveField('end')}
          onBlur={() => setTimeout(() => { if (activeField === 'end') setActiveField(null) }, 200)}
          onKeyDown={(e) => handleKeyDown(e, 'end')}
        />
      </div>

      {searchResults && activeField && (
        <div style={{ position: "absolute", top: "100%", left: 0, right: 0, zIndex: 100, background: "var(--paper)", border: "1px solid var(--line)", borderRadius: 12, marginTop: 8, overflow: "hidden", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}>
          <div style={{ padding: "12px 16px", fontSize: 13, color: "var(--orange)", fontWeight: 500, borderBottom: "1px solid var(--line)" }}>
            {searchResults.reki_says}
          </div>
          {searchResults.results && searchResults.results.map((res, i) => (
            <button
              key={res.id || i}
              style={{ display: "block", width: "100%", textAlign: "left", padding: "12px 16px", background: "none", border: "none", borderBottom: i < searchResults.results.length - 1 ? "1px solid var(--line)" : "none", cursor: "pointer" }}
              onClick={() => handleSelectResult(res)}
            >
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--ink)", marginBottom: 2 }}>{res.name}</div>
              <div style={{ fontSize: 12, color: "var(--ink-2)" }}>{res.description}</div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
