import WCBadge from './WCBadge'

export default function Header({ activeTab, onTabChange, onDonateClick, wcMode, wcAcknowledged, onToggleWcMode, theme, onToggleTheme }) {
  return (
    <header className="topbar">
      {/* Brand chip */}
      <div className="brand" onClick={() => window.location.href = '/'} style={{ cursor: 'pointer' }}>
        <div className="mark">
          <svg viewBox="0 0 40 40" width="16" height="16">
            <use href="#mark-b" />
          </svg>
        </div>
        <div>
          <div className="name">BikeRoutes</div>
          <div className="tag">beta</div>
        </div>
      </div>

      {/* Navigation pill */}
      <nav className="nav">
        <a
          href="#"
          className={(activeTab === 'explore' || activeTab === 'planner') ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); onTabChange('explore') }}
        >
          Map
        </a>
        <a
          href="#"
          className={activeTab === 'community' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); onTabChange('community') }}
        >
          Community
        </a>
        <a
          href="#"
          className={activeTab === 'about' ? 'active' : ''}
          onClick={(e) => { e.preventDefault(); onTabChange('about') }}
        >
          About
        </a>
      </nav>

      <span className="spacer" />

      {/* Right controls */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        <div className="theme-toggle">
          <button
            className={theme === 'light' ? 'active' : ''}
            onClick={() => onToggleTheme('light')}
            aria-label="Light mode"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <circle cx="12" cy="12" r="4.2"/>
              <path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5L19 19M19 5l-1.5 1.5M6.5 17.5L5 19"/>
            </svg>
          </button>
          <button
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => onToggleTheme('dark')}
            aria-label="Dark mode"
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M21 12.8A8.5 8.5 0 1 1 11.2 3a6.6 6.6 0 0 0 9.8 9.8z"/>
            </svg>
          </button>
        </div>

        <WCBadge
          wcMode={wcMode}
          onToggle={onToggleWcMode}
          acknowledged={wcAcknowledged}
        />

        <button className="pillbtn solid" onClick={onDonateClick}>
          <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
          </svg>
          <span className="btn-label">Donate</span>
        </button>
      </div>
    </header>
  )
}
