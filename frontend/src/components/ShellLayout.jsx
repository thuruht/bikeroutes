import { useState, useEffect } from 'react'
import styles from './ShellLayout.module.css'

function ShellLayout({ children }) {
  const [tentacles, setTentacles] = useState([])

  useEffect(() => {
    const amount = window.innerWidth < 700 ? 9 : 16
    const newTentacles = Array.from({ length: amount }).map((_, i) => ({
      id: i,
      x: `${Math.random() * 100}%`,
      len: `${30 + Math.random() * 45}vh`,
      rot: `${3 + Math.random() * 10}deg`,
      dur: `${4 + Math.random() * 5}s`,
      opacity: (0.3 + Math.random() * 0.55).toFixed(2)
    }))
    
    // Defer to avoid synchronous state update warning
    const timer = setTimeout(() => {
      setTentacles(newTentacles)
    }, 0)
    return () => clearTimeout(timer)
  }, [])

  return (
    <>
      <a className="skip-link" href="#main-content">Skip to content</a>
      <div className={styles.tentacles} aria-hidden="true">
        {tentacles.map((t) => (
          <span
            key={t.id}
            className={styles.tentacle}
            style={{
              '--x': t.x,
              '--len': t.len,
              '--rot': t.rot,
              '--dur': t.dur,
              opacity: t.opacity
            }}
          />
        ))}
      </div>
      <main className="shell" id="main-content">
        <section className="panel">
          {children}
        </section>
      </main>
    </>
  )
}

export default ShellLayout
