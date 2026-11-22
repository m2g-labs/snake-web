import { route, json } from './routes.js';
import { Room } from './room.js';

export { Room };

export default {
  async fetch(request, env) {
    const r = route(request);
    if (r.response) return r.response;
    const stub = env.ROOM.get(env.ROOM.idFromName(r.code));
    if (r.action === 'create') {
      // Retry on the (unlikely) collision with an existing room.
      let code = r.code;
      for (let i = 0; i < 5; i++) {
        const s = env.ROOM.get(env.ROOM.idFromName(code));
        const res = await s.fetch('https://room/init', { method: 'POST' });
        if (res.status === 200) return json({ code }, 200, r.origin);
        code = route(request).code;
      }
      return json({ error: 'unavailable' }, 503, r.origin);
    }
    return stub.fetch(request);
  },
};
