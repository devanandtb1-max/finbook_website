import React, { useRef, useEffect } from 'react';

export type View = 'home' | 'quotations' | 'pricing' | 'settings';

interface NavbarProps {
  view: View;
  login: boolean;
  menu: boolean;
  setMenu: (open: boolean) => void;
  navigate: (view: View) => void;
}

export function Navbar({ view, login, menu, setMenu, navigate }: NavbarProps) {
  const menuButton = useRef<HTMLButtonElement>(null);
  const overlay = useRef<HTMLDivElement>(null);

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
        e.preventDefault();
        nodes[(i + (e.shiftKey ? -1 : 1) + nodes.length) % nodes.length]?.focus();
      }
    };
    const media = window.matchMedia('(min-width:768px)');
    const onResize = () => { if (media.matches) setMenu(false); };
    document.addEventListener('keydown', onKey);
    media.addEventListener('change', onResize);
    return () => {
      document.removeEventListener('keydown', onKey);
      media.removeEventListener('change', onResize);
    };
  }, [menu, setMenu]);

  const links = login ? (
    <a href="../index.html">Customer website</a>
  ) : (
    <>
      <button onClick={() => navigate('home')} aria-current={view === 'home' ? 'page' : undefined}>Home</button>
      <span aria-hidden="true">, </span>
      <button onClick={() => navigate('quotations')} aria-current={view === 'quotations' ? 'page' : undefined}>Quotations</button>
      <span aria-hidden="true">, </span>
      <button onClick={() => navigate('pricing')} aria-current={view === 'pricing' ? 'page' : undefined}>Pricing</button>
      <span aria-hidden="true">, </span>
      <button onClick={() => navigate('settings')} aria-current={view === 'settings' ? 'page' : undefined}>Settings</button>
    </>
  );

  return (
    <>
      <header className={`admin-navbar ${view !== 'home' ? 'solid-nav' : ''}`}>
        <button className="wordmark" onClick={() => login ? window.location.assign('login.html') : navigate('home')}>
          FinBook<span className="asterisk" aria-hidden="true">✳︎</span><small>ADMIN</small>
        </button>
        <nav className="desktop-links" aria-label="Admin navigation">{links}</nav>
        {!login && (
          <button className="desktop-logout" onClick={() => document.dispatchEvent(new Event('admin-logout'))}>
            Sign out ↗
          </button>
        )}
        <button
          ref={menuButton}
          className={`hamburger ${menu ? 'is-open' : ''}`}
          aria-label={menu ? 'Close menu' : 'Open menu'}
          aria-expanded={menu}
          aria-controls="mobile-menu"
          onClick={() => setMenu(!menu)}
        >
          <span /><span /><span />
        </button>
      </header>
      <div ref={overlay} id="mobile-menu" className={`mobile-overlay ${menu ? 'is-open' : ''}`} inert={!menu} aria-hidden={!menu}>
        <nav aria-label="Mobile navigation">{links}</nav>
        {!login && <button onClick={() => document.dispatchEvent(new Event('admin-logout'))}>Sign out ↗</button>}
      </div>
    </>
  );
}
