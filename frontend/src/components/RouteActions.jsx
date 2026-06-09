export default function RouteActions({ onExport, onExportKML, onShare, onClear, isNavigating, onToggleNavigation }) {
  // Simple SVG icons
  const IcShare = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 15, height: 15, opacity: 0.75}}><circle cx="6" cy="12" r="2.6"/><circle cx="18" cy="6" r="2.6"/><circle cx="18" cy="18" r="2.6"/><path d="M8.3 10.8l7.4-3.6M8.3 13.2l7.4 3.6"/></svg>;
  const IcGpx = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{width: 15, height: 15, opacity: 0.75}}><path d="M12 3v12M12 15l-4-4M12 15l4-4M5 20h14"/></svg>;
  const IcClear = <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" style={{width: 15, height: 15, opacity: 0.75}}><path d="M18 6 6 18M6 6l12 12"/></svg>;

  return (
    <div className="actions" style={{ flexWrap: "wrap" }}>
      <button 
        className={isNavigating ? "primary" : ""} 
        onClick={onToggleNavigation}
      >
        {isNavigating ? 'End Ride' : 'Start Ride'}
      </button>
      <button onClick={onShare}>{IcShare} Share</button>
      <button onClick={onExport}>{IcGpx} GPX</button>
      <button onClick={onExportKML}>{IcGpx} KML</button>
      <button onClick={onClear}>{IcClear} Clear</button>
    </div>
  )
}
