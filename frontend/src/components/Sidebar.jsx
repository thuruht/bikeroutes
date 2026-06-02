import togpx from 'togpx'
import RouteInput from './RouteInput'
import RideTypeSelector from './RideTypeSelector'
import RouteStats from './RouteStats'
import ElevationProfile from './ElevationProfile'
import RouteFilters from './RouteFilters'
import RouteActions from './RouteActions'

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
    <>
      <RouteInput 
        searchQuery={searchQuery}
        onSearchChange={onSearchChange}
        onSearchSubmit={handleSearchSubmit}
        searchResults={searchResults}
        isSearching={isSearching}
        onSnapLocation={onSnapLocation}
        setWaypoints={setWaypoints}
      />

      <RideTypeSelector 
        activeType={routeOptions.pavedOnly ? 'commute' : 'gravel'} // Simplified mapping
        onChange={(type) => {
          setRouteOptions(prev => ({ 
            ...prev, 
            pavedOnly: type === 'commute' || type === 'family',
            avoidRoads: type !== 'commute'
          }))
        }}
      />

      <RouteStats info={routeInfo} />

      <ElevationProfile geojson={routeGeoJSON} />

      <RouteFilters 
        activeFilters={activeFilters} 
        onToggleFilter={onToggleFilter} 
      />

      <RouteActions 
        isNavigating={isNavigating}
        onToggleNavigation={() => setIsNavigating(!isNavigating)}
        onExport={handleExportGPX}
        onShare={handleShareRoute}
        onClear={onClearRoute}
      />
    </>
  )

  function handleSearchSubmit(query) {
    onSearchSubmit(query)
  }
}
