import togpx from 'togpx'
import RouteInput from './RouteInput'
import RideTypeSelector from './RideTypeSelector'
import RouteStats from './RouteStats'
import ElevationProfile from './ElevationProfile'
import RouteFilters from './RouteFilters'
import RouteActions from './RouteActions'
import Reki from './Reki'
import styles from './Sidebar.module.css'

export default function Sidebar({
  activeFilters,
  onToggleFilter,
  routeInfo,
  routeGeoJSON,
  waypoints,
  searchQuery,
  onSearchChange,
  onSearchSubmit,
  searchResults,
  isSearching,
  onClearRoute,
  routeOptions,
  setRouteOptions,
  isNavigating,
  setIsNavigating,
  onSnapLocation,
  setWaypoints
}) {

  const handleExportGPX = () => {
    if (!routeGeoJSON) return
    const gpx = togpx(routeGeoJSON)
    const blob = new Blob([gpx], { type: 'application/gpx+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bikeroutes-scouted-trail.gpx'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleExportKML = () => {
    if (!routeGeoJSON) return
    const coords = routeGeoJSON.features[0].geometry.coordinates;
    const line = coords.map(c => `${c[0]},${c[1]}${c[2] != null ? "," + c[2] : ""}`).join(" ");
    const text = `<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>BikeRoutes route</name><Placemark><name>Route</name><LineString><tessellate>1</tessellate><coordinates>${line}</coordinates></LineString></Placemark></Document></kml>`;
    const blob = new Blob([text], { type: 'application/vnd.google-earth.kml+xml' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'bikeroutes-scouted-trail.kml'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  const handleShareRoute = () => {
    if (waypoints.length < 2) return
    const params = new URLSearchParams()
    params.set('a', `${waypoints[0][0]},${waypoints[0][1]}`)
    params.set('b', `${waypoints[1][0]},${waypoints[1][1]}`)
    const shareUrl = `${window.location.origin}/?${params.toString()}`

    if (navigator.share) {
      navigator.share({
        title: 'BikeRoutes.org Route',
        text: 'Check out this scouted trail on BikeRoutes.org',
        url: shareUrl
      }).catch(console.error)
    } else {
      navigator.clipboard.writeText(shareUrl)
      alert('Link copied to clipboard!')
    }
  }

  return (
    <div className={`panel${wcMode ? ' with-banner' : ''}`}>
      <div className="panel-scroll">
        <RouteInput
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          onSearchSubmit={handleSearchSubmit}
          searchResults={searchResults}
          isSearching={isSearching}
          onSnapLocation={onSnapLocation}
          setWaypoints={setWaypoints}
          waypoints={waypoints}
        />

        <RideTypeSelector
          activeType={routeOptions.pavedOnly ? 'commute' : 'gravel'}
          onChange={(type) => {
            setRouteOptions(prev => ({
              ...prev,
              pavedOnly: type === 'commute' || type === 'family',
              avoidRoads: type !== 'commute'
            }))
          }}
        />

        {!routeInfo && (
          <Reki mood={waypoints.length > 0 ? "scout" : "empty"} size={64} />
        )}

        {routeInfo && (
          <>
            <RouteStats info={routeInfo} />
            <ElevationProfile data={routeInfo?.elevationData || []} />
            <RouteActions
              isNavigating={isNavigating}
              onToggleNavigation={() => setIsNavigating(!isNavigating)}
              onExport={handleExportGPX}
              onExportKML={handleExportKML}
              onShare={handleShareRoute}
              onClear={onClearRoute}
            />
          </>
        )}

        <RouteFilters
          activeFilters={activeFilters}
          onToggleFilter={onToggleFilter}
        />
      </div>
    </div>
  )

  function handleSearchSubmit(query) {
    onSearchSubmit(query)
  }
}
