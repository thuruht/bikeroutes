/* ============================================================
   mobile.jsx — bikeroutes.org mobile layout
   Reuses MapCanvas + panel pieces (Summary/Elevation/Turns/Spark/I)
   inside iOS device frames. Loaded after data/map/panels/ios-frame.
   ============================================================ */
const { useState } = React;

const m = {
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="7"/><path d="M20 20l-3.2-3.2"/></svg>,
  locate: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="3.4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3"/></svg>,
  layers: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l9 5-9 5-9-5 9-5z"/><path d="M3 14l9 5 9-5"/></svg>,
  back: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M15 5l-7 7 7 7"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18"/></svg>,
  clock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>,
  star: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 3l2.6 5.6 6 .7-4.4 4.1 1.2 6L12 17.8 6.6 19.5l1.2-6L3.4 9.3l6-.7L12 3z"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round"><path d="M12 21s7-6.4 7-11a7 7 0 1 0-14 0c0 4.6 7 11 7 11z"/><circle cx="12" cy="10" r="2.4"/></svg>,
  nav: <svg viewBox="0 0 24 24" fill="currentColor"><path d="M3 11l18-8-8 18-2-7-8-3z"/></svg>,
  right: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round"><path d="M9 20V11a3 3 0 0 1 3-3h6"/><path d="M15 5l4 3-4 3"/></svg>,
};

const ROUTE = ROUTES.balanced;
const noop = () => {};

/* shared map background inside a phone */
function MapBG({ route = ROUTE, trail = null, gravelOn = false }) {
  return (
    <div style={{ position: "absolute", inset: 0, background: "var(--m-paper)" }}>
      <MapCanvas route={route} trail={trail} activeTrail={trail} gravelOn={gravelOn} highlight={null} scrub={null} onMapPoint={null} />
    </div>
  );
}

/* a floating round control */
function Fab({ children, style }) {
  return (
    <div style={{
      width: 44, height: 44, borderRadius: 14, background: "var(--panel)",
      backdropFilter: "blur(10px)", border: "1px solid var(--line)",
      boxShadow: "var(--shadow-sm)", display: "grid", placeItems: "center",
      color: "var(--ink-2)", ...style,
    }}>
      <span style={{ width: 21, height: 21, display: "block" }}>{children}</span>
    </div>
  );
}

function Sheet({ children, h }) {
  return (
    <div style={{
      position: "absolute", left: 0, right: 0, bottom: 0, height: h,
      background: "var(--panel-solid)", borderRadius: "22px 22px 0 0",
      boxShadow: "0 -2px 10px rgba(40,36,28,.06), 0 -16px 40px rgba(40,36,28,.12)",
      border: "1px solid var(--line)", borderBottom: 0,
      display: "flex", flexDirection: "column", overflow: "hidden",
    }}>
      <div style={{ display: "grid", placeItems: "center", padding: "9px 0 4px", flex: "none" }}>
        <div style={{ width: 38, height: 5, borderRadius: 4, background: "var(--line-2)" }} />
      </div>
      {children}
    </div>
  );
}

const Pill = ({ children, style }) => (
  <div style={{
    background: "var(--panel)", backdropFilter: "blur(12px)", border: "1px solid var(--line)",
    borderRadius: 16, boxShadow: "var(--shadow-sm)", display: "flex", alignItems: "center",
    gap: 10, padding: "13px 15px", ...style,
  }}>{children}</div>
);

const ico = (node, size = 19, color = "var(--muted-txt)") => (
  <span style={{ width: size, height: size, color, flex: "none", display: "block" }}>{node}</span>
);

/* ===================== SCREENS ===================== */

// 1. Map home (collapsed sheet)
function ScreenHome() {
  return (
    <div style={{ position: "relative", height: "100%", fontFamily: '"IBM Plex Sans",sans-serif' }}>
      <MapBG />
      <div style={{ position: "absolute", top: 60, left: 16, right: 16 }}>
        <Pill>
          {ico(m.search, 19, "var(--green)")}
          <span style={{ flex: 1, color: "var(--muted-txt)", fontSize: 15.5 }}>Where to?</span>
          <span style={{ width: 30, height: 30, borderRadius: "50%", background: "var(--green-soft)", color: "var(--green)", display: "grid", placeItems: "center", fontSize: 13, fontWeight: 600 }}>JR</span>
        </Pill>
      </div>
      <div style={{ position: "absolute", right: 16, bottom: 268, display: "flex", flexDirection: "column", gap: 10 }}>
        <Fab>{m.layers}</Fab>
        <Fab style={{ color: "var(--green)" }}>{m.locate}</Fab>
      </div>
      <Sheet h={244}>
        <div style={{ padding: "4px 18px 18px" }}>
          <Pill style={{ borderRadius: 14, padding: "13px 14px", boxShadow: "none", background: "var(--paper-2)" }}>
            {ico(m.search, 18)}<span style={{ color: "var(--ink)", fontSize: 15, fontWeight: 500 }}>Plan a route</span>
          </Pill>
          <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
            {[["Home", m.pin], ["Work", m.pin], ["Saved", m.star]].map(([t, ic], i) => (
              <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 7, padding: "12px 0", background: "var(--paper-2)", borderRadius: 13 }}>
                {ico(ic, 19, "var(--ink-2)")}
                <span style={{ fontSize: 12, color: "var(--ink-2)", fontWeight: 500 }}>{t}</span>
              </div>
            ))}
          </div>
          <div style={{ fontSize: 11, letterSpacing: ".06em", textTransform: "uppercase", color: "var(--muted-txt)", fontWeight: 600, margin: "18px 2px 4px" }}>Recent</div>
          {[["Summit Vista Lookout", "14.2 km · Balanced"], ["Riverline Greenway", "8.4 km · Easy"]].map(([t, s], i) => (
            <div key={i} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 2px" }}>
              {ico(m.clock, 18)}
              <div style={{ flex: 1 }}>
                <div style={{ fontSize: 14.5, fontWeight: 500 }}>{t}</div>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--muted-txt)", marginTop: 1 }}>{s}</div>
              </div>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

// 2. Search w/ keyboard
function ScreenSearch() {
  const results = [
    ["Summit Vista Lookout", "Trailhead · 14.2 km away", m.pin, true],
    ["Summit Café & Bike Stop", "Café · 13.8 km away", m.pin, false],
    ["Summerlin Loop Trailhead", "Trail · 9.1 km away", m.pin, false],
  ];
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--panel-solid)", fontFamily: '"IBM Plex Sans",sans-serif', display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "58px 14px 12px", display: "flex", alignItems: "center", gap: 10, borderBottom: "1px solid var(--line)" }}>
        <span style={{ width: 24, height: 24, color: "var(--ink-2)" }}>{m.back}</span>
        <div style={{ flex: 1, background: "var(--paper-2)", borderRadius: 12, padding: "10px 12px", display: "flex", alignItems: "center", gap: 9 }}>
          {ico(m.search, 17, "var(--green)")}
          <span style={{ fontSize: 15, color: "var(--ink)", fontWeight: 500 }}>Summit Vista<span style={{ borderLeft: "1.5px solid var(--green)", marginLeft: 1, animation: "none" }}></span></span>
          <span style={{ flex: 1 }}></span>
          <span style={{ width: 18, height: 18, color: "var(--muted-txt)" }}>{m.x}</span>
        </div>
      </div>
      <div style={{ flex: 1, overflow: "hidden" }}>
        {results.map(([t, s, ic, hit], i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 13, padding: "13px 18px", borderBottom: "1px solid var(--line)" }}>
            <span style={{ width: 34, height: 34, borderRadius: 10, background: hit ? "var(--green-soft)" : "var(--paper-2)", color: hit ? "var(--green)" : "var(--muted-txt)", display: "grid", placeItems: "center" }}>{ico(ic, 18, "currentColor")}</span>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 15, fontWeight: 500 }}>{t}</div>
              <div className="mono" style={{ fontSize: 11.5, color: "var(--muted-txt)", marginTop: 1 }}>{s}</div>
            </div>
          </div>
        ))}
      </div>
      <IOSKeyboard />
    </div>
  );
}

// 3. Route preview (medium sheet)
function ScreenPreview() {
  const [pref, setPref] = useState("balanced");
  const r = ROUTES[pref];
  return (
    <div style={{ position: "relative", height: "100%", fontFamily: '"IBM Plex Sans",sans-serif' }}>
      <MapBG route={r} />
      <div style={{ position: "absolute", top: 60, left: 16, right: 16 }}>
        <Pill style={{ padding: "10px 14px" }}>
          <span style={{ width: 22, height: 22, color: "var(--ink-2)" }}>{m.back}</span>
          <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.3 }}>
            <div style={{ fontWeight: 600 }}>Summit Vista Lookout</div>
            <div className="mono" style={{ fontSize: 11, color: "var(--muted-txt)" }}>from Cedar Mill Greenway</div>
          </div>
        </Pill>
      </div>
      <Sheet h={392}>
        <div style={{ padding: "2px 18px 16px", overflowY: "auto" }}>
          <div style={{ display: "flex", background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 12, padding: 3, gap: 2, marginBottom: 14 }}>
            {[["balanced", "Balanced"], ["quiet", "Quiet"], ["fast", "Fastest"]].map(([k, t]) => (
              <button key={k} onClick={() => setPref(k)} style={{
                flex: 1, border: 0, cursor: "pointer", fontFamily: "inherit", fontSize: 13, fontWeight: 600,
                padding: "9px 0", borderRadius: 9, background: pref === k ? "var(--panel-solid)" : "transparent",
                color: pref === k ? "var(--ink)" : "var(--muted-txt)", boxShadow: pref === k ? "var(--shadow-sm)" : "none",
              }}>{t}</button>
            ))}
          </div>
          <div style={{ display: "flex", alignItems: "baseline", gap: 9 }}>
            <span className="mono" style={{ fontSize: 30, fontWeight: 600, letterSpacing: "-.02em" }}>{r.stats.dist}<span style={{ fontSize: 15, color: "var(--muted-txt)" }}> km</span></span>
            <span style={{ fontSize: 14, color: "var(--ink-2)" }}>· <b>{r.stats.time}</b> · +{r.stats.climb} m</span>
          </div>
          <div className="surface" style={{ marginTop: 14 }}>
            <div className="bar"><div className="paved" style={{ width: r.stats.paved + "%" }} /><div className="gravel" style={{ width: r.stats.gravel + "%" }} /></div>
            <div className="legend mono"><span><i className="pv" />{r.stats.paved}% paved</span><span><i className="gv" />{r.stats.gravel}% gravel</span></div>
          </div>
          <Elevation route={r} onScrub={noop} />
          <div style={{ display: "flex", gap: 10, marginTop: 16 }}>
            <button style={{ flex: 1, border: 0, background: "var(--green)", color: "#fff", borderRadius: 13, padding: "14px", fontFamily: "inherit", fontSize: 15, fontWeight: 600, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, cursor: "pointer" }}>
              <span style={{ width: 18, height: 18 }}>{m.nav}</span>Start</button>
            <button style={{ width: 52, border: "1px solid var(--line)", background: "var(--panel-solid)", borderRadius: 13, display: "grid", placeItems: "center", cursor: "pointer", color: "var(--ink-2)" }}>{ico(m.star, 19, "currentColor")}</button>
          </div>
        </div>
      </Sheet>
    </div>
  );
}

// 4. Directions (full sheet)
function ScreenSteps() {
  return (
    <div style={{ position: "relative", height: "100%", background: "var(--panel-solid)", fontFamily: '"IBM Plex Sans",sans-serif', display: "flex", flexDirection: "column" }}>
      <div style={{ padding: "58px 16px 14px", display: "flex", alignItems: "center", gap: 12, borderBottom: "1px solid var(--line)" }}>
        <span style={{ width: 22, height: 22, color: "var(--ink-2)" }}>{m.back}</span>
        <div style={{ flex: 1 }}>
          <div style={{ fontSize: 16, fontWeight: 600 }}>Directions</div>
          <div className="mono" style={{ fontSize: 11.5, color: "var(--muted-txt)" }}>14.2 km · 48 min · 7 steps</div>
        </div>
      </div>
      <div style={{ flex: 1, overflowY: "auto", padding: "8px 14px 20px" }}>
        <div style={{ borderRadius: 14, overflow: "hidden", border: "1px solid var(--line)", marginBottom: 6 }}>
          <Elevation route={ROUTE} onScrub={noop} />
        </div>
        <Turns route={ROUTE} onHover={noop} />
      </div>
    </div>
  );
}

// 5. Active navigation (dark)
function ScreenNav() {
  return (
    <div data-theme="dark" style={{ position: "relative", height: "100%", fontFamily: '"IBM Plex Sans",sans-serif' }}>
      <MapBG route={ROUTE} />
      <div style={{ position: "absolute", top: 54, left: 12, right: 12, background: "var(--green)", borderRadius: 18, padding: "16px 16px", display: "flex", alignItems: "center", gap: 14, boxShadow: "0 10px 30px rgba(0,0,0,.35)" }}>
        <span style={{ width: 34, height: 34, color: "#fff", flex: "none" }}>{m.right}</span>
        <div style={{ color: "#fff" }}>
          <div className="mono" style={{ fontSize: 22, fontWeight: 600 }}>300 m</div>
          <div style={{ fontSize: 14, opacity: .92 }}>Turn right onto Riverside Path</div>
        </div>
      </div>
      <div style={{ position: "absolute", left: 12, right: 12, bottom: 30, background: "var(--panel-solid)", border: "1px solid var(--line)", borderRadius: 18, padding: "14px 16px", display: "flex", alignItems: "center", gap: 12, boxShadow: "var(--shadow)" }}>
        <div style={{ flex: 1 }}>
          <div className="mono" style={{ fontSize: 19, fontWeight: 600 }}>4:32 <span style={{ fontSize: 13, color: "var(--muted-txt)" }}>PM</span></div>
          <div className="mono" style={{ fontSize: 12, color: "var(--muted-txt)", marginTop: 1 }}>48 min · 14.2 km</div>
        </div>
        <button style={{ border: 0, background: "var(--orange)", color: "#fff", borderRadius: 13, padding: "12px 22px", fontFamily: "inherit", fontSize: 14, fontWeight: 600, cursor: "pointer" }}>End</button>
      </div>
    </div>
  );
}

// 6. Explore (sheet with trails)
function ScreenExplore() {
  const [active, setActive] = useState("riverline");
  const trail = TRAILS.find(t => t.id === active);
  return (
    <div style={{ position: "relative", height: "100%", fontFamily: '"IBM Plex Sans",sans-serif' }}>
      <MapBG route={null} trail={trail} />
      <div style={{ position: "absolute", top: 60, left: 16, right: 16 }}>
        <Pill>{ico(m.search, 19, "var(--green)")}<span style={{ flex: 1, color: "var(--ink)", fontSize: 15, fontWeight: 500 }}>Explore nearby</span></Pill>
      </div>
      <Sheet h={398}>
        <div style={{ padding: "2px 0 16px", overflowY: "auto" }}>
          <div style={{ display: "flex", gap: 7, padding: "4px 18px 6px", overflowX: "auto" }}>
            {["All", "Paved", "Gravel", "Trail"].map((c, i) => (
              <span key={c} style={{ flex: "none", fontSize: 12.5, padding: "7px 13px", borderRadius: 20, fontWeight: 500, border: "1px solid var(--line)", background: i === 0 ? "var(--ink)" : "var(--panel-solid)", color: i === 0 ? "var(--paper)" : "var(--ink-2)" }}>{c}</span>
            ))}
          </div>
          {TRAILS.slice(0, 4).map(t => (
            <div key={t.id} onClick={() => setActive(t.id)} style={{ display: "flex", gap: 12, padding: "11px 18px", alignItems: "center", background: active === t.id ? "var(--paper-2)" : "transparent" }}>
              <div style={{ width: 58, height: 44, borderRadius: 9, background: "var(--paper-2)", overflow: "hidden", flex: "none" }}><Spark seed={t.seed} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 600 }}>{t.name}</div>
                <div className="mono" style={{ fontSize: 11.5, color: "var(--muted-txt)", marginTop: 2 }}>{t.dist} · {t.diff} · {t.near}</div>
              </div>
              <span style={{ width: 20, height: 20, color: "var(--muted-txt)" }}>{m.star}</span>
            </div>
          ))}
        </div>
      </Sheet>
    </div>
  );
}

/* ===================== LAYOUT ===================== */
const SCREENS = [
  ["01 · Map home", ScreenHome, false],
  ["02 · Search", ScreenSearch, false],
  ["03 · Route preview", ScreenPreview, false],
  ["04 · Directions", ScreenSteps, false],
  ["05 · Navigation", ScreenNav, true],
  ["06 · Explore", ScreenExplore, false],
];
const SCALE = 0.82;

function Page() {
  return (
    <div style={{ minHeight: "100vh", background: "var(--paper-2)", padding: "46px 48px 70px" }}>
      <div style={{ maxWidth: 1180, margin: "0 auto 30px" }}>
        <div className="mono" style={{ fontSize: 12, letterSpacing: ".14em", textTransform: "uppercase", color: "var(--muted-txt)", fontWeight: 600 }}>bikeroutes.org · mobile</div>
        <h1 style={{ fontSize: 32, fontWeight: 600, letterSpacing: "-.02em", margin: "10px 0 8px" }}>Mobile layout</h1>
        <p style={{ margin: 0, maxWidth: 640, color: "var(--ink-2)", fontSize: 14.5, lineHeight: 1.6 }}>
          The same map-first system on a phone — a draggable bottom sheet replaces the side panel. Search, plan, navigate and explore, in light and dark map themes.
        </p>
      </div>
      <div style={{ display: "flex", gap: 30, flexWrap: "wrap", justifyContent: "center", alignItems: "flex-start" }}>
        {SCREENS.map(([label, Comp, dark], i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 16 }}>
            <div data-theme={dark ? "dark" : undefined} style={{ width: 402 * SCALE, height: 874 * SCALE, position: "relative" }}>
              <div style={{ transform: `scale(${SCALE})`, transformOrigin: "top left", width: 402, height: 874 }}>
                <IOSDevice dark={dark}><Comp /></IOSDevice>
              </div>
            </div>
            <div className="mono" style={{ fontSize: 12.5, color: "var(--muted-txt)", fontWeight: 500 }}>{label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}

ReactDOM.createRoot(document.getElementById("root")).render(<Page />);
