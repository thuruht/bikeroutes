import { useState, useEffect } from 'react';
import * as BR from '../api';
import { useAuth } from '../AuthContext';

const Ic = {
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
};

export default function SignInModal({ onClose, prefillEmail = '', prefillCode = '' }) {
  const { refreshUser } = useAuth();
  const [mode, setMode] = useState(prefillCode ? 'code' : 'email');
  const [email, setEmail] = useState(prefillEmail);
  const [code, setCode] = useState(prefillCode);
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState(prefillCode ? 'Finishing sign in…' : '');

  const doVerify = async () => {
    if (!code.trim()) return;
    setBusy(true); setErr('');
    try {
      await BR.verifyCode(email, code);
      await refreshUser();
      onClose();
    } catch (e) { setErr(e.message || 'Invalid code'); }
    setBusy(false);
  };

  useEffect(() => {
    if (prefillCode && email && code.length >= 4) {
      doVerify();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const request = async (e) => {
    e.preventDefault();
    if (!email.includes('@')) return setErr('Enter a valid email');
    setBusy(true); setErr('');
    try {
      await BR.requestCode(email);
      setMode('code');
      setMsg('Code sent. Check your inbox.');
    } catch (e) { setErr(e.message || 'Could not send code'); }
    setBusy(false);
  };

  const verify = async (e) => {
    e.preventDefault();
    await doVerify();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: 'var(--ink)' }}>Sign in</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.4 }}>A one-time code will be emailed to you.</div>
        {mode === 'email' ? (
          <form onSubmit={request}>
            <input type="email" value={email} placeholder="your@email.com" onChange={(e) => setEmail(e.target.value)} autoFocus />
            {err && <div className="field-error" style={{ marginTop: 6 }}>{err}</div>}
            <button className="primary" style={{ marginTop: 14, width: '100%' }} disabled={busy}>{busy ? 'Sending…' : 'Send code'}</button>
          </form>
        ) : (
          <form onSubmit={verify}>
            {msg && <div className="mono" style={{ marginBottom: 10, fontSize: 12, color: 'var(--green)' }}>{msg}</div>}
            <input value={code} placeholder="6-digit code" onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
            {err && <div className="field-error" style={{ marginTop: 6 }}>{err}</div>}
            <button className="primary" style={{ marginTop: 14, width: '100%' }} disabled={busy || code.length < 4}>{busy ? 'Signing in…' : 'Sign in'}</button>
            <button type="button" className="pillbtn" style={{ marginTop: 8, width: '100%' }} onClick={() => setMode('email')}>Use different email</button>
          </form>
        )}
      </div>
    </div>
  );
}
