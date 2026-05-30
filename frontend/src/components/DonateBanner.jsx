import './DonateBanner.css'

const TIERS = [
  { amount: 5, label: 'Coffee for Reki', icon: '☕', desc: 'Keep Reki caffeinated' },
  { amount: 10, label: "Reki's Sandwich", icon: '🥪', desc: 'Feed the scout' },
  { amount: 15, label: 'Trail Supporter', icon: '🗺️', desc: 'Earn your badge' },
  { amount: 25, label: 'Route Builder', icon: '👕', desc: 'Free T-shirt!' },
  { amount: 50, label: "Reki's Inner Circle", icon: '🏔️', desc: 'Free hoodie!' },
]

export default function DonateBanner({ onClose }) {
  return (
    <div className="donate-overlay" onClick={onClose}>
      <div className="donate-banner glass-strong camo-bg animate-slide-up" onClick={e => e.stopPropagation()}>
        <button type="button" className="donate-close" onClick={onClose} id="donate-close-btn" aria-label="Close">
          ✕
        </button>

        <div className="donate-header">
          <img src="/reki.png" alt="Reki the deer" className="donate-reki" width="64" height="64" />
          <div>
            <h2 className="donate-title">Support BikeRoutes.org</h2>
            <p className="donate-subtitle">
              Free forever. No ads. No tracking.<br/>
              <span className="donate-punk">Donations keep Reki on the trail.</span>
            </p>
          </div>
        </div>

        <div className="donate-tiers">
          {TIERS.map(({ amount, label, icon, desc }) => (
            <button type="button" key={amount} className="donate-tier" id={`donate-tier-${amount}`}>
              <span className="tier-icon">{icon}</span>
              <div className="tier-info">
                <span className="tier-label">{label}</span>
                <span className="tier-desc">{desc}</span>
              </div>
              <span className="tier-amount">${amount}</span>
            </button>
          ))}
        </div>

        <div className="donate-monthly">
          <span className="blaze-badge">MONTHLY</span>
          <span className="donate-monthly-text">
            Subscribe from <strong>$3/mo</strong> — get Reki's Trail Mail every month
          </span>
        </div>

        <div className="donate-footer">
          <p className="donate-transparency">
            💰 Tile server: ~$30/mo · Valhalla VPS: ~$12/mo · Domain: ~$12/yr
          </p>
          <p className="donate-promise">
            BikeRoutes.org will <em>always</em> be free. Donations keep it independent.
          </p>
        </div>
      </div>
    </div>
  )
}
