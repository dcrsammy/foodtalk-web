// Who's signed in, plus a sign-in sheet any page can ask for: await requireLogin()
import React, { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';
import { api, getToken, setToken } from './api.js';
import LoginSheet from '../components/LoginSheet.jsx';

const Ctx = createContext(null);
export const useAuth = () => useContext(Ctx);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [ready, setReady] = useState(!getToken());
  const [sheet, setSheet] = useState(null);   // { reason }
  const pending = useRef(null);

  const load = useCallback(async () => {
    if (!getToken()) { setUser(null); setReady(true); return; }
    try { setUser((await api('/customers/me')).user); } catch { setUser(null); }
    setReady(true);
  }, []);
  useEffect(() => { load(); const f = () => setUser(null); window.addEventListener('ft:logout', f); return () => window.removeEventListener('ft:logout', f); }, [load]);

  const requireLogin = useCallback((reason) => {
    if (getToken() && user) return Promise.resolve(user);
    return new Promise((resolve, reject) => { pending.current = { resolve, reject }; setSheet({ reason }); });
  }, [user]);

  const done = (token, u) => { setToken(token); setUser(u); setSheet(null); pending.current?.resolve(u); pending.current = null; };
  const cancel = () => { setSheet(null); pending.current?.reject(new Error('cancelled')); pending.current = null; };
  const logout = () => { setToken(''); setUser(null); };

  return (
    <Ctx.Provider value={{ user, ready, requireLogin, logout, reload: load, setUser }}>
      {children}
      {sheet && <LoginSheet reason={sheet.reason} onDone={done} onCancel={cancel} />}
    </Ctx.Provider>
  );
}
