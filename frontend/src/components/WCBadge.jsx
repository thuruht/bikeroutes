import { useEffect, useState } from 'react'
import './WCBadge.css'

export default function WCBadge({ wcMode, onToggle, acknowledged }) {
  const [bounced, setBounced] = useState(false)

  // Bounce-in animation after 1.5s on first load
  useEffect(() => {
    const timer = setTimeout(() => setBounced(true), 1500)
    return () => clearTimeout(timer)
  }, [])

  return (
    <button
      className={`wc-badge ${wcMode ? 'active' : ''} ${bounced ? 'bounced-in' : 'hidden'} ${!acknowledged && !wcMode ? 'pulsing' : ''}`}
      onClick={onToggle}
      aria-label={wcMode ? 'Exit FIFA World Cup 26 KC Mode' : 'Activate FIFA World Cup 26 KC Mode'}
      id="wc-badge-btn"
    >
      <span className="wc-badge-ball">⚽</span>
      <span className="wc-badge-text">KC 2026</span>
      {!acknowledged && !wcMode && <span className="wc-badge-dot" />}
    </button>
  )
}
