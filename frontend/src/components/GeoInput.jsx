import React, { useState, useEffect } from 'react';
import { searchLocations } from '../lib/api';
export default function GeoInput({ dotClass, value, placeholder, onPick }) {
  const [q, setQ] = useState(value || ""); const [list, setList] = useState([]); const [open, setOpen] = useState(false); const [busy, setBusy] = useState(false);
  useEffect(() => { if (!open) setQ(value || ""); }, [value, open]);
  async function search(text) { if (!text.trim() || text.length < 3) { setList([]); return; } setBusy(true); const results = await searchLocations(text); setList(results); setOpen(true); setBusy(false); }
  return (
    <div style={{ position: "relative", flex: 1 }}>
      <div className="io-row"><span className={"io-dot " + dotClass} /><input value={q} placeholder={placeholder} onChange={(e) => { setQ(e.target.value); search(e.target.value); }} onFocus={() => list.length && setOpen(true)} onBlur={() => setTimeout(() => setOpen(false), 200)} />{busy && <span className="mono" style={{ fontSize: 10, color: "var(--muted-txt)" }}>...</span>}</div>
      {open && list.length > 0 && (<div className="io-list">{list.map((d, i) => (<div key={i} onMouseDown={() => { onPick(d); setQ(d.short); setOpen(false); }} className="io-item" style={{ borderBottom: i < list.length - 1 ? "1px solid var(--line)" : 0 }}><div className="n">{d.short}</div><div className="d">{d.label}</div></div>))}</div>)}
    </div>
  );
}
