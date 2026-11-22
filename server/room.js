import { DurableObject } from 'cloudflare:workers';

const MAX_SOCKETS = 2;
const TTL_MS = 60 * 60 * 1000; // unused rooms expire after an hour

export class Room extends DurableObject {
  async fetch(request) {
    const url = new URL(request.url);
    const created = await this.ctx.storage.get('created');
    const fresh = created && Date.now() - created < TTL_MS;
    if (url.pathname === '/init') {
      if (fresh || this.ctx.getWebSockets().length) return new Response(null, { status: 409 });
      await this.ctx.storage.put('created', Date.now());
      return new Response(null, { status: 200 });
    }
    if (!fresh && !this.ctx.getWebSockets().length) return new Response('not found', { status: 404 });

    const pair = new WebSocketPair();
    const [client, server] = Object.values(pair);
    const existing = this.ctx.getWebSockets();
    if (existing.length >= MAX_SOCKETS) {
      server.accept();
      server.send(JSON.stringify({ type: 'error', reason: 'full' }));
      server.close(1008, 'full');
      return new Response(null, { status: 101, webSocket: client });
    }
    const taken = new Set(existing.map((s) => s.deserializeAttachment()?.slot));
    const slot = taken.has(0) ? 1 : 0;
    const token = crypto.randomUUID();
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment({ slot, token });
    server.send(JSON.stringify({ type: 'welcome', slot, token }));
    // Notify the socket holding the other slot (the earlier player), if any.
    const other = existing.find((s) => s.deserializeAttachment()?.slot === 1 - slot);
    if (other) other.send(JSON.stringify({ type: 'opponentJoined' }));
    return new Response(null, { status: 101, webSocket: client });
  }

  webSocketClose(ws, code, reason) {
    try { ws.close(code, reason); } catch {}
  }
}
