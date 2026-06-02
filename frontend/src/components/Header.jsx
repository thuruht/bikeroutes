import WCBadge from './WCBadge'
import styles from './Header.module.css'

export default function Header({ activeTab, onTabChange, onDonateClick, wcMode, wcAcknowledged, onToggleWcMode }) {
  return (
    <header className={styles.header}>
      <div className={styles.left}>
        <a href="/" className={styles.logo} onClick={(e) => { e.preventDefault(); window.location.href='/'; }}>
          <img src="/reki_icon.png" alt="Reki" className={styles.logoIcon} />
          <span>bikeroutes.org</span>
        </a>
      </div>

      <nav className={styles.nav}>
        <button 
          className={`${styles.navBtn} ${(activeTab === 'explore' || activeTab === 'planner') ? styles.active : ''}`}
          onClick={() => onTabChange('explore')}
        >
          Map
        </button>
        <button 
          className={`${styles.navBtn} ${activeTab === 'community' ? styles.active : ''}`}
          onClick={() => onTabChange('community')}
        >
          Community
        </button>
        <button 
          className={`${styles.navBtn} ${activeTab === 'about' ? styles.active : ''}`}
          onClick={() => onTabChange('about')}
        >
          About
        </button>
      </nav>

      <div className={styles.right}>
        <WCBadge 
          wcMode={wcMode} 
          onToggle={onToggleWcMode} 
          acknowledged={wcAcknowledged} 
        />
        <button
          className={styles.donateBtn}
          onClick={onDonateClick}
        >
          Donate
        </button>
      </div>
    </header>
  )
}
