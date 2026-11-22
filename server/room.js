import { DurableObject } from 'cloudflare:workers';
import { encode, decode } from '../src/protocol.js';
import { normalizeCode } from '../src/roomcode.js';
import { RoomCore, IDLE_MS } from './roomcore.js';

const MAX_SOCKETS = 4; // 2 players + stale sockets awaiting replacement on reconnect
const TTL_MS = IDLE_MS; // rooms with no activity expire (alarm deletes them)

export function codeFromPath(pathname) {
  const m = pathname.match(/^\/rooms\/([^/]+)\/ws$/);
  return (m && normalizeCode(decodeURIComponent(m[1]))) || '';
}

export class Room extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    const created = await this.ctx.storage.get('created');
    const fresh = created && Date.now() - created < TTL_MS;
    if (url.pathname === '/init') {
      if (fresh || this.ctx.getWebSockets().length) return new Response(null, { status: 409 });
      await this.ctx.storage.put('created', Date.now());
      await this.ctx.storage.setAlarm(Date.now() + IDLE_MS);
      return new Response(null, { status: 200 });
    }
    if (!fresh && !this.ctx.getWebSockets().length) return new Response('not found', { status: 404 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    if (this.ctx.getWebSockets().length >= MAX_SOCKETS) {
      server.accept();
      server.send(encode({ type: 'error', reason: 'full' }));
      server.close(1008, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ slot: null });
    await this.ctx.storage.put('created', Date.now());
    await this.ctx.storage.put('code', codeFromPath(url.pathname));
    return new Response(null, { status: 101, webSocket: client });
  }

  async core() {
    const stored = await this.ctx.storage.get('core');
    const code = (await this.ctx.storage.get('code')) || '';
    const connected = [false, false];
    for (const w of this.ctx.getWebSockets()) {
      const slot = w.deserializeAttachment()?.slot;
      if (slot === 0 || slot === 1) connected[slot] = true;
    }
    return new RoomCore({
      code,
      state: stored,
      connected,
      now: () => Date.now(),
      setAlarm: (ms) => { this.ctx.storage.setAlarm(ms); },
      send: (slot, msg) => {
        for (const w of this.ctx.getWebSockets()) {
          if (w.deserializeAttachment()?.slot === slot) { try { w.send(encode(msg)); } catch {} }
        }
      },
    });
  }

  async webSocketMessage(ws, data) {
    const att = ws.deserializeAttachment() || { slot: null };
    const core = await this.core();
    const before = att.slot;
    const slot = core.message(before, typeof data === 'string' ? data : null, (m) => ws.send(encode(m)));
    if (before === null && slot === null) {
      // Hello was rejected (bad token / full) or message was invalid; only reject real hellos.
      const msg = typeof data === 'string' ? decode(data) : null;
      if (msg && msg.type === 'hello') {
        ws.send(encode({ type: 'error', reason: 'rejected' }));
        ws.close(1008, 'rejected');
      }
      return;
    }
    if (slot !== before) {
      // Replace any stale socket still holding this slot.
      for (const w of this.ctx.getWebSockets()) {
        if (w !== ws && w.deserializeAttachment()?.slot === slot) {
          w.serializeAttachment({ slot: null });
          try { w.close(1000, 'replaced'); } catch {}
        }
      }
      ws.serializeAttachment({ slot });
    }
    await this.ctx.storage.put('core', core.state);
  }

  async webSocketClose(ws, code, reason) {
    const slot = ws.deserializeAttachment()?.slot;
    try { ws.close(code, reason); } catch {}
    if (slot !== 0 && slot !== 1) return;
    ws.serializeAttachment({ slot: null });
    const core = await this.core();
    core.disconnect(slot);
    await this.ctx.storage.put('core', core.state);
  }

  async alarm() {
    const core = await this.core();
    const expired = core.alarm();
    if (expired) {
      for (const w of this.ctx.getWebSockets()) { try { w.close(1001, 'expired'); } catch {} }
      await this.ctx.storage.deleteAll();
      return;
    }
    await this.ctx.storage.put('core', core.state);
  }
}
