import React from 'react';

const I = {
  start: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="4"/></svg>,
  right: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M9 20V10a3 3 0 0 1 3-3h6"/><path d="M15 4l4 3-4 3"/></svg>,
  left: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M15 20V10a3 3 0 0 0-3-3H6"/><path d="M9 4L5 7l4 3"/></svg>,
  arrive: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"><path d="M6 21V4M6 4h11l-2 4 2 4H6"/></svg>,
  dot: <svg viewBox="0 0 24 24" fill="currentColor"><circle cx="12" cy="12" r="3"/></svg>
};

export default function Turns({ turns, onHover }) {
  if (!turns || turns.length === 0) return null;

  return (
    <div className="turns">
      <div className="turns-head">Directions</div>
      {turns.map((t, i) => (
        <div className="turn" key={i}
             onMouseEnter={() => onHover && t.at && onHover(t.at)}
             onMouseLeave={() => onHover && onHover(null)}>
          <div className="ic">{I[t.type] || I.dot}</div>
          <div className="body">
            <div className="road">{t.road || "Continue"}</div>
            <div className="meta">{t.dist ? `${(t.dist / 1000).toFixed(2)} km` : ""}</div>
          </div>
        </div>
      ))}
    </div>
  );
}
