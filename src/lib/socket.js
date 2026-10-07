import { io } from 'socket.io-client';
import { API_BASE, getToken } from './api.js';
let s = null;
export function socket() {
  const t = getToken(); if (!t) return null;
  if (!s) s = io(API_BASE, { auth: { token: t }, transports: ['websocket', 'polling'] });
  return s;
}
