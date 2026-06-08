import React from 'react';
export default function Reki({ size = 64, mood = "scout" }) {
  const lines = { scout: "Reki's scouting the route…", empty: "Pick a start and a destination — I'll find the bikeable way.", estimate: "Trail signal's weak out here — showing a best estimate." };
  return (
    <div className="reki-box" style={{ display: "flex", gap: 12, alignItems: "center", padding: "14px 12px", background: "var(--paper-2)", border: "1px solid var(--line)", borderRadius: 12 }}>
      <img src="/reki_icon.png" width={size} height={size} alt="Reki" style={{ flex: "none", borderRadius: 10, objectFit: "contain" }} />
      <div style={{ fontSize: 13, color: "var(--ink-2)", lineHeight: 1.45 }}>{lines[mood]}</div>
    </div>
  );
}
