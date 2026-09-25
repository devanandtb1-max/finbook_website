import React, { useEffect, useState } from 'react';
import { View } from './Navbar';

function useTypewriter(text: string, speed = 38, startDelay = 600) {
  const [displayed, setDisplayed] = useState('');
  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) { setDisplayed(text); return; }
    let interval: ReturnType<typeof setInterval>;
    const timer = setTimeout(() => {
      let index = 0;
      interval = setInterval(() => {
        index++;
        setDisplayed(text.slice(0, index));
        if (index >= text.length) clearInterval(interval);
      }, speed);
    }, startDelay);
    return () => { clearTimeout(timer); clearInterval(interval); };
  }, [text, speed, startDelay]);
  return { displayed, done: displayed.length === text.length };
}

interface HeroSectionProps {
  login: boolean;
  navigate: (view: View) => void;
}

export function HeroSection({ login, navigate }: HeroSectionProps) {
  const [copied, setCopied] = useState(false);
  const [copyError, setCopyError] = useState(false);
  const [ready, setReady] = useState(false);

  const text = login
    ? 'A little clarity. A smoother day. Sign in to your FinBook workspace.'
    : 'Good to see you. Every great company starts somewhere. What are we moving forward today?';

  const { displayed, done } = useTypewriter(text);

  useEffect(() => {
    const id = setTimeout(() => setReady(true), 400);
    return () => clearTimeout(id);
  }, []);

  async function copyEmail() {
    const email = document.getElementById('admin-root')?.dataset.email;
    if (!email) return;
    try {
      await navigator.clipboard.writeText(email);
      setCopied(true);
      setCopyError(false);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopyError(true);
    }
  }

  const email = document.getElementById('admin-root')?.dataset.email;

  return (
    <section className={`admin-hero ${login ? 'login-hero' : ''}`} aria-label="Welcome to FinBook administration">
      <div className="hero-copy max-w-xl relative z-10">
        <div className="intro-label" aria-hidden="true">
          Hey there, meet FinBook,<br />your company operations workspace.
        </div>
        <h1 className="typewriter">
          <span className="sr-only">{text}</span>
          <span aria-hidden="true">{displayed}{!done && <i className="cursor" />}</span>
        </h1>
        <div className={`hero-actions flex flex-wrap gap-y-1 ${ready ? 'ready' : ''}`}>
          {login ? (
            <>
              <button className="pill" onClick={() => document.getElementById('email')?.focus()}>
                Sign in to your workspace ↗
              </button>
              <a className="pill" href="../index.html">View customer website</a>
            </>
          ) : (
            <>
              <button className="pill" onClick={() => navigate('quotations')}>Review quotations</button>
              <button className="pill" onClick={() => navigate('pricing')}>Manage pricing & fees</button>
              <button className="pill" onClick={() => navigate('settings')}>Contact & Support settings</button>
              <a className="pill" href="../index.html" target="_blank" rel="noopener noreferrer">Open customer website ↗</a>
              {email && (
                <button className="pill outline-pill" onClick={copyEmail} aria-label="Copy signed-in email">
                  {copied ? 'Email copied' : (
                    <>
                      Signed in: <u>{email}</u>
                      <svg width="12" height="12" viewBox="0 0 16 16" fill="none" stroke="currentColor" aria-hidden="true">
                        <rect x="5" y="5" width="9" height="9" rx="1"/>
                        <path d="M3 11H2V2h9v1"/>
                      </svg>
                    </>
                  )}
                </button>
              )}
            </>
          )}
        </div>
        <span className="sr-only" role="status">
          {copied ? 'Email copied to clipboard' : copyError ? 'Could not copy email. Select it manually.' : ''}
        </span>
      </div>
      <footer className="hero-footer">
        <span>FINBOOK / OPERATIONS</span>
        <span className="scrub-hint">Move your cursor. Find your flow. <span aria-hidden="true">↔</span></span>
        <span>{login ? 'AUTHORIZED ACCESS ONLY' : 'YOUR WORKSPACE, IN FOCUS'}</span>
      </footer>
    </section>
  );
}
