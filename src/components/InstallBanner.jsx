import React, { useEffect, useState } from 'react';
import Icon from './Icon.jsx';

// iPhone: Safari can't show an install button, so explain Share → Add to Home Screen once.
// Android/Chrome: use the browser's own install prompt.
export default function InstallBanner() {
  const [prompt, setPrompt] = useState(null);
  const [show, setShow] = useState(false);
  const standalone = window.matchMedia('(display-mode: standalone)').matches || navigator.standalone;
  const ios = /iphone|ipad|ipod/i.test(navigator.userAgent) && !/crios|fxios/i.test(navigator.userAgent);
  useEffect(() => {
    if (standalone || localStorage.getItem('ft_install_seen')) return;
    const h = (e) => { e.preventDefault(); setPrompt(e); setShow(true); };
    window.addEventListener('beforeinstallprompt', h);
    let t; if (ios) t = setTimeout(() => setShow(true), 20000);   // after they've had a look around
    return () => { window.removeEventListener('beforeinstallprompt', h); clearTimeout(t); };
  }, []); // eslint-disable-line
  if (!show) return null;
  const close = () => { setShow(false); localStorage.setItem('ft_install_seen', '1'); };
  return (
    <div className="install" role="dialog" aria-label="Install FoodTalk">
      <Icon name="install" />
      <div>
        <b>Get FoodTalk on your home screen</b>
        {ios ? <span>Tap <b>Share</b> <span className="ios-share" aria-hidden>⬆︎</span> then <b>Add to Home Screen</b>.</span>
             : <span>Opens full screen, like an app. No download from the store.</span>}
      </div>
      {!ios && prompt && <button className="btn primary sm" onClick={async () => { prompt.prompt(); await prompt.userChoice; close(); }}>Install</button>}
      <button className="x" onClick={close} aria-label="Dismiss"><Icon name="close" size={18} /></button>
    </div>
  );
}
