import { useEffect, useRef, useState } from 'react';

const TIERS = [
  { amount: 5,  label: 'Coffee',        emoji: '☕', desc: 'Keep the servers running' },
  { amount: 10, label: 'Sandwich',      emoji: '🥪', desc: 'Patch a pothole on the map' },
  { amount: 15, label: 'Trail Supporter', emoji: '🗺️', desc: 'Sponsor a trail update' },
  { amount: 25, label: 'Route Builder', emoji: '👕', desc: 'T-shirt reward unlocked' },
  { amount: 50, label: 'Inner Circle',  emoji: '🏔️', desc: 'Hoodie reward unlocked' },
];

let paypalScriptPromise = null;
function loadPayPalScript(clientId, host = 'https://www.paypal.com') {
  if (paypalScriptPromise) return paypalScriptPromise;
  paypalScriptPromise = new Promise((resolve, reject) => {
    const existing = document.getElementById('paypal-sdk');
    if (existing) { resolve(window.paypal); return; }
    const script = document.createElement('script');
    script.id = 'paypal-sdk';
    script.src = `${host}/sdk/js?client-id=${clientId}&currency=USD&intent=capture`;
    script.async = true;
    script.onload = () => resolve(window.paypal);
    script.onerror = () => reject(new Error('Failed to load PayPal SDK'));
    document.body.appendChild(script);
  });
  return paypalScriptPromise;
}

export default function DonatePanel() {
  const [stats, setStats] = useState(null);
  const [config, setConfig] = useState(null);
  const [selected, setSelected] = useState(TIERS[0]);
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState(null);
  const [claim, setClaim] = useState(null);
  const buttonRef = useRef(null);
  const buttonsInstance = useRef(null);

  useEffect(() => {
    Promise.all([
      fetch('/api/donate/stats').then(r => r.json()).catch(() => ({ total_donors: 0, total_raised: 0 })),
      fetch('/api/donate/config').then(r => r.json()).catch(() => ({ clientId: null })),
    ]).then(([s, c]) => { setStats(s); setConfig(c); setLoading(false); });
  }, []);

  useEffect(() => {
    if (!config?.clientId || !buttonRef.current) return;
    if (buttonsInstance.current) { buttonsInstance.current.close(); buttonsInstance.current = null; }

    let cancelled = false;
    loadPayPalScript(config.clientId, config.sdkHost).then((paypal) => {
      if (cancelled) return;
      buttonsInstance.current = paypal.Buttons({
        style: { layout: 'vertical', color: 'gold', shape: 'rect', label: 'pay' },
        createOrder: async () => {
          setStatus(null);
          setClaim(null);
          const r = await fetch('/api/donate/create-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ amount: selected.amount, tier: selected.label }),
          });
          const d = await r.json();
          if (!r.ok || !d.orderID) throw new Error(d.error || 'Could not create order');
          return d.orderID;
        },
        onApprove: async (data) => {
          const r = await fetch('/api/donate/capture-order', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ orderID: data.orderID, tier: selected.label }),
          });
          const d = await r.json();
          if (r.ok && d.status === 'completed') {
            setStatus({ ok: true, message: d.message || 'Thank you for supporting open cycling maps!' });
            if (d.claimToken) setClaim(d.claimToken);
            setStats(prev => prev ? { ...prev, total_donors: prev.total_donors + 1, total_raised: prev.total_raised + selected.amount } : prev);
          } else {
            setStatus({ ok: false, message: d.error || 'Payment could not be completed.' });
          }
        },
        onError: (err) => {
          setStatus({ ok: false, message: err?.message || 'PayPal checkout error.' });
        },
      });
      buttonsInstance.current.render(buttonRef.current);
    }).catch((e) => {
      setStatus({ ok: false, message: e.message || 'Could not load PayPal.' });
    });

    return () => { cancelled = true; if (buttonsInstance.current) { buttonsInstance.current.close(); buttonsInstance.current = null; } };
  }, [config?.clientId, selected]);

  if (loading) return <div className="mono" style={{ color: 'var(--muted-txt)', fontSize: 12, padding: '10px 0' }}>Loading donation info…</div>;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
      {stats && (
        <div style={{ display: 'flex', gap: 12 }}>
          <div style={{ flex: 1, padding: 10, background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>${Number(stats.total_raised || 0).toFixed(0)}</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>Raised</div>
          </div>
          <div style={{ flex: 1, padding: 10, background: 'var(--paper-2)', border: '1px solid var(--line)', borderRadius: 10 }}>
            <div className="mono" style={{ fontSize: 18, fontWeight: 700, color: 'var(--ink)' }}>{stats.total_donors || 0}</div>
            <div style={{ fontSize: 10.5, color: 'var(--ink-2)' }}>Donors</div>
          </div>
        </div>
      )}

      {!config?.clientId && (
        <div style={{ fontSize: 12, color: 'var(--orange)', padding: '8px 0' }}>PayPal is not configured. Donations paused.</div>
      )}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {TIERS.map(t => (
          <button
            key={t.amount}
            className={selected.amount === t.amount ? 'pillbtn solid' : 'pillbtn'}
            onClick={() => { setSelected(t); setStatus(null); setClaim(null); }}
            style={{ flex: '1 1 calc(33% - 6px)', justifyContent: 'center' }}
          >
            <span role="img" aria-label={t.label}>{t.emoji}</span> ${t.amount}
          </button>
        ))}
      </div>
      <div style={{ fontSize: 11.5, color: 'var(--ink-2)' }}>
        <strong style={{ color: 'var(--ink)' }}>{selected.label}</strong> — {selected.desc}
      </div>

      {config?.clientId && <div ref={buttonRef} style={{ minHeight: 45 }} />}

      {status && (
        <div style={{ padding: 10, borderRadius: 8, fontSize: 12, background: status.ok ? 'var(--green-soft)' : 'var(--red-soft)', color: status.ok ? 'var(--green)' : 'var(--red)' }}>
          {status.message}
        </div>
      )}
      {claim && (
        <div style={{ padding: 10, borderRadius: 8, fontSize: 12, background: 'var(--paper-2)', border: '1px solid var(--line)' }}>
          <strong>Merch claim token:</strong> <span className="mono">{claim}</span><br />
          <span style={{ fontSize: 11, color: 'var(--ink-2)' }}>Save this — use it to claim your reward.</span>
        </div>
      )}
    </div>
  );
}
