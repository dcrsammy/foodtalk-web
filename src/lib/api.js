// Talks to the FoodTalk backend. Set VITE_API_BASE for production (see .env.production).
export const API_BASE = import.meta.env.VITE_API_BASE || 'http://localhost:4000';
const TOKEN = 'ft_token';

export const getToken = () => { try { return localStorage.getItem(TOKEN) || ''; } catch { return ''; } };
export const setToken = (t) => { try { t ? localStorage.setItem(TOKEN, t) : localStorage.removeItem(TOKEN); } catch {} };

export class ApiError extends Error { constructor(msg, status) { super(msg); this.status = status; } }

export async function api(path, { method = 'GET', body, auth = true } = {}) {
  const headers = { 'Content-Type': 'application/json' };
  const t = auth && getToken(); if (t) headers.Authorization = `Bearer ${t}`;
  let res;
  try { res = await fetch(API_BASE + path, { method, headers, body: body === undefined ? undefined : JSON.stringify(body) }); }
  catch { throw new ApiError('No connection. Check your internet and try again.', 0); }
  if (res.status === 204) return null;
  const data = await res.json().catch(() => ({}));
  if (res.status === 401 && t) { setToken(''); window.dispatchEvent(new Event('ft:logout')); }
  if (!res.ok) throw new ApiError(data.error || 'Something went wrong. Please try again.', res.status);
  return data;
}
