import styles from './AboutView.module.css'

export default function AboutView({ onFulfillmentClick }) {
  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <img src="/reki_icon.png" alt="Reki" className={styles.mascot} />
        <h2 className={styles.title}>About BikeRoutes</h2>
        <div className="eyebrow">v0.2.0 (Alpha)</div>
      </div>

      <div className={styles.content}>
        <p className={styles.intro}>
          BikeRoutes.org is an open-source routing platform designed for the US Midwest. 
          Powered by a custom Valhalla routing engine and authoritative GIS data, we aim to provide 
          the safest, most efficient navigation for cyclists traversing urban and rural terrain.
        </p>

        <h3 className={styles.faqHeading}>Frequently Asked Questions</h3>
        
        <div className="stack" style={{ alignItems: 'stretch' }}>
          <div className="box">
            <h4 className={styles.faqQuestion}>How does routing work?</h4>
            <p className={styles.faqAnswer}>
              Our engine leverages OSM (OpenStreetMap) combined with high-resolution MARC GIS data. 
              When you adjust the Route Options, the app sends dynamic costing multipliers to our backend to weight different paths appropriately.
            </p>
          </div>

          <div className="box">
            <h4 className={styles.faqQuestion}>What does the LIVE GPS tracker do?</h4>
            <p className={styles.faqAnswer}>
              When you click "START RIDE", the map strips away UI clutter and triggers your device's 
              native geolocation. It will continuously snap the map to your heading and location 
              while displaying your maneuvers.
            </p>
          </div>

          <div className="box">
            <h4 className={styles.faqQuestion}>Who is Reki?</h4>
            <p className={styles.faqAnswer}>
              Reki is our mascot! A highly trained scout deer whose only mission is finding 
              the best, safest trails. Use the search bar to find trails using natural language.
            </p>
          </div>
        </div>

        <div className={`box ${styles.merchBox}`} style={{ marginTop: 'var(--space-8)' }}>
          <div className="eyebrow">Support Gear</div>
          <h4 className={styles.faqQuestion}>Already donated $25 or more?</h4>
          <p className={styles.faqAnswer}>
            Thank you for being a Route Builder or part of Reki's Inner Circle! 
            You can check the status of your T-shirt or Hoodie and claim it once designs are finalized.
          </p>
          <button onClick={onFulfillmentClick} className={styles.merchBtn}>
            CHECK MERCH STATUS →
          </button>
        </div>
      </div>

      <div className={styles.footer}>
        <a href="mailto:hello@bikeroutes.org" className={styles.link}>
          Contact Us
        </a>
        <div className={styles.legal}>
          <span>© 2026 BikeRoutes.org</span>
          <a href="https://github.com/thuruht/bikeroutes" target="_blank" rel="noopener noreferrer" className={styles.githubLink}>
            Source
          </a>
        </div>
      </div>
    </div>
  )
}
