import { useState, useEffect } from 'react'
import './CommunityView.css'

const API_BASE = 'https://bikeroutes-api.jojo-829.workers.dev'

export default function CommunityView() {
  const [reports, setReports] = useState([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [reportType, setReportType] = useState('mud')
  const [description, setDescription] = useState('')
  const [authStatus, setAuthStatus] = useState('checking') // checking, unauthenticated, authenticated
  const [email, setEmail] = useState('')
  const [code, setCode] = useState('')
  const [authStep, setAuthStep] = useState('email') // email, code

  useEffect(() => {
    fetchReports()
    checkAuth()
  }, [])

  const checkAuth = () => {
    const token = localStorage.getItem('bikeroutes_session')
    if (token) {
      setAuthStatus('authenticated')
    } else {
      setAuthStatus('unauthenticated')
    }
  }

  const fetchReports = async () => {
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
  }

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
        // Auto-fill code in dev
        setCode(data.dev_code)
      }
      setAuthStep('code')
    } catch (err) {
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
    } catch (err) {
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
      } catch (err) {
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
    const diff = Date.now() - new Date(dateStr).getTime()
    const hours = Math.floor(diff / (1000 * 60 * 60))
    if (hours < 1) return 'Just now'
    return `${hours}h ago`
  }

  return (
    <div className="community-view glass-strong animate-fade-in">
      <div className="community-header">
        <h2 className="community-title">Live Field Reports</h2>
        <p className="community-subtitle">Recent hazards and trail conditions reported by scouts. Reports decay after 48 hours.</p>
      </div>

      <div className="community-layout">
        <div className="reports-feed">
          {loading ? (
            <div className="reports-loading">Scanning area...</div>
          ) : reports.length === 0 ? (
            <div className="reports-empty">
              <img src="/reki_icon.png" alt="Reki" className="reports-empty-icon" />
              <p>No active reports in the area.</p>
              <p className="hint">Trails look clear! Go blaze a path.</p>
            </div>
          ) : (
            <div className="reports-list">
              {reports.map(r => (
                <div key={r.id} className="report-card camo-bg">
                  <div className="report-header">
                    <span className={`report-badge type-${r.type}`}>{r.type.toUpperCase()}</span>
                    <span className="report-time">{getTimeAgo(r.created_at)}</span>
                  </div>
                  {r.description && <p className="report-desc">{r.description}</p>}
                  <div className="report-footer">
                    Reported by: {r.display_name || 'Anonymous Scout'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="report-form-container">
          <h3 className="form-title">Report Hazard Here</h3>
          
          {authStatus === 'checking' ? (
            <div className="auth-loading">Checking comms...</div>
          ) : authStatus === 'unauthenticated' ? (
            <div className="auth-box glass">
              <h4>Scout Verification Required</h4>
              <p>You must be verified to submit field reports.</p>
              
              {authStep === 'email' ? (
                <form onSubmit={handleRequestCode} className="auth-form">
                  <input 
                    type="email" 
                    value={email} 
                    onChange={e => setEmail(e.target.value)} 
                    placeholder="Scout Email" 
                    required 
                    className="auth-input"
                  />
                  <button type="submit" className="action-btn primary full-width">SEND CODE</button>
                </form>
              ) : (
                <form onSubmit={handleVerifyCode} className="auth-form">
                  <input 
                    type="text" 
                    value={code} 
                    onChange={e => setCode(e.target.value)} 
                    placeholder="6-Digit Code" 
                    required 
                    className="auth-input"
                  />
                  <button type="submit" className="action-btn primary full-width">VERIFY</button>
                </form>
              )}
            </div>
          ) : (
            <form onSubmit={handleSubmitReport} className="report-form glass">
              <label className="form-label">Hazard Type</label>
              <select 
                value={reportType} 
                onChange={e => setReportType(e.target.value)}
                className="report-select"
              >
                <option value="mud">Mud</option>
                <option value="flooding">Flooding</option>
                <option value="debris">Debris / Tree Down</option>
                <option value="closure">Trail Closed</option>
                <option value="cops">Police / Security</option>
                <option value="other">Other Hazard</option>
              </select>

              <label className="form-label">Details</label>
              <textarea 
                value={description}
                onChange={e => setDescription(e.target.value)}
                placeholder="Optional details (e.g., 'Tree blocking path completely')"
                className="report-textarea"
                rows={3}
              />

              <button 
                type="submit" 
                className="action-btn destructive full-width"
                disabled={submitting}
              >
                {submitting ? 'TRANSMITTING...' : '📍 SUBMIT AT CURRENT LOCATION'}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  )
}
