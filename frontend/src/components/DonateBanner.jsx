import styles from './DonateBanner.module.css'

const TIERS = [
  { amount: 5, label: 'Coffee for Reki', icon: '☕', desc: 'Keep Reki caffeinated' },
  { amount: 10, label: "Reki's Sandwich", icon: '🥪', desc: 'Feed the scout' },
  { amount: 15, label: 'Trail Supporter', icon: '🗺️', desc: 'Earn your badge' },
  { amount: 25, label: 'Route Builder', icon: '👕', desc: 'Free T-shirt!' },
  { amount: 50, label: "Reki's Inner Circle", icon: '🏔️', desc: 'Free hoodie!' },
]

export default function DonateBanner({ onClose }) {
  return (
    <div className={styles.donateOverlay} onClick={onClose}>
      <div className={`${styles.donateBanner} glass-strong camo-bg animate-slide-up`} onClick={e => e.stopPropagation()}>
        <button type="button" className={styles.donateClose} onClick={onClose} id="donate-close-btn" aria-label="Close">
          ✕
        </button>

        <div className={styles.donateHeader}>
          <img src="/reki.png" alt="Reki the deer" className={styles.donateReki} width="64" height="64" />
          <div>
            <h2 className={styles.donateTitle}>Support BikeRoutes.org</h2>
            <p className={styles.donateSubtitle}>
              Free forever. No ads. No tracking.<br/>
              <span className={styles.donatePunk}>Donations keep Reki on the trail.</span>
            </p>
          </div>
        </div>

        <div className={styles.donateTiers}>
          {TIERS.map(({ amount, label, icon, desc }) => (
            <button type="button" key={amount} className={styles.donateTier} id={`donate-tier-${amount}`}>
              <span className={styles.tierIcon}>{icon}</span>
              <div className={styles.tierInfo}>
                <span className={styles.tierLabel}>{label}</span>
                <span className={styles.tierDesc}>{desc}</span>
              </div>
              <span className={styles.tierAmount}>${amount}</span>
            </button>
          ))}
        </div>

        <div className={styles.donateMonthly}>
          <span className="blaze-badge">MONTHLY</span>
          <span className={styles.donateMonthlyText}>
            Subscribe from <strong>$3/mo</strong> — get Reki's Trail Mail every month
          </span>
        </div>

        <div className={styles.donateFooter}>
          <p className={styles.donateTransparency}>
            💰 Tile server: ~$30/mo · Valhalla VPS: ~$12/mo · Domain: ~$12/yr
          </p>
          <p className={styles.donatePromise}>
            BikeRoutes.org will <em>always</em> be free. Donations keep it independent.
          </p>
        </div>
      </div>
    </div>
  )
}
