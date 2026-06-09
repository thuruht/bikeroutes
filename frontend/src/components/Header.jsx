import WCBadge from './WCBadge'

export default function Header({ activeTab, onTabChange, onDonateClick, wcMode, wcAcknowledged, onToggleWcMode }) {
  return (
    <header className="topbar">
      <div className="brand" onClick={(e) => { window.location.href='/'; }} style={{ cursor: 'pointer' }}>
        <svg viewBox="0 0 40 40" width="22" height="22">
          <use href="/brand-marks.svg#mark-b" />
        </svg>
        BikeRoutes
      </div>

      <nav className="nav">
        <a 
          href="#" 
          className={(activeTab === 'explore' || activeTab === 'planner') ? "active" : ""}
          onClick={(e) => { e.preventDefault(); onTabChange('explore') }}
        >
          Map
        </a>
        <a 
          href="#"
          className={activeTab === 'community' ? "active" : ""}
          onClick={(e) => { e.preventDefault(); onTabChange('community') }}
        >
          Community
        </a>
        <a 
          href="#"
          className={activeTab === 'about' ? "active" : ""}
          onClick={(e) => { e.preventDefault(); onTabChange('about') }}
        >
          About
        </a>
      </nav>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: 'auto' }}>
        <WCBadge 
          wcMode={wcMode} 
          onToggle={onToggleWcMode} 
          acknowledged={wcAcknowledged} 
        />
        <button
          className="pillbtn"
          onClick={onDonateClick}
        >
          Donate
        </button>
      </div>
    </header>
  )
}
