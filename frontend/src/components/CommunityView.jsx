import { useEffect, useRef, useState } from 'react';
import maplibregl from 'maplibre-gl';
import * as BR from '../api';
import { useAuth } from '../AuthContext';
import PublicProfile from './PublicProfile';
import ReportModal from './ReportModal';

const Ic = {
  heart: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-.1.1-.1-.1a5.5 5.5 0 0 0-7.7 7.7l.1.1L12 21l7.7-8.6.1-.1a5.5 5.5 0 0 0 0-7.7z"/></svg>,
  heartFill: <svg viewBox="0 0 24 24" fill="currentColor" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.8 4.6a5.5 5.5 0 0 0-7.7 0l-.1.1-.1-.1a5.5 5.5 0 0 0-7.7 7.7l.1.1L12 21l7.7-8.6.1-.1a5.5 5.5 0 0 0 0-7.7z"/></svg>,
  comment: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H6l-3 3V11.5a8.5 8.5 0 0 1 17 0z"/></svg>,
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
  plus: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>,
  camera: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="7" width="18" height="14" rx="2"/><circle cx="12" cy="14" r="3"/><path d="M5 11l2-3h3l1 1h5l2-3"/></svg>,
  spinner: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v4M12 18v4M2 12h4M18 12h4M5 5l3 3M16 16l3 3M19 5l-3 3M8 16l-3 3"/></svg>,
  user: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 4-6 8-6s8 2 8 6"/></svg>,
  pin: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2a7 7 0 0 0-7 7c0 2.4 1.4 4.6 3 7l4 6 4-6c1.6-2.4 3-4.6 3-7a7 7 0 0 0-7-7z"/><circle cx="12" cy="9" r="2.2"/></svg>,
};

const CATEGORIES = [
  { id: 'general', label: 'General' },
  { id: 'photo', label: 'Photo' },
  { id: 'report', label: 'Trail report' },
  { id: 'hazard', label: 'Hazard' },
  { id: 'flooding', label: 'Flooding' },
  { id: 'mud', label: 'Mud' },
  { id: 'wildlife', label: 'Wildlife' },
  { id: 'route', label: 'Route' },
  { id: 'meetup', label: 'Meetup' },
  { id: 'gear', label: 'Gear' },
  { id: 'question', label: 'Question' },
];

function timeAgo(iso) {
  const s = Math.max(1, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (s < 60) return s + 's';
  if (s < 3600) return Math.round(s / 60) + 'm';
  if (s < 86400) return Math.round(s / 3600) + 'h';
  return Math.round(s / 86400) + 'd';
}

function AuthModal({ onClose, onUser }) {
  const [mode, setMode] = useState('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');
  const [devCode, setDevCode] = useState('');

  const request = async (e) => {
    e.preventDefault();
    if (!email.includes('@')) return setErr('Enter a valid email');
    setBusy(true); setErr('');
    try {
      const d = await BR.requestCode(email);
      setMode('code');
      if (d.dev_code) setDevCode(d.dev_code);
    } catch { setErr('Could not send code'); }
    setBusy(false);
  };

  const verify = async (e) => {
    e.preventDefault();
    if (!code.trim()) return;
    setBusy(true); setErr('');
    try {
      const d = await BR.verifyCode(email, code);
      const me = await BR.fetchMe();
      onUser(me);
      onClose();
    } catch { setErr('Invalid code'); }
    setBusy(false);
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 360 }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 6, color: 'var(--ink)' }}>Sign in to post</div>
        <div style={{ fontSize: 12.5, color: 'var(--ink-2)', marginBottom: 16, lineHeight: 1.4 }}>No password needed. We email (or show locally) a short login code.</div>
        {mode === 'email' ? (
          <form onSubmit={request}>
            <input type="email" value={email} placeholder="your@email.com" onChange={(e) => setEmail(e.target.value)} autoFocus />
            {err && <div className="field-error" style={{ marginTop: 6 }}>{err}</div>}
            <button className="primary" style={{ marginTop: 14, width: '100%' }} disabled={busy}>{busy ? <span className="spin">{Ic.spinner}</span> : 'Send code'}</button>
          </form>
        ) : (
          <form onSubmit={verify}>
            <input value={code} placeholder="6-digit code" onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} autoFocus />
            {devCode && <div className="mono" style={{ marginTop: 8, padding: 8, background: 'var(--paper-2)', borderRadius: 8, fontSize: 12, color: 'var(--green)' }}>Dev code: <b>{devCode}</b></div>}
            {err && <div className="field-error" style={{ marginTop: 6 }}>{err}</div>}
            <button className="primary" style={{ marginTop: 14, width: '100%' }} disabled={busy || code.length < 4}>{busy ? <span className="spin">{Ic.spinner}</span> : 'Sign in'}</button>
            <button type="button" className="pillbtn" style={{ marginTop: 8, width: '100%' }} onClick={() => setMode('email')}>Use different email</button>
          </form>
        )}
      </div>
    </div>
  );
}

function CreatePostModal({ onClose, mapObj, draftLocation, onPickLocationStart, onCreated }) {
  const [user, setUser] = useState(null);
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [location, setLocation] = useState(draftLocation || null);
  const [media, setMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    BR.fetchMe().then(setUser);
    if (draftLocation) {
      setLocation(draftLocation);
    } else if (mapObj.current) {
      const c = mapObj.current.getCenter();
      setLocation({ lat: c.lat, lon: c.lng });
    }
  }, [mapObj, draftLocation]);

  const pickFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    try {
      const up = await BR.uploadMedia(file);
      setMedia((m) => [...m, { key: up.key, url: up.url, contentType: up.contentType, fileName: up.fileName }]);
    } catch (err) { setError('Upload failed'); console.error(err); }
    setBusy(false);
  };

  const submit = async (e) => {
    e.preventDefault();
    const text = body.trim();
    if (!text && media.length === 0) return;
    setBusy(true); setError('');
    try {
      await BR.createPost({
        title: title.trim() || undefined,
        body: text,
        category,
        lat: location?.lat,
        lon: location?.lon,
        mediaKeys: media.map((m) => m.key),
      });
      onCreated();
      onClose();
    } catch (err) {
      setError('Could not post. Sign in?');
    }
    setBusy(false);
  };

  const isImage = (ct) => (ct || '').startsWith('image');

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw, 460px)', maxHeight: 'min(90vh, 720px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: 'var(--ink)', flex: 'none' }}>New post</div>

        <form id="create-post-form" onSubmit={submit} style={{ overflowY: 'auto', paddingRight: 6, flex: 1, minHeight: 0 }}>
          <input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 8 }} />
          <textarea placeholder="What did you see on the trail?" value={body} onChange={(e) => setBody(e.target.value)} rows={4} style={{ resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
            {CATEGORIES.map((c) => (
              <span key={c.id} className={"chip" + (category === c.id ? " active" : "")} onClick={() => setCategory(c.id)} style={{ fontSize: 11.5 }}>{c.label}</span>
            ))}
          </div>

          {location && (
            <div style={{ fontSize: 12, color: 'var(--muted-txt)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10, flexWrap: 'wrap' }}>
              <span style={{ width: 14, height: 14, display: 'grid', placeItems: 'center' }}>{Ic.pin}</span> Pin at {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
              <button type="button" className="pillbtn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => { const c = mapObj.current?.getCenter(); if (c) setLocation({ lat: c.lat, lon: c.lng }); }}>Use map center</button>
              <button type="button" className="pillbtn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={onPickLocationStart}>Pick on map</button>
            </div>
          )}

          {media.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(70px, 1fr))', gap: 6, marginBottom: 12 }}>
              {media.map((m, i) => (
                <div key={m.key} style={{ position: 'relative', aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
                  {isImage(m.contentType) ? <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <div className="mono" style={{ padding: 8, fontSize: 10, wordBreak: 'break-all' }}>{m.fileName}</div>}
                  <button type="button" className="io-clear" onClick={() => setMedia((arr) => arr.filter((_, j) => j !== i))} style={{ position: 'absolute', top: 2, right: 2, background: 'rgba(0,0,0,.6)', color: '#fff', borderRadius: '50%', width: 20, height: 20, display: 'grid', placeItems: 'center' }}>{Ic.x}</button>
                </div>
              ))}
            </div>
          )}

          <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <button type="button" className="pillbtn" onClick={() => fileInputRef.current?.click()}>{Ic.camera} Photo/video</button>
            <input type="file" ref={fileInputRef} accept="image/*,video/*" onChange={pickFile} style={{ display: 'none' }} />
            {busy && <span className="spin" style={{ color: 'var(--muted-txt)' }}>{Ic.spinner}</span>}
          </div>

          {error && <div className="field-error" style={{ marginTop: 10 }}>{error}</div>}
        </form>

        <button type="submit" form="create-post-form" className="primary" style={{ marginTop: 12, width: '100%', flex: 'none' }} disabled={busy || (!body.trim() && media.length === 0)}>
          {busy ? <span className="spin">{Ic.spinner}</span> : 'Post'}
        </button>
      </div>
    </div>
  );
}

function PostCard({ post, me, onOpen, onMutate, mapObj, onShowProfile, onReport }) {
  const [liking, setLiking] = useState(false);
  const isMine = me && post.userId === me.id;

  const toggleLike = async (e) => {
    e.stopPropagation();
    if (!me || liking) return;
    try {
      setLiking(true);
      await BR.likePost(post.id, !post.likedByMe);
      onMutate();
    } catch (err) { console.error(err); }
    setLiking(false);
  };

  return (
    <div className="trail" style={{ display: 'block', padding: 14, cursor: 'pointer' }} onClick={() => onOpen(post.id)}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
          <button onClick={(e) => { e.stopPropagation(); post.author?.username && onShowProfile?.(post.author.username); }} style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--paper-2)', display: 'grid', placeItems: 'center', color: 'var(--muted-txt)', border: '1px solid var(--line)', overflow: 'hidden', padding: 0, cursor: 'pointer' }}>
            {post.author?.avatarUrl ? <img src={post.author.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : Ic.user}
          </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <button
            className="text-btn"
            onClick={(e) => { e.stopPropagation(); post.author?.username && onShowProfile?.(post.author.username); }}
            style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
          >{post.author?.displayName ?? post.author?.username ?? 'Anonymous'}</button>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-txt)' }}>{timeAgo(post.createdAt)} ago · {CATEGORIES.find((c) => c.id === post.category)?.label ?? post.category}</div>
        </div>
        {post.lat != null && (
          <button className="io-clear" onClick={(e) => { e.stopPropagation(); mapObj.current?.flyTo({ center: [post.lon, post.lat], zoom: 15, duration: 700 }); }} title="Fly to map" style={{ color: 'var(--green)', width: 20, height: 20, display: 'grid', placeItems: 'center' }}>
            {Ic.pin}
          </button>
        )}
        {isMine && <button className="io-clear" onClick={async (e) => { e.stopPropagation(); if (confirm('Delete this post?')) { await BR.deletePost(post.id); onMutate(); } }} title="Delete">{Ic.x}</button>}
      </div>

      {post.title && <div style={{ fontWeight: 700, fontSize: 14, color: 'var(--ink)', marginBottom: 6 }}>{post.title}</div>}
      <div style={{ fontSize: 13, color: 'var(--ink-2)', lineHeight: 1.45, whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{post.body}</div>

      {post.media?.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: `repeat(${Math.min(post.media.length, 3)}, 1fr)`, gap: 6, marginTop: 10 }}>
          {post.media.slice(0, 6).map((m) => (
            <div key={m.key} style={{ aspectRatio: '1', borderRadius: 8, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
              {m.contentType?.startsWith('image') ? <img src={m.url} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} loading="lazy" /> : <div className="mono" style={{ padding: 8, fontSize: 10 }}>{m.fileName}</div>}
            </div>
          ))}
        </div>
      )}

      <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginTop: 10, color: 'var(--muted-txt)' }}>
        <button onClick={toggleLike} disabled={!me} style={{ display: 'flex', alignItems: 'center', gap: 5, background: 'transparent', border: 0, color: post.likedByMe ? 'var(--orange)' : 'var(--muted-txt)', cursor: 'pointer', fontSize: 12.5 }}>
          <span style={{ width: 17, height: 17, display: 'block' }}>{post.likedByMe ? Ic.heartFill : Ic.heart}</span> {post.likeCount}
        </button>
        <span style={{ display: 'flex', alignItems: 'center', gap: 5, fontSize: 12.5 }}>
          <span style={{ width: 17, height: 17, display: 'block' }}>{Ic.comment}</span> {post.commentCount}
        </span>
        {me && (
          <button onClick={(e) => { e.stopPropagation(); onReport({ type: 'post', id: post.id }); }} title="Report" style={{ marginLeft: 'auto', display: 'grid', placeItems: 'center', width: 22, height: 22, background: 'transparent', border: 0, color: 'var(--muted-txt)', cursor: 'pointer' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>
          </button>
        )}
        {!me && <span className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', marginLeft: 'auto' }}>sign in to like</span>}
      </div>
    </div>
  );
}

function PostDetail({ id, onClose, me, mapObj, onShowProfile, onReport }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [comment, setComment] = useState('');
  const [posting, setPosting] = useState(false);

  const load = async () => {
    try { setData(await BR.fetchPost(id)); }
    catch (e) { console.error(e); }
    setLoading(false);
  };
  useEffect(() => { load(); }, [id]);

  const submitComment = async (e) => {
    e.preventDefault();
    if (!comment.trim()) return;
    setPosting(true);
    try { await BR.commentPost(id, comment); setComment(''); await load(); }
    catch (err) { console.error(err); }
    setPosting(false);
  };

  if (loading) return <div className="trail" style={{ padding: 30, textAlign: 'center', color: 'var(--muted-txt)' }}><span className="spin">{Ic.spinner}</span></div>;
  if (!data) return <div className="trail" style={{ padding: 20 }}>Could not load post.</div>;
  const p = data.post;

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(92vw, 460px)', maxHeight: 'min(90vh, 720px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>

        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12, flex: 'none' }}>
          <button onClick={() => p.author?.username && onShowProfile?.(p.author.username)} style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--paper-2)', display: 'grid', placeItems: 'center', color: 'var(--muted-txt)', border: '1px solid var(--line)', overflow: 'hidden', padding: 0, cursor: 'pointer' }}>
            {p.author?.avatarUrl ? <img src={p.author.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : Ic.user}
          </button>
          <div>
            <button
              onClick={() => p.author?.username && onShowProfile?.(p.author.username)}
              style={{ display: 'block', fontWeight: 700, fontSize: 13, color: 'var(--ink)', padding: 0, border: 0, background: 'transparent', cursor: 'pointer', textAlign: 'left' }}
            >{p.author?.displayName ?? p.author?.username ?? 'Anonymous'}</button>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-txt)' }}>{timeAgo(p.createdAt)} ago · {CATEGORIES.find((c) => c.id === p.category)?.label ?? p.category}</div>
          </div>
          {p.lat != null && (
            <button className="pillbtn" onClick={() => { mapObj.current?.flyTo({ center: [p.lon, p.lat], zoom: 15 }); onClose(); }} style={{ marginLeft: 'auto', padding: '6px 9px', display: 'flex', alignItems: 'center', gap: 5 }}><span style={{ width: 14, height: 14, display: 'grid', placeItems: 'center' }}>{Ic.pin}</span> Map</button>
          )}
          {me && (
            <button className="pillbtn" onClick={() => onReport({ type: 'post', id: p.id })} style={{ padding: '6px 9px', display: 'flex', alignItems: 'center', gap: 5 }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg> Report
            </button>
          )}
        </div>

        <div style={{ overflowY: 'auto', paddingRight: 6, flex: 1, minHeight: 0 }}>
          {p.title && <div style={{ fontWeight: 700, fontSize: 16, color: 'var(--ink)', marginBottom: 8 }}>{p.title}</div>}
          <div style={{ fontSize: 13.5, lineHeight: 1.5, color: 'var(--ink-2)', whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>{p.body}</div>

          {p.media?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8, marginTop: 14 }}>
              {p.media.map((m) => (
                <div key={m.key} style={{ borderRadius: 10, overflow: 'hidden', border: '1px solid var(--line)', background: 'var(--paper-2)' }}>
                  {m.contentType?.startsWith('image') ? <img src={m.url} alt="" style={{ width: '100%', display: 'block' }} /> : <div className="mono" style={{ padding: 12, fontSize: 11 }}>{m.fileName}</div>}
                </div>
              ))}
            </div>
          )}

          <div style={{ borderTop: '1px solid var(--line)', margin: '16px 0 12px', paddingTop: 12 }}>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-txt)', marginBottom: 8 }}>{p.commentCount} comment{p.commentCount !== 1 ? 's' : ''}</div>
            {data.comments.map((c) => (
              <div key={c.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)' }}>
                <button
                  className="text-btn"
                  onClick={() => c.author?.username && onShowProfile?.(c.author.username)}
                  style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink)', padding: 0, border: 0, background: 'transparent', cursor: 'pointer' }}
                >{c.author?.displayName ?? 'Anonymous'}</button>
                <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{c.body}</div>
                <div className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', marginTop: 2, display: 'flex', alignItems: 'center', gap: 10 }}>
                  <span>{timeAgo(c.createdAt)} ago</span>
                  {me && <button onClick={() => onReport({ type: 'comment', id: c.id })} style={{ background: 'transparent', border: 0, color: 'var(--muted-txt)', cursor: 'pointer', fontSize: 10, padding: 0 }}>Report</button>}
                </div>
              </div>
            ))}
          </div>

          {me ? (
            <form onSubmit={submitComment}>
              <textarea placeholder="Add a comment…" value={comment} onChange={(e) => setComment(e.target.value)} rows={3} />
              <button type="submit" className="primary" style={{ marginTop: 8, width: '100%' }} disabled={posting || !comment.trim()}>{posting ? <span className="spin">{Ic.spinner}</span> : 'Comment'}</button>
            </form>
          ) : <div className="mono" style={{ fontSize: 12, color: 'var(--muted-txt)' }}>Sign in to comment.</div>}
        </div>
      </div>
    </div>
  );
}

export default function CommunityView({ mapObj, onMessage }) {
  const { user, refreshUser } = useAuth();
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [offset, setOffset] = useState(0);
  const [pickingLocation, setPickingLocation] = useState(false);
  const [draftLocation, setDraftLocation] = useState(null);
  const [profileUsername, setProfileUsername] = useState(null);
  const [reportTarget, setReportTarget] = useState(null);
  const perPage = 20;
  const markersRef = useRef([]);
  const pickHandlerRef = useRef(null);
  const postsReqId = useRef(0);

  const clearMarkers = () => {
    markersRef.current.forEach(m => m.remove());
    markersRef.current = [];
  };

  useEffect(() => {
    const map = mapObj.current;
    if (!map) return;
    clearMarkers();
    for (const post of posts) {
      if (post.lat == null || post.lon == null) continue;
      const el = document.createElement('div');
      el.style.cssText = 'width:22px;height:22px;border-radius:50% 50% 50% 0;background:var(--orange);border:2px solid #fff;box-shadow:0 2px 6px rgba(0,0,0,.35);transform:rotate(-45deg);transform-origin:50% 50%;cursor:pointer;';
      const cat = CATEGORIES.find(c => c.id === post.category)?.label || post.category || 'Post';
      const popup = new maplibregl.Popup({ offset: 10, closeButton: false }).setHTML(
        `<div style="font-family:var(--font-body),system-ui,sans-serif;font-size:12px;color:var(--ink);max-width:180px;">` +
        `<div style="font-weight:600;margin-bottom:3px;">${post.title || post.body.slice(0, 40) || 'Post'}${(post.title || post.body).length > 40 ? '…' : ''}</div>` +
        `<div style="font-size:11px;color:var(--muted-txt);">${cat} · by ${post.author?.displayName || post.author?.username || 'someone'}</div>` +
        `</div>`
      );
      const mk = new maplibregl.Marker({ element: el })
        .setLngLat([post.lon, post.lat])
        .setPopup(popup)
        .addTo(map);
      el.addEventListener('click', (e) => {
        e.stopPropagation();
        setDetailId(post.id);
      });
      markersRef.current.push(mk);
    }
    return () => clearMarkers();
  }, [posts]);

  useEffect(() => {
    const map = mapObj.current;
    if (!map || !pickingLocation) return;
    const handler = (e) => {
      setDraftLocation({ lat: e.lngLat.lat, lon: e.lngLat.lng });
      setPickingLocation(false);
      setShowCreate(true);
    };
    map.on('click', handler);
    pickHandlerRef.current = handler;
    return () => { if (map && pickHandlerRef.current) map.off('click', pickHandlerRef.current); };
  }, [pickingLocation]);

  const loadPosts = async (reset = false, cat = category) => {
    const curReqId = ++postsReqId.current;
    const curOffset = reset ? 0 : offset;
    setLoading(true);
    try {
      const d = await BR.fetchPosts({ limit: perPage, offset: curOffset, category: cat || undefined });
      if (curReqId !== postsReqId.current) return;
      setPosts(prev => reset ? d.posts : [...prev, ...(d.posts || [])]);
      setTotal(d.total);
      setOffset(curOffset + (d.posts?.length || 0));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadPosts(true); }, []);

  useEffect(() => { loadPosts(true); }, [category]);

  const onMutate = () => { postsReqId.current++; setPosts([]); setOffset(0); loadPosts(true, category); };

  return (
    <div>
      {pickingLocation && (
        <div style={{ position: 'fixed', top: 76, left: '50%', transform: 'translateX(-50%)', zIndex: 80, display: 'flex', alignItems: 'center', gap: 12, padding: '10px 14px', background: 'var(--panel-solid)', border: '1px solid var(--line)', borderRadius: 12, boxShadow: 'var(--shadow)', fontSize: 13, color: 'var(--ink)' }}>
          <span>Click the map to place your pin.</span>
          <button className="pillbtn" onClick={() => { setPickingLocation(false); if (pickHandlerRef.current && mapObj.current) mapObj.current.off('click', pickHandlerRef.current); }} style={{ padding: '4px 10px', fontSize: 12 }}>Cancel</button>
        </div>
      )}
      <div style={{ marginBottom: 12, fontSize: 12.5, color: 'var(--muted-txt)', lineHeight: 1.4 }}>
        Trail reports, ride brags, mud holes, snakes, meetups, and gear talk. Be kind.
      </div>

      <button className="primary" style={{ width: '100%', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => user ? setShowCreate(true) : setShowAuth(true)}>
        <span style={{ width: 18, height: 18, display: 'grid', placeItems: 'center' }}>{Ic.plus}</span> New post
      </button>

      {!user && (
        <div className="trail" style={{ padding: 10, marginBottom: 12, fontSize: 12, color: 'var(--ink-2)' }}>
          <b>Not signed in.</b> You can read posts, but sign in to post, like, or comment.
          <button className="pillbtn" style={{ marginTop: 8, width: '100%' }} onClick={() => setShowAuth(true)}>Sign in / sign up</button>
        </div>
      )}

      <div className="chips" style={{ marginBottom: 10 }}>
        <span className={"chip" + (category === '' ? " active" : "")} onClick={() => setCategory('')}>All</span>
        {CATEGORIES.map((c) => (
          <span key={c.id} className={"chip" + (category === c.id ? " active" : "")} onClick={() => setCategory(c.id)}>{c.label}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {posts.map((p) => (
          <PostCard key={p.id} post={{ ...p, likedByMe: p.likedByMe }} me={user} onOpen={setDetailId} onMutate={onMutate} mapObj={mapObj} onShowProfile={setProfileUsername} onReport={setReportTarget} />
        ))}
        {loading && <div className="trail" style={{ padding: 20, textAlign: 'center', color: 'var(--muted-txt)' }}><span className="spin">{Ic.spinner}</span></div>}
        {!loading && posts.length === 0 && (
          <div className="trail" style={{ padding: 24, textAlign: 'center', color: 'var(--muted-txt)', fontSize: 13 }}>
            No posts yet. {user ? 'Be the first.' : 'Sign in and be the first.'}
          </div>
        )}
        {!loading && posts.length < total && (
          <button className="pillbtn" style={{ width: '100%' }} onClick={() => loadPosts(false)}>Load more</button>
        )}
      </div>

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onUser={() => { refreshUser(); setShowAuth(false); }} />}
      {showCreate && (
        <CreatePostModal
          mapObj={mapObj}
          draftLocation={draftLocation}
          onClose={() => { setShowCreate(false); setDraftLocation(null); }}
          onPickLocationStart={() => { setDraftLocation(null); setShowCreate(false); setPickingLocation(true); }}
          onCreated={onMutate}
        />
      )}
      {detailId && <PostDetail id={detailId} onClose={() => setDetailId(null)} me={user} mapObj={mapObj} onShowProfile={setProfileUsername} onReport={setReportTarget} />}
      {profileUsername && <PublicProfile username={profileUsername} onClose={() => setProfileUsername(null)} onMessage={(username) => { setProfileUsername(null); onMessage?.(username); }} />}
      {reportTarget && (
        <ReportModal
          targetType={reportTarget.type}
          targetId={reportTarget.id}
          onClose={() => setReportTarget(null)}
          onSubmit={async (reason) => {
            if (reportTarget.type === 'post') await BR.reportPost(reportTarget.id, reason);
            else await BR.reportComment(reportTarget.id, reason);
          }}
        />
      )}
    </div>
  );
}
