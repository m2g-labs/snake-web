// Relay Worker URL. Replace <account> with your Cloudflare workers.dev subdomain.
export const DEFAULT_RELAY_URL = 'https://snake-relay.<account>.workers.dev';

// Pure resolver: prefer a valid http(s) `?relay=` override, else the default.
export function resolveRelayUrl(search = '', fallback = DEFAULT_RELAY_URL) {
  try {
    const v = new URLSearchParams(search).get('relay');
    if (v) {
      const u = new URL(v);
      if (u.protocol === 'https:' || u.protocol === 'http:') return v.replace(/\/+$/, '');
    }
  } catch { /* invalid -> fallback */ }
  return fallback;
}

export const RELAY_URL = resolveRelayUrl(typeof location !== 'undefined' ? location.search : '');
