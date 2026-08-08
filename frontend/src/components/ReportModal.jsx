import { useState } from 'react';

const Ic = {
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>,
};

const REASONS = ['Spam', 'Harassment', 'Misinformation', 'Illegal / dangerous', 'Other'];

export default function ReportModal({ targetType, targetId, onClose, onSubmit }) {
  const [reason, setReason] = useState('');
  const [custom, setCustom] = useState('');
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const canSubmit = (reason && reason !== 'Other') || (reason === 'Other' && custom.trim().length > 0);
  const finalReason = reason === 'Other' ? custom.trim() : reason;

  const submit = async (e) => {
    e.preventDefault();
    if (!canSubmit || busy) return;
    setBusy(true);
    try {
      await onSubmit(finalReason);
      setDone(true);
      setTimeout(onClose, 1200);
    } catch (err) {
      alert('Could not submit report. Sign in?');
    }
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw, 360px)' }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ fontWeight: 700, fontSize: 17, marginBottom: 6, color: 'var(--ink)', display: 'flex', alignItems: 'center', gap: 8 }}>
          {Ic.flag} Report {targetType}
        </div>
        {done ? (
          <div style={{ padding: '18px 0', fontSize: 13, color: 'var(--green)' }}>Report submitted. Moderators will review it.</div>
        ) : (
          <form onSubmit={submit}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, margin: '12px 0' }}>
              {REASONS.map((r) => (
                <button
                  key={r}
                  type="button"
                  className={"chip" + (reason === r ? " active" : "")}
                  onClick={() => setReason(r)}
                  style={{ fontSize: 12 }}
                >{r}</button>
              ))}
            </div>
            {reason === 'Other' && (
              <textarea
                placeholder="Briefly describe the issue"
                value={custom}
                onChange={(e) => setCustom(e.target.value)}
                rows={3}
                style={{ marginBottom: 10 }}
              />
            )}
            <button type="submit" className="primary" style={{ width: '100%' }} disabled={!canSubmit || busy}>Submit report</button>
          </form>
        )}
      </div>
    </div>
  );
}
