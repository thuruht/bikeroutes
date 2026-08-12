import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import * as BR from '../api';

const Ic = {
  message: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H6l-3 3V11.5a8.5 8.5 0 0 1 17 0z"/></svg>,
  profile: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M3 21c0-5 4.5-9 9-9s9 4 9 9"/></svg>,
  logout: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/></svg>,
  bell: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>,
  flag: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>,
};

export default function UserMenu({ onSignIn, onProfile, onMessages, onModeration }) {
  const { user, signOut } = useAuth();
  const isMod = user && (user.role === 'admin' || user.role === 'moderator');
  const [menuOpen, setMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loadingNotifs, setLoadingNotifs] = useState(false);
  const panelRef = useRef(null);

  const loadNotifications = async () => {
    if (!user) return;
    setLoadingNotifs(true);
    try {
      const d = await BR.fetchNotifications();
      setNotifications(d.notifications || []);
      setUnreadCount(d.unreadCount || 0);
    } catch (e) { console.error(e); }
    setLoadingNotifs(false);
  };

  useEffect(() => {
    loadNotifications();
    const id = setInterval(loadNotifications, 30000);
    return () => clearInterval(id);
  }, [user]);

  const openNotifications = () => {
    setNotifOpen(true);
    setMenuOpen(false);
    loadNotifications();
  };

  const markRead = async (id) => {
    try {
      await BR.markNotificationRead(id);
      setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      setUnreadCount(prev => Math.max(0, prev - 1));
    } catch (e) { console.error(e); }
  };

  const markAllRead = async () => {
    try {
      await BR.markAllNotificationsRead();
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch (e) { console.error(e); }
  };

  if (!user) {
    return (
      <button className="pillbtn" onClick={onSignIn}>Sign in</button>
    );
  }

  const name = user.display_name || user.username || 'Rider';

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ position: 'relative' }}>
        <button onClick={() => notifOpen ? setNotifOpen(false) : openNotifications()} style={{ position: 'relative', display: 'grid', placeItems: 'center', width: 34, height: 34, borderRadius: '50%', border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer' }} title="Notifications">
          {Ic.bell}
          {unreadCount > 0 && <span style={{ position: 'absolute', top: -2, right: -2, minWidth: 16, height: 16, padding: '0 4px', borderRadius: 8, background: 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 700, display: 'grid', placeItems: 'center', border: '2px solid var(--paper)' }}>{unreadCount > 9 ? '9+' : unreadCount}</span>}
        </button>
        {notifOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setNotifOpen(false)} />
            <div ref={panelRef} style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, width: 280, maxHeight: 360, overflow: 'auto', background: 'var(--panel-solid)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow)', padding: 8 }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6, padding: '4px 2px' }}>
                <span style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>Notifications</span>
                {unreadCount > 0 && <button onClick={markAllRead} style={{ fontSize: 11, color: 'var(--green)', background: 'transparent', border: 0, cursor: 'pointer' }}>Mark all read</button>}
              </div>
              {loadingNotifs && notifications.length === 0 && <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted-txt)', fontSize: 12 }}>Loading…</div>}
              {notifications.length === 0 && !loadingNotifs && <div style={{ padding: 20, textAlign: 'center', color: 'var(--muted-txt)', fontSize: 12 }}>No notifications</div>}
              {notifications.map(n => (
                <div key={n.id} onClick={() => markRead(n.id)} style={{ padding: 8, borderRadius: 8, marginBottom: 4, background: n.isRead ? 'transparent' : 'var(--paper-2)', cursor: 'pointer' }}>
                  <div style={{ fontWeight: n.isRead ? 500 : 700, fontSize: 12, color: 'var(--ink)', lineHeight: 1.3 }}>{n.title}</div>
                  <div style={{ fontSize: 11, color: 'var(--ink-2)', lineHeight: 1.3, marginTop: 2 }}>{n.body}</div>
                  <div className="mono" style={{ fontSize: 9.5, color: 'var(--muted-txt)', marginTop: 3 }}>{new Date(n.createdAt).toLocaleString()}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      <div style={{ position: 'relative' }}>
        <button onClick={() => { setMenuOpen(o => !o); setNotifOpen(false); }} style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '6px 10px', borderRadius: 20, border: '1px solid var(--line)', background: 'var(--paper)', color: 'var(--ink)', cursor: 'pointer' }}>
          <div style={{ width: 26, height: 26, borderRadius: '50%', overflow: 'hidden', background: 'var(--paper-2)', display: 'grid', placeItems: 'center', color: 'var(--ink)', border: '1px solid var(--line)' }}>
            {user.avatar_url ? <img src={user.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <svg viewBox="0 0 40 40" style={{ width: 20, height: 20 }}><use href="#mark-b" /></svg>}
          </div>
          <span style={{ fontSize: 13, fontWeight: 600 }}>{name}</span>
          <span style={{ fontSize: 10, color: 'var(--muted-txt)' }}>▼</span>
        </button>
        {menuOpen && (
          <>
            <div style={{ position: 'fixed', inset: 0, zIndex: 40 }} onClick={() => setMenuOpen(false)} />
            <div style={{ position: 'absolute', top: 'calc(100% + 6px)', right: 0, zIndex: 50, minWidth: 160, background: 'var(--panel-solid)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow)', overflow: 'hidden', padding: 6 }}>
              <button onClick={() => { setMenuOpen(false); onProfile(); }} style={menuItem}>{Ic.profile} Profile</button>
              <button onClick={() => { setMenuOpen(false); onMessages(); }} style={menuItem}>{Ic.message} Messages</button>
              {isMod && <button onClick={() => { setMenuOpen(false); onModeration(); }} style={menuItem}>{Ic.flag} Moderation</button>}
              <button onClick={() => { setMenuOpen(false); signOut(); }} style={menuItem}>{Ic.logout} Sign out</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

const menuItem = { display: 'flex', alignItems: 'center', gap: 8, width: '100%', padding: '8px 10px', borderRadius: 8, border: 0, background: 'transparent', color: 'var(--ink)', fontSize: 13, cursor: 'pointer' };
