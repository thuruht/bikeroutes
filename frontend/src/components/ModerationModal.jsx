import { useEffect, useState } from 'react';
import * as BR from '../api';

const Ic = {
  x: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>,
};

const STATUSES = ['open', 'resolved', 'dismissed'];

export default function ModerationModal({ onClose }) {
  const [status, setStatus] = useState('open');
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(null);

  const load = async () => {
    setLoading(true);
    try {
      const d = await BR.fetchCommunityReports(status);
      setReports(d.reports || []);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => { load(); }, [status]);

  const act = async (id, action) => {
    setBusy(id + action);
    try {
      if (action === 'resolve') await BR.resolveReport(id, note);
      else if (action === 'dismiss') await BR.dismissReport(id, note);
      await load();
      setNote('');
    } catch (e) { alert('Action failed'); console.error(e); }
    setBusy(null);
  };

  const togglePost = async (postId, currentStatus) => {
    const next = currentStatus === 'hidden' ? 'active' : 'hidden';
    try { await BR.setPostStatus(postId, next); await load(); }
    catch (e) { console.error(e); }
  };

  const toggleComment = async (commentId, currentStatus) => {
    const next = currentStatus === 'hidden' ? 'active' : 'hidden';
    try { await BR.setCommentStatus(commentId, next); await load(); }
    catch (e) { console.error(e); }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()} style={{ width: 'min(96vw, 700px)', maxHeight: 'min(88vh, 800px)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
        <button className="modal-close" onClick={onClose}>{Ic.x}</button>
        <div style={{ fontWeight: 700, fontSize: 18, marginBottom: 12, color: 'var(--ink)', flex: 'none' }}>Community moderation</div>

        <div className="chips" style={{ flex: 'none', marginBottom: 12 }}>
          {STATUSES.map((s) => (
            <span key={s} className={"chip" + (status === s ? " active" : "")} onClick={() => setStatus(s)} style={{ textTransform: 'capitalize' }}>{s}</span>
          ))}
        </div>

        <div style={{ overflowY: 'auto', flex: 1, minHeight: 0 }}>
          {loading && <div className="mono" style={{ padding: 30, textAlign: 'center', color: 'var(--muted-txt)' }}>Loading…</div>}
          {!loading && reports.length === 0 && <div className="mono" style={{ padding: 30, textAlign: 'center', color: 'var(--muted-txt)' }}>No {status} reports.</div>}
          {reports.map((r) => (
            <div key={r.id} style={{ padding: 12, border: '1px solid var(--line)', borderRadius: 12, marginBottom: 10, background: 'var(--paper-2)' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 10, marginBottom: 8 }}>
                <div>
                  <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--ink)' }}>{r.post_id ? 'Post report' : 'Comment report'}</div>
                  <div className="mono" style={{ fontSize: 10.5, color: 'var(--muted-txt)' }}>by {r.reporter_username || r.reporter_display_name || 'Unknown'} · {new Date(r.created_at).toLocaleString()}</div>
                </div>
                <span className="chip active" style={{ fontSize: 10, textTransform: 'uppercase' }}>{r.status}</span>
              </div>
              <div style={{ fontSize: 13, color: 'var(--ink-2)', marginBottom: 8 }}><strong>Reason:</strong> {r.reason}</div>
              {r.post_body && <div style={{ fontSize: 12, color: 'var(--ink-2)', background: 'var(--paper)', padding: 8, borderRadius: 8, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{r.post_body}</div>}
              {r.comment_body && <div style={{ fontSize: 12, color: 'var(--ink-2)', background: 'var(--paper)', padding: 8, borderRadius: 8, marginBottom: 8, whiteSpace: 'pre-wrap' }}>{r.comment_body}</div>}
              {r.moderator_note && <div className="mono" style={{ fontSize: 11, color: 'var(--muted-txt)', marginBottom: 8 }}>Note: {r.moderator_note}</div>}

              <input
                placeholder="Moderator note (optional)"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                style={{ marginBottom: 8, fontSize: 12 }}
              />
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                {status === 'open' && (
                  <>
                    <button className="pillbtn" disabled={busy === r.id + 'resolve'} onClick={() => act(r.id, 'resolve')}>Resolve</button>
                    <button className="pillbtn" disabled={busy === r.id + 'dismiss'} onClick={() => act(r.id, 'dismiss')}>Dismiss</button>
                  </>
                )}
                {r.post_id && <button className="pillbtn" onClick={() => togglePost(r.post_id, r.post_body?.startsWith('[hidden]') ? 'hidden' : 'active')}>Toggle post</button>}
                {r.comment_id && <button className="pillbtn" onClick={() => toggleComment(r.comment_id, r.comment_body?.startsWith('[hidden]') ? 'hidden' : 'active')}>Toggle comment</button>}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
