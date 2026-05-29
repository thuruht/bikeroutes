import './Header.css'

const RekiIcon = () => (
  <svg width="28" height="28" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="18" r="10" fill="var(--camo-olive)" />
    <ellipse cx="16" cy="21" rx="6" ry="5" fill="var(--camo-tan)" />
    <path d="M10 12 L8 6 L6 4 M8 6 L10 5" stroke="var(--deer-brown)" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M22 12 L24 6 L26 4 M24 6 L22 5" stroke="var(--deer-brown)" strokeWidth="1.8" strokeLinecap="round" />
    <circle cx="13" cy="16" r="1.5" fill="var(--accent)" />
    <circle cx="19" cy="16" r="1.5" fill="var(--accent)" />
    <circle cx="13.5" cy="15.5" r="0.5" fill="white" />
    <circle cx="19.5" cy="15.5" r="0.5" fill="white" />
    <ellipse cx="16" cy="20" rx="2" ry="1.2" fill="var(--dark-hoof)" />
    <path d="M9 13 Q16 8 23 13" fill="var(--camo-dark)" />
    <path d="M23 13 L26 12 L24 13.5" fill="var(--camo-dark)" />
  </svg>
)

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
          <RekiIcon />
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
