import { useEffect } from 'react';

export default function ShellLayout({ children }) {
  useEffect(() => {
    // Skip animation if reduced motion is requested
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;

    const host = document.getElementById('tentacles');
    if (!host || host.children.length > 0) return;
    
    const amount = window.innerWidth < 700 ? 9 : 16;
    for (let i = 0; i < amount; i += 1) {
      const el = document.createElement('span');
      el.className = 'tentacle';
      el.style.setProperty('--x', `${Math.random() * 100}%`);
      el.style.setProperty('--len', `${30 + Math.random() * 45}vh`);
      el.style.setProperty('--rot', `${3 + Math.random() * 10}deg`);
      el.style.setProperty('--dur', `${4 + Math.random() * 5}s`);
      el.style.opacity = (0.3 + Math.random() * 0.55).toFixed(2);
      host.appendChild(el);
    }
  }, []);

  return (
    <>
      <div id="tentacles" aria-hidden="true" />
      <main className="shell">
         {children}
      </main>
    </>
  );
}
