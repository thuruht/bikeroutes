import { useEffect, useState } from 'react'
import { loadScript } from '@paypal/paypal-js'
import styles from './DonateBanner.module.css'

const TIERS = [
  { amount: 5, label: 'Coffee for Reki', icon: '☕', desc: 'Keep Reki caffeinated' },
  { amount: 10, label: "Reki's Sandwich", icon: '🥪', desc: 'Feed the scout' },
  { amount: 15, label: 'Trail Supporter', icon: '🗺️', desc: 'Earn your badge' },
  // TODO: Re-enable these once Print-on-Demand integration is live
  // { amount: 25, label: 'Route Builder', icon: '👕', desc: 'Free T-shirt!' },
  // { amount: 50, label: "Reki's Inner Circle", icon: '🏔️', desc: 'Free hoodie!' },
]

export default function DonateBanner({ onClose, onFulfillmentClick }) {
  const [selectedAmount, setSelectedAmount] = useState(15)
  const [paypalLoaded, setPaypalLoaded] = useState(false)

  useEffect(() => {
    let paypal;
    const initPaypal = async () => {
      try {
        paypal = await loadScript({ 
          "client-id": "test", // Replace with actual production client ID in deployment
          currency: "USD"
        })
        if (paypal) {
          setPaypalLoaded(true)
          
          // Clear container before rendering
          const container = document.getElementById('paypal-button-container')
          if (container) container.innerHTML = ''
          
          paypal.Buttons({
            createOrder: async () => {
              const tier = TIERS.find(t => t.amount === selectedAmount)?.label || 'Donation'
              const res = await fetch('/api/donate/create-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ amount: selectedAmount, tier })
              })
              const data = await res.json()
              return data.orderID
            },
            onApprove: async (data) => {
              const tier = TIERS.find(t => t.amount === selectedAmount)?.label || 'Donation'
              const res = await fetch('/api/donate/capture-order', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ orderID: data.orderID, tier })
              })
              const captureData = await res.json()
              if (captureData.status === 'completed') {
                alert(`Transaction completed! ${captureData.message}`)
                onClose()
              } else {
                alert("Payment capture failed. Please try again.")
              }
            }
          }).render('#paypal-button-container')
        }
      } catch (err) {
        console.error("Failed to load PayPal SDK", err)
      }
    }
    initPaypal()

    return () => {
      const container = document.getElementById('paypal-button-container')
      if (container) container.innerHTML = ''
    }
  }, [selectedAmount, onClose])

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
            <button 
              type="button" 
              key={amount} 
              className={`${styles.donateTier} ${selectedAmount === amount ? styles.active : ''}`} 
              id={`donate-tier-${amount}`}
              onClick={() => setSelectedAmount(amount)}
            >
              <span className={styles.tierIcon}>{icon}</span>
              <div className={styles.tierInfo}>
                <span className={styles.tierLabel}>{label}</span>
                <span className={styles.tierDesc}>{desc}</span>
              </div>
              <span className={styles.tierAmount}>${amount}</span>
            </button>
          ))}
        </div>

        <div className={styles.paypalContainer}>
          {!paypalLoaded && <div className={styles.loading}>Loading payment methods...</div>}
          <div id="paypal-button-container"></div>
        </div>

        <div className={styles.donateFooter}>
          <p className={styles.donatePromise}>
            BikeRoutes.org will <em>always</em> be free. Donations keep it independent.
          </p>
          <button onClick={onFulfillmentClick} className={styles.fulfillmentLink}>
            Already donated? Claim your gear →
          </button>
        </div>
      </div>
    </div>
  )
}
