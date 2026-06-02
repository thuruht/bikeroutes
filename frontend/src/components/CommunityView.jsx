import { useState, useEffect, useCallback } from 'react'
import WCLeaderboard from './WCLeaderboard'
import styles from './CommunityView.module.css'

const API_BASE = 'https://bikeroutes-api.jojo-829.workers.dev'

export default function CommunityView({ wcMode, onWcRouteSelect }) {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reportType, setReportType] = useState('mud')
  const [description, setDescription] = useState('')
  const [authStatus, setAuthStatus] = useState('checking') // checking, unauthenticated, authenticated
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [authStep, setAuthStep] = useState('email') // email, code
  const [now, setNow] = useState(0)

  const checkAuth = useCallback(() => {
    const token = localStorage.getItem('bikeroutes_session')
    if (token) {
      setAuthStatus('authenticated')
    } else {
      setAuthStatus('unauthenticated')
    }
  }, [])

  const fetchReports = useCallback(async () => {
    try {
      setLoading(true)
      const res = await fetch(`${API_BASE}/api/reports`)
      const data = await res.json()
      if (data.reports) {
        setReports(data.reports)
      }
    } catch (err) {
      console.error("Failed to fetch reports:", err)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    const init = async () => {
      await fetchReports()
      checkAuth()
      setNow(Date.now())
    }
    init()
  }, [fetchReports, checkAuth])

  const handleRequestCode = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/auth/request`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email })
      })
      const data = await res.json()
      if (data.dev_code) {
        setCode(data.dev_code)
      }
      setAuthStep('code')
    } catch {
      alert("Failed to request code")
    }
  }

  const handleVerifyCode = async (e) => {
    e.preventDefault()
    try {
      const res = await fetch(`${API_BASE}/api/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code })
      })
      const data = await res.json()
      if (data.session_token) {
        localStorage.setItem('bikeroutes_session', data.session_token)
        setAuthStatus('authenticated')
      } else {
        alert(data.error || "Verification failed")
      }
    } catch {
      alert("Verification failed")
    }
  }

  const handleSubmitReport = async (e) => {
    e.preventDefault()
    
    if (!navigator.geolocation) {
      alert("Geolocation is required to submit a report.")
      return
    }

    setSubmitting(true)

    navigator.geolocation.getCurrentPosition(async (position) => {
      try {
        const token = localStorage.getItem('bikeroutes_session')
        const res = await fetch(`${API_BASE}/api/reports`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            lat: position.coords.latitude,
            lon: position.coords.longitude,
            type: reportType,
            description
          })
        })
        
        if (res.ok) {
          setDescription('')
          fetchReports()
          alert("Report submitted successfully! Reki thanks you 🦌")
        } else {
          const data = await res.json()
          alert(data.error || "Failed to submit report")
        }
      } catch {
        alert("Failed to submit report")
      } finally {
        setSubmitting(false)
      }
    }, (err) => {
      alert("Could not get your location: " + err.message)
      setSubmitting(false)
    })
  }

  const getTimeAgo = (dateStr) => {
    const diff = now - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    return `${hours}h ago`
  }

  return (
    <div className={styles.container}>
      {wcMode && <WCLeaderboard onRouteSelect={onWcRouteSelect} />}
      
      <div className={styles.header}>
        <h2 className={styles.title}>Live Field Reports</h2>
        <p className={styles.subtitle}>Recent hazards and trail conditions reported by scouts.</p>
      </div>

      <div className={styles.layout}>
        <div className={styles.feed}>
          {loading ? (
            <div className={styles.loading}>Scanning area...</div>
          ) : reports.length === 0 ? (
            <div className={styles.empty}>
              <img src="/reki_icon.png" alt="Reki" className={styles.emptyIcon} />
              <p>No active reports in the area.</p>
              <p className={styles.hint}>Trails look clear! Go blaze a path.</p>
            </div>
          ) : (
            <div className={styles.list}>
              {reports.map(r => (
                <div key={r.id} className={`box ${styles.card}`}>
                  <div className={styles.cardHeader}>
                    <span className={`${styles.badge} ${styles['type-' + r.type]}`}>{r.type.toUpperCase()}</span>
                    <span className={styles.time}>{getTimeAgo(r.created_at)}</span>
                  </div>
                  {r.description && <p className={styles.desc}>{r.description}</p>}
                  <div className={styles.cardFooter}>
                    Reported by: {r.display_name || 'Anonymous Scout'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className={styles.formPanel}>
          <h3 className={styles.formTitle}>Report Hazard</h3>
          
          {authStatus === 'checking' ? (
            <div className={styles.loading}>Checking comms...</div>
          ) : authStatus === 'unauthenticated' ? (
            <div className={`box ${styles.authBox}`}>
              <h4>Verification Required</h4>
              <p>You must be verified to submit field reports.</p>
              
              {authStep === 'email' ? (
                <form onSubmit={handleRequestCode} className={styles.form}>
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="Email" 
                    required 
                    className={styles.input}
                  />
                  <button type="submit" className={styles.submitBtn}>SEND CODE</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className={styles.form}>
                  <input 
                    type="text" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    placeholder="6-Digit Code" 
                    required 
                    className={styles.input}
                  />
                  <button type="submit" className={styles.submitBtn}>VERIFY</button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className={`box ${styles.reportForm}`}>
              <div className={styles.field}>
                <label className={styles.label}>Hazard Type</label>
                <select 
                  value={reportType} 
                  onChange={e => setReportType(e.target.value)}
                  className={styles.select}
                >
                  <option value="mud">Mud</option>
                  <option value="flooding">Flooding</option>
                  <option value="debris">Debris / Tree Down</option>
                  <option value="closure">Trail Closed</option>
                  <option value="cops">Police / Security</option>
                  <option value="other">Other Hazard</option>
                </select>
              </div>

              <div className={styles.field}>
                <label className={styles.label}>Details</label>
                <textarea 
                  value={description}
                  onChange={e => setDescription(e.target.value)}
                  placeholder="e.g., 'Tree blocking path completely'"
                  className={styles.textarea}
                  rows={3}
                />
              </div>

              <button 
                type="submit" 
                className={styles.submitBtn}
                disabled={submitting}
              >
                {submitting ? 'TRANSMITTING...' : '📍 SUBMIT REPORT'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
