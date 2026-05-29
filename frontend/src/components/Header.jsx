import './Header.css'

const RekiIcon = () => (
  <svg width="30" height="30" viewBox="0 0 32 32" fill="none" xmlns="http://www.w3.org/2000/svg">
    <circle cx="16" cy="18" r="10" fill="var(--camo-olive)" />
    <ellipse cx="16" cy="21" rx="6" ry="5" fill="var(--camo-tan)" />
    {/* Antlers */}
    <path d="M10 12 L8 6 L6 4 M8 6 L10 5" stroke="var(--deer-brown)" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M22 12 L24 6 L26 4 M24 6 L22 5" stroke="var(--deer-brown)" strokeWidth="1.8" strokeLinecap="round" />
    {/* Eyes — punk */}
    <circle cx="13" cy="16" r="1.5" fill="var(--punk-pink)" />
    <circle cx="19" cy="16" r="1.5" fill="var(--punk-pink)" />
    <circle cx="13.5" cy="15.5" r="0.5" fill="white" />
    <circle cx="19.5" cy="15.5" r="0.5" fill="white" />
    {/* Nose */}
    <ellipse cx="16" cy="20" rx="2" ry="1.2" fill="var(--dark-hoof)" />
    {/* Cycling cap — camo */}
    <path d="M9 13 Q16 8 23 13" fill="var(--camo-dark)" />
    <path d="M23 13 L26 12 L24 13.5" fill="var(--camo-dark)" />
    {/* Punk safety pin on cap */}
    <line x1="14" y1="11" x2="18" y2="10.5" stroke="var(--punk-pink)" strokeWidth="0.8" />
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
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
        <a href="/" className="header-logo" id="home-link">
          <RekiIcon />
          <span className="header-title">
            <span className="header-title-bike">Bike</span>
            <span className="header-title-routes">Routes</span>
            <span className="header-title-org">.org</span>
          </span>
        </a>
      </div>

      <nav className="header-nav">
        <a href="#explore" className="header-nav-link active" id="nav-explore">
          <span className="nav-icon">🗺️</span> Explore
        </a>
        <a href="#community" className="header-nav-link" id="nav-community">
          <span className="nav-icon">🦌</span> Community
        </a>
        <a href="#about" className="header-nav-link" id="nav-about">
          <span className="nav-icon">⚡</span> About
        </a>
      </nav>

      <div className="header-right">
        <button
          className="header-donate-btn"
          onClick={onDonateClick}
          id="donate-btn"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
            <path d="M8 14s-5.5-3.5-5.5-7A3.5 3.5 0 0 1 8 4.5 3.5 3.5 0 0 1 13.5 7C13.5 10.5 8 14 8 14z"
              fill="var(--punk-pink)" stroke="var(--punk-pink-dark)" strokeWidth="0.5"/>
          </svg>
          <span>Support Reki</span>
        </button>
      </div>
    </header>
  )
}
