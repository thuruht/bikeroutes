import './AboutView.css'

export default function AboutView() {
  return (
    <div className="about-view glass-strong animate-fade-in">
      <div className="about-header">
        <img src="/reki_icon.png" alt="Reki" className="about-mascot" />
        <h2 className="about-title">About BikeRoutes</h2>
        <div className="about-version">v0.2.0 (Alpha)</div>
      </div>

      <div className="about-content">
        <p className="about-intro">
          BikeRoutes.org is an open-source, tactical routing platform designed for the US Midwest. 
          Powered by a custom Valhalla routing engine and authoritative GIS data, we aim to provide 
          the safest, most efficient navigation for cyclists traversing urban and rural terrain.
        </p>

        <h3 className="faq-heading">Frequently Asked Questions</h3>
        
        <div className="faq-item">
          <h4 className="faq-question">How does routing work?</h4>
          <p className="faq-answer">
            Our engine leverages OSM (OpenStreetMap) combined with high-resolution MARC GIS data. 
            When you adjust the Route Options (like "Minimize Hills" or "Paved Only"), the app sends 
            dynamic costing multipliers to our backend to weight different paths appropriately.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">What does the LIVE GPS tracker do?</h4>
          <p className="faq-answer">
            When you click "START RIDE", the map strips away the UI clutter and triggers your device's 
            native geolocation capabilities. It will continuously snap the map to your heading and location 
            while displaying your turn-by-turn maneuvers in the sidebar.
          </p>
        </div>

        <div className="faq-item">
          <h4 className="faq-question">Who is Reki?</h4>
          <p className="faq-answer">
            Reki is our AI-powered mascot! A highly trained scout deer whose only mission is finding 
            the best, safest trails. You can interact with Reki using the semantic search bar to find 
            trails using natural language.
          </p>
        </div>
      </div>

      <div className="about-footer">
        <a href="https://github.com/bikeroutes" target="_blank" rel="noopener noreferrer" className="about-link">
          GitHub Repository
        </a>
        <a href="mailto:hello@bikeroutes.org" className="about-link">
          Contact Us
        </a>
      </div>
    </div>
  )
}
