import { useEffect, useState } from 'react';
import * as BR from '../api';
import { useAuth } from '../AuthContext';

function copyToClipboard(text) {
  if (navigator.clipboard && navigator.clipboard.writeText) {
    return navigator.clipboard.writeText(text);
  }
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  document.body.removeChild(ta);
  return Promise.resolve();
}

const Ic = {
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  link: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/></svg>,
  message: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 6H2v12h20V6z"/><path d="M2 8l10 7 10-7"/></svg>,
};

export default function PublicProfile({ username, userId, onClose, onMessage }) {
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    setLoading(true); setError(null);
    const load = username
      ? BR.fetchPublicUser(username)
      : userId
        ? BR.fetchPublicUserById(userId)
        : Promise.reject(new Error('No user specified'));
    load.then(d => { setProfile(d.user); setLoading(false); })
      .catch(e => { setError(e.message || 'Could not load profile'); setLoading(false); });
  }, [username, userId]);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw, 400px)', maxHeight: 'min(85vh, 600px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>

        {loading && <div className="mono" style={{ padding: 30, textAlign: 'center', color: 'var(--muted-txt)' }}>Loading…</div>}

        {error && (
          <div style={{ padding: 20, textAlign: 'center', color: 'var(--danger)' }}>
            <div className="field-error">{error}</div>
          </div>
        )}

        {profile && (
          <div style={{ overflowY: 'auto', paddingRight: 4 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
              <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'var(--paper-2)', display: 'grid', placeItems: 'center', color: 'var(--muted-txt)', border: '1px solid var(--line)', flex: 'none' }}>
                {profile.avatar_url ? <img src={profile.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : Ic.user}
              </div>
              <div style={{ minWidth: 0 }}>
                <div style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{profile.display_name || profile.username}</div>
                {profile.display_name && profile.username && (
                  <div className="mono" style={{ fontSize: 12, color: 'var(--muted-txt)' }}>@{profile.username}</div>
                )}
                {profile.contribution_count > 0 && (
                  <div className="mono" style={{ fontSize: 11, color: 'var(--green)', marginTop: 3 }}>{profile.contribution_count} contribution{profile.contribution_count === 1 ? '' : 's'}</div>
                )}
              </div>
            </div>

            {profile.bio ? (
              <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45, marginBottom: 16, whiteSpace: 'pre-wrap' }}>{profile.bio}</div>
            ) : (
              <div className="mono" style={{ fontSize: 12, color: 'var(--muted-txt)', marginBottom: 16 }}>No bio yet.</div>
            )}

            {user && user.id !== profile.id && (
              <button
                type="button"
                className="primary"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6, marginBottom: 10 }}
                onClick={() => { onMessage?.(profile.username || profile.id); onClose?.(); }}
              >
                {Ic.message} Message
              </button>
            )}

            {profile.username && (
              <button
                type="button"
                className="pillbtn"
                style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6 }}
                onClick={() => {
                  const url = new URL(window.location.href);
                  url.searchParams.set('profile', profile.username);
                  copyToClipboard(url.toString()).then(() => { setCopied(true); setTimeout(() => setCopied(false), 1500); });
                }}
              >
                {Ic.link} {copied ? 'Link copied' : 'Direct link'}
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
