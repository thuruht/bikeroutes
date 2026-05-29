import './Header.css'

export default function Header({ onToggleSidebar, onDonateClick }) {
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
          <img src="/reki_icon.png" alt="Reki the Deer" className="header-reki-icon" width="36" height="36" />
          <span className="header-title">
            <span className="header-title-bike">Bike</span>
            <span className="header-title-routes">Routes</span>
            <span className="header-title-dot">.org</span>
          </span>
        </a>
      </div>

      <nav className="header-nav">
        <a href="#explore" className="header-nav-link active" id="nav-explore">Explore</a>
        <a href="#community" className="header-nav-link" id="nav-community">Community</a>
        <a href="#about" className="header-nav-link" id="nav-about">About</a>
      </nav>

      <div className="header-right">
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
