import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';

const Ic = {
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>,
};

export default function ProfileModal({ onClose }) {
  const { user, updateProfile, uploadAvatar, refreshUser } = useAuth();
  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (user) {
      setDisplayName(user.display_name || '');
      setUsername(user.username || '');
      setBio(user.bio || '');
    }
  }, [user]);

  const save = async (e) => {
    e.preventDefault();
    setBusy(true); setMsg('');
    try {
      await updateProfile({ display_name: displayName, username, bio });
      setMsg('Saved');
    } catch (e) {
      setMsg('Could not save. Username taken?');
    }
    setBusy(false);
  };

  const pickAvatar = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true); setMsg('');
    try {
      await uploadAvatar(file);
      setMsg('Avatar updated');
    } catch (err) {
      setMsg('Avatar upload failed');
    }
    setBusy(false);
  };

  if (!user) return null;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 380 }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 14, color: 'var(--ink)' }}>Your profile</div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
          <div style={{ width: 64, height: 64, borderRadius: '50%', overflow: 'hidden', background: 'var(--paper-2)', display: 'grid', placeItems: 'center', color: 'var(--muted-txt)', border: '1px solid var(--line)' }}>
            {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : Ic.user}
          </div>
          <div>
            <button className="pillbtn" onClick={() => fileRef.current?.click()}>Change avatar</button>
            <input type="file" ref={fileRef} accept="image/*" onChange={pickAvatar} style={{ display: 'none' }} />
          </div>
        </div>

        <form onSubmit={save}>
          <label style={{ fontSize: 12, color: 'var(--muted-txt)', display: 'block', marginBottom: 4 }}>Display name</label>
          <input value={displayName} onChange={(e) => setDisplayName(e.target.value)} maxLength={80} />

          <label style={{ fontSize: 12, color: 'var(--muted-txt)', display: 'block', margin: '10px 0 4px' }}>Username</label>
          <input value={username} onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))} maxLength={30} placeholder="letters, numbers, underscores" />

          <label style={{ fontSize: 12, color: 'var(--muted-txt)', display: 'block', margin: '10px 0 4px' }}>Bio</label>
          <textarea value={bio} onChange={(e) => setBio(e.target.value)} rows={3} maxLength={500} />

          {msg && <div className={msg === 'Saved' || msg === 'Avatar updated' ? 'mono' : 'field-error'} style={{ marginTop: 10, fontSize: 12 }}>{msg}</div>}

          <button type="submit" className="primary" style={{ width: '100%', marginTop: 14 }} disabled={busy}>{busy ? 'Saving…' : 'Save profile'}</button>
        </form>
      </div>
    </div>
  );
}
