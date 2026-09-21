import React, { useEffect, useRef, useState } from 'react';
import { createRoot } from 'react-dom/client';
import './ui.css';

const VIDEO = 'https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260530_042513_df96a13b-6155-4f6e-8b93-c9dee66fba08.mp4';
type View = 'home' | 'quotations' | 'pricing';
function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplayed(text); return; }
    let interval: ReturnType<typeof setInterval>;
    const timer = setTimeout(() => { let index = 0; interval = setInterval(() => { index++; setDisplayed(text.slice(0, index)); if (index >= text.length) clearInterval(interval); }, speed); }, startDelay);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [text, speed, startDelay]);
  return { displayed, done: displayed.length === text.length };
}
function Background({ visible }: { visible: boolean }) {
  const video = useRef<HTMLVideoElement>(null);
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    const el = video.current;
    if (!el || !visible || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    let prevX: number | undefined, targetTime = 0, seeking = false;
    function seek() {
      if (!el || seeking || !Number.isFinite(el.duration) || Math.abs(el.currentTime - targetTime) < .035) return;
      seeking = true; el.currentTime = Math.min(targetTime, Math.max(0, el.duration - .05));
    }
    const onMove = (event: MouseEvent) => {
      if (prevX === undefined) { prevX = event.clientX; return; }
      const delta = event.clientX - prevX; prevX = event.clientX;
      if (!Number.isFinite(el.duration)) return;
      targetTime = Math.max(0, Math.min(el.duration - .05, targetTime + delta / window.innerWidth * .8 * el.duration)); seek();
    };
    const onSeeked = () => { seeking = false; seek(); };
    window.addEventListener('mousemove', onMove); el.addEventListener('seeked', onSeeked);
    return () => { window.removeEventListener('mousemove', onMove); el.removeEventListener('seeked', onSeeked); };
  }, [visible]);
  return <div className={`scene ${visible ? '' : 'scene-hidden'}`} aria-hidden="true"><div className="scene-fallback" />{!failed && <video ref={video} src={VIDEO} muted playsInline preload="auto" onError={() => setFailed(true)} />}<div className="scene-wash" /></div>;
}
function App() {
  const login = document.body.dataset.page === 'login';
  const [view, setView] = useState<View>('home');
  const [menu, setMenu] = useState(false);
  const menuButton = useRef<HTMLButtonElement>(null);
  const overlay = useRef<HTMLDivElement>(null);
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [ready, setReady] = useState(false);
  const text = login ? 'A little clarity. A smoother day. Sign in to your FinBook workspace.' : 'Good to see you. Every great company starts somewhere. What are we moving forward today?';
  const { displayed, done } = useTypewriter(text);
  useEffect(() => { const id = setTimeout(() => setReady(true), 400); return () => clearTimeout(id); }, []);
  useEffect(() => {
    document.body.classList.toggle('menu-open', menu);
    if (menu) overlay.current?.querySelector<HTMLElement>('button, a')?.focus();
    return () => document.body.classList.remove('menu-open');
  }, [menu]);
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (!menu) return;
      if (e.key === 'Escape') { setMenu(false); menuButton.current?.focus(); }
      if (e.key === 'Tab') {
        const nodes = [...(overlay.current?.querySelectorAll<HTMLElement>('button, a') || []), menuButton.current!];
        const i = nodes.indexOf(document.activeElement as HTMLElement);
        e.preventDefault(); nodes[(i + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length]?.focus();
      }
    };
    const media = window.matchMedia('(min-width:768px)');
    const onResize = () => { if (media.matches) setMenu(false); };
    document.addEventListener('keydown', onKey); media.addEventListener('change', onResize);
    return () => { document.removeEventListener('keydown', onKey); media.removeEventListener('change', onResize); };
  }, [menu]);
  function navigate(next: View) {
    setView(next); setMenu(false);
    document.body.dataset.view = next;
    document.dispatchEvent(new CustomEvent('admin-navigate', { detail: next }));
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (next !== 'home') document.querySelector<HTMLElement>(`#${next} h2`)?.focus();
  }
  async function copyEmail() {
    const email = document.getElementById('admin-root')?.dataset.email;
    if (!email) return;
    try { await navigator.clipboard.writeText(email); setCopied(true); setCopyError(false); setTimeout(() => setCopied(false), 2500); }
    catch { setCopyError(true); }
  }
  const links = login ? <a href="../index1.html">Customer website</a> : <><button onClick={() => navigate('home')} aria-current={view === 'home' ? 'page' : undefined}>Home</button><span aria-hidden="true">, </span><button onClick={() => navigate('quotations')} aria-current={view === 'quotations' ? 'page' : undefined}>Quotations</button><span aria-hidden="true">, </span><button onClick={() => navigate('pricing')} aria-current={view === 'pricing' ? 'page' : undefined}>Pricing</button></>;
  const email = document.getElementById('admin-root')?.dataset.email;
  return <>
    <Background visible={view === 'home'} />
    <header className={`admin-navbar ${view !== 'home' ? 'solid-nav' : ''}`}>
      <button className="wordmark" onClick={() => login ? window.location.assign('login.html') : navigate('home')}>FinBook<span className="asterisk" aria-hidden="true">✳︎</span><small>ADMIN</small></button>
      <nav className="desktop-links" aria-label="Admin navigation">{links}</nav>
      {!login && <button className="desktop-logout" onClick={() => document.dispatchEvent(new Event('admin-logout'))}>Sign out ↗</button>}
      <button ref={menuButton} className={`hamburger ${menu ? 'is-open' : ''}`} aria-label={menu ? 'Close menu' : 'Open menu'} aria-expanded={menu} aria-controls="mobile-menu" onClick={() => setMenu(!menu)}><span /><span /><span /></button>
    </header>
    <div ref={overlay} id="mobile-menu" className={`mobile-overlay ${menu ? 'is-open' : ''}`} inert={!menu} aria-hidden={!menu}><nav aria-label="Mobile navigation">{links}</nav>{!login && <button onClick={() => document.dispatchEvent(new Event('admin-logout'))}>Sign out ↗</button>}</div>
    {view === 'home' && <section className={`admin-hero ${login ? 'login-hero' : ''}`} aria-label="Welcome to FinBook administration">
      <div className="hero-copy max-w-xl relative z-10">
        <div className="intro-label" aria-hidden="true">Hey there, meet FinBook,<br />your company operations workspace.</div>
        <h1 className="typewriter"><span className="sr-only">{text}</span><span aria-hidden="true">{displayed}{!done && <i className="cursor" />}</span></h1>
        <div className={`hero-actions flex flex-wrap gap-y-1 ${ready ? 'ready' : ''}`}>
          {login ? <><button className="pill" onClick={() => document.getElementById('email')?.focus()}>Sign in to your workspace ↗</button><a className="pill" href="../index1.html">View customer website</a></> : <>
            <button className="pill" onClick={() => navigate('quotations')}>Review quotations</button>
            <button className="pill" onClick={() => navigate('pricing')}>Manage pricing & fees</button>
            <button className="pill" onClick={() => navigate('quotations')}>Check WhatsApp handoffs</button>
            <a className="pill" href="../index1.html" target="_blank" rel="noopener noreferrer">Open customer website ↗</a>
            {email && <button className="pill outline-pill" onClick={copyEmail} aria-label="Copy signed-in email">{copied ? 'Email copied' : <>Signed in: <u>{email}</u><svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true"><rect x="5" y="5" width="9" height="9" rx="1"/><path d="M3 11H2V2h9v1"/></svg></>}</button>}
          </>}
        </div>
        <span className="sr-only" role="status">{copied ? 'Email copied to clipboard' : copyError ? 'Could not copy email. Select it manually.' : ''}</span>
      </div>
      <footer className="hero-footer"><span>FINBOOK / OPERATIONS</span><span className="scrub-hint">Move your cursor. Find your flow. <span aria-hidden="true">↔</span></span><span>{login ? 'AUTHORIZED ACCESS ONLY' : 'YOUR WORKSPACE, IN FOCUS'}</span></footer>
    </section>}
  </>;
}
const root = document.getElementById('admin-root');
if (root) {
  const mount = () => createRoot(root).render(<App />);
  if (root.hidden) document.addEventListener('admin-ready', mount, { once: true });
  else mount();
}
