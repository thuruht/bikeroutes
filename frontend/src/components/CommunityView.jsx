import { useEffect, useRef, useState } from 'react';
import * as BR from '../api';

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
  { id: 'report', label: 'Report' },
  { id: 'hazard', label: 'Hazard' },
  { id: 'mudosnake', label: 'Mud/snake' },
  { id: 'flooding', label: 'Flooding' },
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

function CreatePostModal({ onClose, mapObj, onCreated }) {
  const [user, setUser] = useState(null);
  const [body, setBody] = useState('');
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('general');
  const [location, setLocation] = useState(null);
  const [media, setMedia] = useState([]);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  useEffect(() => {
    BR.fetchMe().then(setUser);
    if (mapObj.current) {
      const c = mapObj.current.getCenter();
      setLocation({ lat: c.lat, lon: c.lng });
    }
  }, [mapObj]);

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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 420, maxHeight: '85vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: 'var(--ink)' }}>New post</div>
        <form onSubmit={submit}>
          <input placeholder="Title (optional)" value={title} onChange={(e) => setTitle(e.target.value)} style={{ marginBottom: 8 }} />
          <textarea placeholder="What did you see on the trail?" value={body} onChange={(e) => setBody(e.target.value)} rows={5} style={{ resize: 'vertical' }} />

          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', margin: '10px 0' }}>
            {CATEGORIES.map((c) => (
              <span key={c.id} className={"chip" + (category === c.id ? " active" : "")} onClick={() => setCategory(c.id)} style={{ fontSize: 11.5 }}>{c.label}</span>
            ))}
          </div>

          {location && (
            <div style={{ fontSize: 12, color: 'var(--muted-txt)', display: 'flex', alignItems: 'center', gap: 6, marginBottom: 10 }}>
              {Ic.pin} Pin at {location.lat.toFixed(4)}, {location.lon.toFixed(4)}
              <button type="button" className="pillbtn" style={{ padding: '4px 8px', fontSize: 11 }} onClick={() => { const c = mapObj.current?.getCenter(); if (c) setLocation({ lat: c.lat, lon: c.lng }); }}>Use map center</button>
            </div>
          )}

          {media.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(80px, 1fr))', gap: 8, marginBottom: 12 }}>
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
          <button type="submit" className="primary" style={{ marginTop: 14, width: '100%' }} disabled={busy || (!body.trim() && media.length === 0)}>
            {busy ? <span className="spin">{Ic.spinner}</span> : 'Post'}
          </button>
        </form>
      </div>
    </div>
  );
}

function PostCard({ post, me, onOpen, onMutate }) {
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
        <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--paper-2)', display: 'grid', placeItems: 'center', color: 'var(--muted-txt)', border: '1px solid var(--line)', overflow: 'hidden' }}>
          {post.author?.avatarUrl ? <img src={post.author.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : Ic.user}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--ink)' }}>{post.author?.displayName ?? post.author?.username ?? 'Anonymous'}</div>
          <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-txt)' }}>{timeAgo(post.createdAt)} ago · {CATEGORIES.find((c) => c.id === post.category)?.label ?? post.category}</div>
        </div>
        {post.lat != null && <span style={{ color: 'var(--green)' }}>{Ic.pin}</span>}
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
        {!me && <span className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', marginLeft: 'auto' }}>sign in to like</span>}
      </div>
    </div>
  );
}

function PostDetail({ id, onClose, me, mapObj }) {
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
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 460, maxHeight: '85vh', overflow: 'auto' }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 12 }}>
          <div style={{ width: 34, height: 34, borderRadius: '50%', background: 'var(--paper-2)', display: 'grid', placeItems: 'center', color: 'var(--muted-txt)', border: '1px solid var(--line)', overflow: 'hidden' }}>
            {p.author?.avatarUrl ? <img src={p.author.avatarUrl} alt="" style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : Ic.user}
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--ink)' }}>{p.author?.displayName ?? p.author?.username ?? 'Anonymous'}</div>
            <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-txt)' }}>{timeAgo(p.createdAt)} ago · {CATEGORIES.find((c) => c.id === p.category)?.label ?? p.category}</div>
          </div>
          {p.lat != null && (
            <button className="pillbtn" onClick={() => { mapObj.current?.flyTo({ center: [p.lon, p.lat], zoom: 15 }); onClose(); }} style={{ marginLeft: 'auto', padding: '6px 9px' }}>{Ic.pin} Map</button>
          )}
        </div>

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
              <div style={{ fontWeight: 600, fontSize: 12, color: 'var(--ink)' }}>{c.author?.displayName ?? 'Anonymous'}</div>
              <div style={{ fontSize: 12.5, color: 'var(--ink-2)', lineHeight: 1.4, whiteSpace: 'pre-wrap' }}>{c.body}</div>
              <div className="mono" style={{ fontSize: 10, color: 'var(--muted-txt)', marginTop: 2 }}>{timeAgo(c.createdAt)} ago</div>
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
  );
}

export default function CommunityView({ mapObj }) {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState('');
  const [showAuth, setShowAuth] = useState(false);
  const [showCreate, setShowCreate] = useState(false);
  const [detailId, setDetailId] = useState(null);
  const [offset, setOffset] = useState(0);
  const perPage = 20;

  const loadUser = async () => { setUser(await BR.fetchMe()); };

  const loadPosts = async (reset = false, cat = category) => {
    setLoading(true);
    const curOffset = reset ? 0 : offset;
    try {
      const d = await BR.fetchPosts({ limit: perPage, offset: curOffset, category: cat || undefined });
      setPosts(reset ? d.posts : [...posts, ...d.posts]);
      setTotal(d.total);
      setOffset(curOffset + (d.posts?.length || 0));
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { loadUser(); loadPosts(true); }, []);

  useEffect(() => { loadPosts(true); }, [category]);

  const onMutate = () => { loadPosts(true, category); };

  return (
    <div>
      <div style={{ marginBottom: 12, fontSize: 12.5, color: 'var(--muted-txt)', lineHeight: 1.4 }}>
        Trail reports, ride brags, mud holes, snakes, meetups, and gear talk. Be kind.
      </div>

      <button className="primary" style={{ width: '100%', marginBottom: 14, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8 }} onClick={() => user ? setShowCreate(true) : setShowAuth(true)}>
        {Ic.plus} New post
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
          <PostCard key={p.id} post={{ ...p, likedByMe: p.likedByMe }} me={user} onOpen={setDetailId} onMutate={onMutate} />
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

      {showAuth && <AuthModal onClose={() => setShowAuth(false)} onUser={(u) => { setUser(u); setShowAuth(false); loadUser(); }} />}
      {showCreate && <CreatePostModal mapObj={mapObj} onClose={() => setShowCreate(false)} onCreated={onMutate} />}
      {detailId && <PostDetail id={detailId} onClose={() => setDetailId(null)} me={user} mapObj={mapObj} />}
    </div>
  );
}
