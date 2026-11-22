import { generateCode, normalizeCode } from '../src/roomcode.js';

const ALLOWED_ORIGINS = ['https://m2g-labs.github.io'];

export function corsHeaders(origin) {
  const ok = origin && (ALLOWED_ORIGINS.includes(origin) ||
    /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(origin));
  const h = { 'Vary': 'Origin' };
  if (ok) {
    h['Access-Control-Allow-Origin'] = origin;
    h['Access-Control-Allow-Methods'] = 'GET, POST, OPTIONS';
    h['Access-Control-Allow-Headers'] = 'Content-Type';
  }
  return h;
}

function json(body, status, origin) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json', ...corsHeaders(origin) },
  });
}

// Pure routing: returns {response} to answer directly, or {action:'create'|'ws', code}.
export function route(request, random = Math.random) {
  const url = new URL(request.url);
  const origin = request.headers.get('Origin');
  if (request.method === 'OPTIONS') {
    return { response: new Response(null, { status: 204, headers: corsHeaders(origin) }) };
  }
  if (url.pathname === '/rooms') {
    if (request.method !== 'POST') return { response: json({ error: 'method not allowed' }, 405, origin) };
    return { action: 'create', code: generateCode(random), origin };
  }
  const m = url.pathname.match(/^\/rooms\/([^/]+)\/ws$/);
  if (m) {
    const code = normalizeCode(decodeURIComponent(m[1]));
    if (!code) return { response: json({ error: 'not found' }, 404, origin) };
    if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') {
      return { response: json({ error: 'upgrade required' }, 426, origin) };
    }
    return { action: 'ws', code, origin };
  }
  return { response: json({ error: 'not found' }, 404, origin) };
}

export { json };
