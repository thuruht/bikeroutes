import { useEffect, useRef, useState } from 'react';
import { useAuth } from '../AuthContext';

const Ic = {
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  send: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>,
};

function authHeaders() {
  const token = localStorage.getItem('br-session');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export default function MessagesModal({ onClose }) {
  const { user } = useAuth();
  const [conversations, setConversations] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [text, setText] = useState('');
  const [newUsername, setNewUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const loadConversations = async () => {
    try {
      const r = await fetch('/api/community/conversations', { headers: authHeaders() });
      if (!r.ok) throw new Error('load failed');
      const d = await r.json();
      setConversations(d.conversations || []);
    } catch (e) { setError('Could not load conversations'); }
  };

  useEffect(() => { loadConversations(); }, []);

  useEffect(() => {
    if (!activeId) return;
    const load = async () => {
      const r = await fetch(`/api/community/conversations/${activeId}/messages?limit=100`, { headers: authHeaders() });
      if (r.ok) {
        const d = await r.json();
        setMessages(d.messages || []);
      }
    };
    load();
  }, [activeId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages]);

  const send = async (e) => {
    e.preventDefault();
    if (!text.trim() || !activeId) return;
    try {
      const r = await fetch(`/api/community/conversations/${activeId}/messages`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ body: text }),
      });
      if (!r.ok) throw new Error('send failed');
      setText('');
      const d = await r.json();
      setMessages(prev => [...prev, { id: d.id, sender_id: user.id, body: text, created_at: d.created_at, display_name: user.display_name, username: user.username, avatar_url: user.avatar_url }]);
    } catch { setError('Send failed'); }
  };

  const startConversation = async (e) => {
    e.preventDefault();
    if (!newUsername.trim()) return;
    setLoading(true); setError('');
    try {
      const lookup = await fetch(`/api/auth/users/${encodeURIComponent(newUsername)}`, { headers: authHeaders() });
      if (!lookup.ok) throw new Error('User not found');
      const { user: target } = await lookup.json();
      const r = await fetch('/api/community/conversations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', ...authHeaders() },
        body: JSON.stringify({ target_user_id: target.id }),
      });
      if (!r.ok) throw new Error('Could not start conversation');
      const { conversation_id } = await r.json();
      await loadConversations();
      setActiveId(conversation_id);
      setNewUsername('');
    } catch (err) {
      setError(err.message || 'Start failed');
    }
    setLoading(false);
  };

  const activeConv = conversations.find(c => c.id === activeId);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 520, height: '70vh', display: 'flex', flexDirection: 'column' }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: 'var(--ink)' }}>Messages</div>

        <div style={{ display: 'flex', gap: 10, marginBottom: 10 }}>
          <input value={newUsername} onChange={(e) => setNewUsername(e.target.value)} placeholder="Enter username to message" style={{ flex: 1 }} />
          <button className="pillbtn" onClick={startConversation} disabled={loading}>Start</button>
        </div>

        <div style={{ display: 'flex', flex: 1, minHeight: 0, border: '1px solid var(--line)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{ width: 160, borderRight: '1px solid var(--line)', overflowY: 'auto', background: 'var(--paper-2)' }}>
            {conversations.length === 0 && <div className="mono" style={{ padding: 10, fontSize: 11, color: 'var(--muted-txt)' }}>No messages</div>}
            {conversations.map(c => (
              <button key={c.id} onClick={() => setActiveId(c.id)} style={{ width: '100%', textAlign: 'left', padding: 10, border: 0, borderBottom: '1px solid var(--line)', background: activeId === c.id ? 'var(--green-soft)' : 'transparent', cursor: 'pointer' }}>
                <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink)' }}>{c.display_name || c.username || 'User'}</div>
                <div className="mono" style={{ fontSize: 9, color: 'var(--muted-txt)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>@{c.username}</div>
              </button>
            ))}
          </div>

          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            {activeId ? (
              <>
                <div style={{ padding: 10, borderBottom: '1px solid var(--line)', fontWeight: 600, fontSize: 13 }}>
                  {activeConv?.display_name || activeConv?.username || 'Conversation'}
                </div>
                <div style={{ flex: 1, overflowY: 'auto', padding: 10, display: 'flex', flexDirection: 'column', gap: 8 }}>
                  {messages.map(m => {
                    const isMe = m.sender_id === user?.id;
                    return (
                      <div key={m.id} style={{ alignSelf: isMe ? 'flex-end' : 'flex-start', maxWidth: '80%', padding: '8px 12px', borderRadius: 12, background: isMe ? 'var(--green-soft)' : 'var(--paper-2)', border: '1px solid var(--line)', fontSize: 12.5, color: 'var(--ink-2)' }}>
                        {!isMe && <div style={{ fontWeight: 600, fontSize: 11, color: 'var(--ink)', marginBottom: 2 }}>{m.display_name || m.username}</div>}
                        {m.body}
                      </div>
                    );
                  })}
                  <div ref={bottomRef} />
                </div>
                <form onSubmit={send} style={{ padding: 10, borderTop: '1px solid var(--line)', display: 'flex', gap: 8 }}>
                  <input value={text} onChange={(e) => setText(e.target.value)} placeholder="Type a message…" style={{ flex: 1 }} />
                  <button type="submit" className="primary" disabled={!text.trim()}>{Ic.send}</button>
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
