export default function Reki({ size = 64, mood = "scout" }) {
  const lines = {
    scout: "Reki's scouting the route…",
    empty: "Pick a start and a destination — or click the map. I'll find the bikeable way.",
    estimate: "Trail signal's weak out here — showing a best estimate.",
  };
  return (
    <div style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 12px",
      background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
      <span style={{ flex: "none", width: size, height: size, borderRadius: 12,
        background: "var(--green-soft)", border: "1px solid var(--line)",
        display: "grid", placeItems: "center", overflow: "hidden" }}>
        <svg viewBox="34 20 172 172" width={size - 10} height={size - 10}
          role="img" aria-label="Reki the deer" style={{ display: "block" }}>
          <use href="#reki-head" />
        </svg>
      </span>
      <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>{lines[mood]}</div>
    </div>
  );
}
