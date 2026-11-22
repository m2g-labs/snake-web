// Client network module: relay WebSocket with auto-reconnect.
// All environment access (WebSocket, fetch, storage, timers) is injectable.
import { encode, decode, T } from './protocol.js';

export const RETRY_BASE_MS = 500;
export const RETRY_LIMIT_MS = 15000;
const tokenKey = (code) => `snake-token:${code}`;

const wsBase = (url) => url.replace(/^http/, 'ws').replace(/\/+$/, '');
const httpBase = (url) => url.replace(/^ws/, 'http').replace(/\/+$/, '');

// POST {relayUrl}/rooms -> resolves to parsed JSON (e.g. {code}); rejects on HTTP/network error.
export async function createRoom({ relayUrl, fetchImpl = globalThis.fetch } = {}) {
  const res = await fetchImpl(`${httpBase(relayUrl)}/rooms`, { method: 'POST' });
  if (!res || !res.ok) throw new Error(`createRoom failed: HTTP ${res ? res.status : 'no response'}`);
  return res.json();
}

// Connects to {relayUrl}/rooms/{code}. Returns {on, send, close}.
export function connect({
  relayUrl, code, token, helloExtra = {},
  WebSocketImpl = globalThis.WebSocket,
  storage = globalThis.sessionStorage,
  setTimeoutImpl = globalThis.setTimeout,
  clearTimeoutImpl = globalThis.clearTimeout,
  now = () => Date.now(),
} = {}) {
  const handlers = {};
  let ws = null;
  let closed = false;
  let timer = null;
  let attempt = 0;
  let dropAt = null;
  let status = null;

  const emit = (type, data) => (handlers[type] || []).slice().forEach((fn) => fn(data));
  const setStatus = (s) => { if (s === status) return; status = s; emit('status', s); };
  const load = () => { try { return storage?.getItem(tokenKey(code)) ?? null; } catch { return null; } };
  const save = (t) => { try { storage?.setItem(tokenKey(code), t); } catch { /* ignore */ } };
  let savedToken = token ?? load();
  if (token) save(token);

  function open() {
    setStatus(attempt === 0 ? 'connecting' : 'reconnecting');
    const sock = new WebSocketImpl(`${wsBase(relayUrl)}/rooms/${encodeURIComponent(code)}`);
    ws = sock;
    sock.onopen = () => {
      if (sock !== ws) return;
      attempt = 0; dropAt = null;
      sock.send(encode({ ...helloExtra, type: T.HELLO, token: savedToken ?? null }));
      setStatus('open');
    };
    sock.onmessage = (ev) => {
      if (sock !== ws) return;
      const msg = decode(ev.data);
      if (!msg) return;
      if (msg.type === T.WELCOME) { savedToken = msg.token; save(msg.token); }
      emit(msg.type, msg);
    };
    sock.onclose = () => {
      if (sock !== ws || closed) return;
      ws = null;
      if (dropAt === null) dropAt = now();
      const remaining = RETRY_LIMIT_MS - (now() - dropAt);
      if (remaining <= 0) { setStatus('failed'); return; }
      const delay = Math.min(RETRY_BASE_MS * 2 ** attempt, remaining);
      attempt++;
      setStatus('reconnecting');
      timer = setTimeoutImpl(() => { timer = null; if (!closed) open(); }, delay);
    };
  }
  open();

  return {
    on(type, fn) { (handlers[type] ||= []).push(fn); },
    send(msg) { if (ws && ws.readyState === 1) ws.send(encode(msg)); },
    close() {
      closed = true;
      if (timer !== null) clearTimeoutImpl(timer);
      if (ws) { const s = ws; ws = null; try { s.close(); } catch { /* ignore */ } }
    },
  };
}
