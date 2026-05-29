import WCBadge from './WCBadge'
import './Header.css'

export default function Header({ activeTab, onTabChange, onToggleSidebar, onDonateClick, wcMode, wcAcknowledged, onToggleWcMode }) {
  return (
    <header className="header glass-strong camo-bg" id="main-header">
      <div className="header-left">
        <button
          className="header-menu-btn"
          onClick={onToggleSidebar}
          aria-label="Toggle sidebar"
          id="toggle-sidebar-btn"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
          </svg>
        </button>
        <a href="/" className="header-logo" id="home-link">
          <img src="/reki_icon.png" alt="Reki the Deer" className="header-reki-icon" />
          <span className="header-title">
            <span className="header-title-bike">Bike</span>
            <span className="header-title-routes">Routes</span>
            <span className="header-title-dot">.org</span>
          </span>
        </a>
      </div>

      <nav className="header-nav">
        <button 
          className={`header-nav-link ${activeTab === 'explore' ? 'active' : ''}`} 
          onClick={() => onTabChange('explore')}
        >
          Explore
        </button>
        <button 
          className={`header-nav-link ${activeTab === 'community' ? 'active' : ''}`} 
          onClick={() => onTabChange('community')}
        >
          Community
        </button>
        <button 
          className={`header-nav-link ${activeTab === 'about' ? 'active' : ''}`} 
          onClick={() => onTabChange('about')}
        >
          About
        </button>
      </nav>

      <div className="header-right">
        <WCBadge 
          wcMode={wcMode} 
          onToggle={onToggleWcMode} 
          acknowledged={wcAcknowledged} 
        />
        <span className="header-status">
          <span className="status-dot"></span>
          <span className="status-text">LIVE</span>
        </span>
        <button
          className="header-donate-btn"
          onClick={onDonateClick}
          id="donate-btn"
        >
          <span>Support Reki</span>
          <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
            <path d="M4 8h8M8 4v8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  )
}
