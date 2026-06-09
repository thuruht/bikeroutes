import { useState } from 'react'
import styles from './FulfillmentView.module.css'

export default function FulfillmentView({ onBack }) {
  const [token, setToken] = useState('')
  const [status, setStatus] = useState(null) // null, 'checking', 'found', 'not_found'
  const [orderDetails, setOrderDetails] = useState(null)

  const handleCheck = async (e) => {
    e.preventDefault()
    if (!token) return

    setStatus('checking')
    try {
      const res = await fetch(`/api/donate/merch-status/${token}`)
      if (res.ok) {
        const data = await res.json()
        setOrderDetails(data)
        setStatus('found')
      } else {
        setStatus('not_found')
      }
    } catch (err) {
      console.error("Fulfillment check failed:", err)
      setStatus('not_found')
    }
  }

  return (
    <div className={styles.container}>
      <button className={styles.backBtn} onClick={onBack}>← Back</button>
      <div className={styles.header}>
        <img src="/reki_icon.png" alt="Reki" className={styles.mascot} />
        <h2 className={styles.title}>Merch Fulfillment</h2>
        <p className={styles.subtitle}>Enter your claim token to check the status of your gear.</p>
      </div>

      <div className={`box ${styles.formBox}`}>
        <form onSubmit={handleCheck} className={styles.form}>
          <div className={styles.field}>
            <label className={styles.label}>Claim Token</label>
            <input 
              type="text" 
              value={token} 
              onChange={e => setToken(e.target.value)}
              placeholder="e.g., 550e8400-e29b-41d4-a716-446655440000"
              className={styles.input}
              required
            />
          </div>
          <button type="submit" className={styles.submitBtn} disabled={status === 'checking'}>
            {status === 'checking' ? 'REKI IS SEARCHING...' : 'CHECK STATUS'}
          </button>
        </form>

        {status === 'found' && (
          <div className={`animate-fade-in ${styles.result}`}>
            <div className={styles.divider} />
            <div className={styles.orderInfo}>
              <div className="eyebrow">Order Found</div>
              <h3>{orderDetails.tier}</h3>
              
              <div className={styles.statusCard}>
                <span className={styles.statusLabel}>STATUS:</span>
                <span className={styles.statusValue}>{orderDetails.status}</span>
              </div>

              <div className={styles.note}>
                <p><strong>Note:</strong> Reki is still working on the final designs for the 2026 Season gear! 🦌🎨</p>
                <p>Once the designs are finalized, you'll be able to enter your shipping details and size here. We'll also notify you via the email used for the donation.</p>
              </div>
            </div>
          </div>
        )}

        {status === 'not_found' && (
          <div className={`animate-fade-in ${styles.error}`}>
            <p>🦌 Hmm, Reki couldn't find that token. Please double-check your receipt or contact support.</p>
          </div>
        )}
      </div>

      <div className={styles.footer}>
        <p>Questions about your order? <a href="mailto:support@bikeroutes.org">Contact Reki's Support Team</a></p>
      </div>
    </div>
  )
}
