import React, { useState } from 'react';
import { createRoot } from 'react-dom/client';
import { Background } from './components/Background';
import { Navbar, View } from './components/Navbar';
import { HeroSection } from './components/HeroSection';
import './ui.css';

function App() {
  const login = document.body.dataset.page === 'login';
  const [view, setView] = useState<View>('home');
  const [menu, setMenu] = useState(false);

  function navigate(next: View) {
    setView(next);
    setMenu(false);
    document.body.dataset.view = next;
    document.dispatchEvent(new CustomEvent('admin-navigate', { detail: next }));
    window.scrollTo({ top: 0, behavior: 'instant' });
    if (next !== 'home') document.querySelector<HTMLElement>(`#${next} h2`)?.focus();
  }

  return (
    <>
      <Background visible={view === 'home'} />
      <Navbar view={view} login={login} menu={menu} setMenu={setMenu} navigate={navigate} />
      {view === 'home' && <HeroSection login={login} navigate={navigate} />}
    </>
  );
}

const root = document.getElementById('admin-root');
if (root) {
  const mount = () => createRoot(root).render(<App />);
  if (root.hidden) document.addEventListener('admin-ready', mount, { once: true });
  else mount();
}
