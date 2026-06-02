import styles from './WCLeaderboard.module.css'

const MOCK_RIDERS = [
  { rank: 1, name: 'ArrowheadRider26', routes: 14, distance: 87.2, matchDays: 5 },
  { rank: 2, name: 'TrailHeadKC', routes: 12, distance: 72.5, matchDays: 4 },
  { rank: 3, name: 'BlueValleyBiker', routes: 11, distance: 68.1, matchDays: 4 },
  { rank: 4, name: 'MidtownMover', routes: 9, distance: 55.3, matchDays: 3 },
  { rank: 5, name: 'RiverfrontRider', routes: 8, distance: 48.9, matchDays: 3 },
  { rank: 6, name: 'KCTwoPedals', routes: 7, distance: 42.1, matchDays: 2 },
  { rank: 7, name: 'WestBottomsWheel', routes: 6, distance: 35.7, matchDays: 2 },
  { rank: 8, name: 'UnionStnCommuter', routes: 5, distance: 29.4, matchDays: 2 },
]

const FEATURED_ROUTES = [
  {
    name: 'Midtown → Arrowhead via MKT Trail',
    distance: '12.3 mi',
    surface: 'Paved',
    waypoints: [[-94.5786, 39.0997], [-94.4839, 39.0489]],
  },
  {
    name: 'Union Station → Power & Light Loop',
    distance: '3.1 mi',
    surface: 'Paved',
    waypoints: [[-94.5838, 39.0997], [-94.5786, 39.0999]],
  },
  {
    name: 'Berkley Riverfront Connector',
    distance: '5.8 mi',
    surface: 'Mixed',
    waypoints: [[-94.5786, 39.0999], [-94.5784, 39.1082]],
  },
  {
    name: 'West Bottoms Fan Zone Express',
    distance: '4.2 mi',
    surface: 'Paved',
    waypoints: [[-94.5838, 39.0997], [-94.5950, 39.1020]],
  },
]

export default function WCLeaderboard({ onRouteSelect }) {
  const rankBadge = (rank) => {
    if (rank === 1) return '🥇'
    if (rank === 2) return '🥈'
    if (rank === 3) return '🥉'
    return `#${rank}`
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h2 className={styles.title}>⚽ KC 2026 Leaderboard</h2>
        <span className="eyebrow">Sample Data</span>
      </div>

      <div className={styles.layout}>
        {/* Match Day Riders */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Match Day Riders</h3>
          <div className={`box ${styles.tableWrap}`}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Rank</th>
                  <th>Rider</th>
                  <th>Routes</th>
                  <th>Distance</th>
                  <th>Match Days</th>
                </tr>
              </thead>
              <tbody>
                {MOCK_RIDERS.map(r => (
                  <tr key={r.rank} className={r.rank <= 3 ? styles.topThree : ''}>
                    <td className={styles.rankCell}>{rankBadge(r.rank)}</td>
                    <td className={styles.riderCell}>{r.name}</td>
                    <td>{r.routes}</td>
                    <td>{r.distance} mi</td>
                    <td>{r.matchDays}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        {/* Featured Routes */}
        <section className={styles.section}>
          <h3 className={styles.sectionTitle}>Most-Ridden WC Routes</h3>
          <div className={styles.routeGrid}>
            {FEATURED_ROUTES.map((route, i) => (
              <div key={i} className={`box ${styles.routeCard}`}>
                <div className={styles.routeInfo}>
                  <div className={styles.routeName}>{route.name}</div>
                  <div className={styles.routeMeta}>
                    <span className={styles.routeDist}>{route.distance}</span>
                    <span className={styles.routeSurface}>{route.surface}</span>
                  </div>
                </div>
                <button
                  className={styles.tryBtn}
                  onClick={() => onRouteSelect(route.waypoints)}
                >
                  Try this route →
                </button>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className={`box tint ${styles.shareSection}`}>
        <h3 className={styles.shareTitle}>Share Your Ride</h3>
        <p className={styles.shareText}>Rode to a match? Submit your route to the community leaderboard!</p>
        <button className={styles.shareBtn} onClick={() => alert('Coming soon!')}>
          Submit Route
        </button>
      </section>
    </div>
  )
}
