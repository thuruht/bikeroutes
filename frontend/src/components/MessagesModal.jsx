import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';
import * as BR from '../api';
import { ensureKeys, encryptMessage, decryptMessage } from '../lib/crypto';

const Ic = {
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>,
  lock: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>,
};

function authHeaders() {
  const token = localStorage.getItem('br-session');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MessagesModal({ onClose, initialUsername = null }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [newUsername, setNewUsername] = useState(initialUsername || '');
  const [suggestions, setSuggestions] = useState([]);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [starting, setStarting] = useState(false);
  const [error, setError] = useState('');
  const [secureReady, setSecureReady] = useState(false);
  const startedInitial = useRef(false);
  const searchTimer = useRef(null);
  const bottomRef = useRef(null);

  const loadConversations = async () => {
    try {
      const r = await fetch('/api/community/conversations', { headers: authHeaders() });
      if (!r.ok) throw new Error('load failed');
      const d = await r.json();
      const list = d.conversations || [];
      const decrypted = await Promise.all(list.map(async (c) => ({
        ...c,
        last_preview: c.last_body ? await decryptMessage(c.last_body, user?.id) : null,
      })));
      setConversations(decrypted);
      return decrypted;
    } catch { setError('Could not load conversations'); return []; }
  };

  useEffect(() => { loadConversations(); }, [user?.id]);

  useEffect(() => {
    if (!user) return;
    ensureKeys(user).then(() => setSecureReady(true)).catch((err) => {
      console.error(err);
      setError('Secure messaging setup failed');
    });
  }, [user]);

  useEffect(() => {
    if (!activeId) return;
    const load = async () => {
      const r = await fetch(`/api/community/conversations/${activeId}/messages?limit=100`, { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        setMessages(await Promise.all((d.messages || []).map(async (m) => ({
          ...m,
          decryptedBody: await decryptMessage(m.body, user?.id),
        }))));
      }
    };
    load();
    const id = setInterval(load, 5000);
    return () => clearInterval(id);
  }, [activeId, user?.id]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeId || !user) return;
    setError('');

    const activeConv = conversations.find((c) => c.id === activeId);
    if (!activeConv) return;
    if (!activeConv.other_public_key) {
      setError('This user has not set up secure messaging yet.');
      return;
    }

    try {
      await ensureKeys(user);
      if (!user.public_key) throw new Error('Your encryption keys are not ready');

      const encrypted = await encryptMessage(
        text.trim(),
        activeConv.other_public_key,
        user.public_key,
        activeConv.other_user_id,
        user.id
      );

      const r = await fetch(`/api/community/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ body: encrypted }),
      });
      if (!r.ok) throw new Error('send failed');
      const d = await r.json();
      setText('');
      setMessages((prev) => [...prev, {
        id: d.id,
        sender_id: user.id,
        body: encrypted,
        decryptedBody: text.trim(),
        created_at: d.created_at,
        display_name: user.display_name,
        username: user.username,
        avatar_url: user.avatar_url,
      }]);
      setConversations((prev) => prev.map((c) => c.id === activeId
        ? { ...c, last_body: encrypted, last_preview: text.trim(), last_at: d.created_at }
        : c));
    } catch (err) {
      setError(err.message || 'Send failed');
    }
  };

  const startConversation = async (target) => {
    if (!user) return;
    let resolved = target;
    if (typeof target === 'string') {
      const username = target.trim();
      if (!username) return;
      setStarting(true); setError('');
      try {
        const lookup = await fetch(`/api/auth/users/${encodeURIComponent(username)}`, { headers: authHeaders() });
        if (!lookup.ok) throw new Error('User not found');
        resolved = (await lookup.json()).user;
      } catch (err) {
        setError(err.message || 'Start failed');
        setStarting(false);
        return;
      }
    }
    setStarting(true); setError('');
    try {
      const r = await fetch('/api/community/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ target_user_id: resolved.id }),
      });
      if (!r.ok) throw new Error('Could not start conversation');
      const { conversation_id } = await r.json();
      await loadConversations();
      setActiveId(conversation_id);
      setNewUsername('');
      setSuggestions([]);
      // merge target public_key in case this conversation was returned but missing key
      setConversations((prev) => prev.map((c) => c.id === conversation_id && !c.other_public_key
        ? { ...c, other_public_key: resolved.public_key }
        : c));
    } catch (err) {
      setError(err.message || 'Start failed');
    }
    setStarting(false);
  };

  const handleStartSubmit = (e) => {
    e.preventDefault();
    startConversation(newUsername);
  };

  useEffect(() => {
    if (initialUsername && user?.id && !startedInitial.current) {
      startedInitial.current = true;
      startConversation(initialUsername);
    }
  }, [initialUsername, user?.id]);

  useEffect(() => {
    if (searchTimer.current) clearTimeout(searchTimer.current);
    const q = newUsername.trim();
    if (q.length < 2) { setSuggestions([]); return; }
    setSuggestLoading(true);
    searchTimer.current = setTimeout(async () => {
      try {
        const d = await BR.searchUsers(q);
        setSuggestions((d.users || []).filter((u) => u.id !== user?.id));
      } catch { setSuggestions([]); }
      setSuggestLoading(false);
    }, 200);
    return () => { if (searchTimer.current) clearTimeout(searchTimer.current); };
  }, [newUsername, user?.id]);

  const activeConv = conversations.find((c) => c.id === activeId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: 'var(--ink)' }}>Messages</div>

        <form onSubmit={handleStartSubmit} style={{ position: 'relative', marginBottom: 10 }}>
          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Search riders to message…" style={{ flex: 1 }} />
            <button type="submit" className="pillbtn" disabled={starting || !newUsername.trim()}>Start</button>
          </div>
          {(suggestions.length > 0 || suggestLoading) && (
            <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 60, background: 'var(--panel-solid)', border: '1px solid var(--line)', borderRadius: 10, overflow: 'hidden', boxShadow: 'var(--shadow)' }}>
              {suggestLoading && <div className="mono" style={{ padding: 8, fontSize: 11, color: 'var(--muted-txt)' }}>Searching…</div>}
              {suggestions.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => startConversation(u)}
                  style={{ width: '100%', textAlign: 'left', padding: '8px 10px', border: 0, borderBottom: '1px solid var(--line)', background: 'transparent', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <div style={{ width: 26, height: 26, borderRadius: '50%', background: 'var(--paper-2)', display: 'grid', placeItems: 'center', color: 'var(--ink)', fontSize: 11, fontWeight: 600, border: '1px solid var(--line)', flex: 'none' }}>
                    {u.avatar_url ? <img src={u.avatar_url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : (u.display_name?.[0] || u.username?.[0] || '?')}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--ink)' }}>{u.display_name || u.username || 'User'}</div>
                    <div className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{u.username}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </form>

        <div style={{ display: 'flex', flex: 1, minHeight: 0, border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ width: 180, borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--paper-2)' }}>
            {conversations.length === 0 && <div className="mono" style={{ padding: 10, fontSize: 11, color: 'var(--muted-txt)' }}>No messages</div>}
            {conversations.map((c) => (
              <button key={c.id} onClick={() => setActiveId(c.id)} style={{ width: '100%', textAlign: 'left', padding: 10, border: 0, borderBottom: '1px solid var(--line)', background: activeId === c.id ? 'var(--green-soft)' : 'transparent', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink)' }}>{c.display_name || c.username || 'User'}</div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--muted-txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 2 }}>@{c.username}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--ink-2)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis', marginTop: 3, opacity: c.last_preview ? 1 : 0.6 }}>
                  {c.last_preview || (c.last_body ? 'Encrypted message' : 'No messages')}
                </div>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {activeId ? (
              <>
                <div style={{ padding: 10, borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 13, display: 'flex', alignItems: 'center', gap: 6 }}>
                  {activeConv?.other_public_key ? Ic.lock : null}
                  {activeConv?.display_name || activeConv?.username || 'Conversation'}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.map((m) => {
                    const isMe = m.sender_id === user?.id;
                    const body = m.decryptedBody ?? (m.body?.startsWith('{') ? 'Encrypted message' : m.body);
                    return (
                      <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '8px 12px', borderRadius: 12, background: isMe ? 'var(--green-soft)' : 'var(--paper-2)', border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                        {!isMe && <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--ink)', marginBottom: 2 }}>{m.display_name || m.username}</div>}
                        {body}
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={send} style={{ padding: 10, borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder={secureReady ? "Type a secure message…" : "Preparing secure keys…"} style={{ flex: 1 }} disabled={!secureReady} />
                  <button type="submit" className="primary" disabled={!text.trim() || !secureReady}>{Ic.send}</button>
                </form>
              </>
            ) : (
              <div style={{ flex: 1, display: 'grid', placeItems: 'center', color: 'var(--muted-txt)', fontSize: 13 }}>Select a conversation or start one</div>
            )}
          </div>
        </div>
        {error && <div className="field-error" style={{ marginTop: 8 }}>{error}</div>}
      </div>
    </div>
  );
}
