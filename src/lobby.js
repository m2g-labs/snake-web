// Pure, DOM-free lobby helpers.
export const CODE_LENGTH = 5;

// Uppercase, strip non-alphanumerics; returns the code if exactly 5 chars, else null.
export function normalizeCode(input) {
  const c = String(input ?? '').toUpperCase().replace(/[^A-Z0-9]/g, '');
  return c.length === CODE_LENGTH ? c : null;
}

// Parse `?join=CODE` from a query string; normalized code or null.
export function parseJoinParam(search) {
  return normalizeCode(new URLSearchParams(search || '').get('join'));
}

// Share URL relative to the current page: keeps origin+path, drops query/hash, sets ?join=CODE.
export function buildShareUrl(code, pageUrl) {
  const u = new URL(pageUrl);
  u.search = '';
  u.hash = '';
  u.searchParams.set('join', code);
  return u.toString();
}

const MESSAGES = {
  'room not found': 'Room not found. Check the code and try again.',
  'room full': 'That room is full.',
};
export function errorText(reason) {
  const key = String(reason || '').toLowerCase().replace(/[_-]/g, ' ');
  return MESSAGES[key] || (key ? `Could not join: ${reason}` : 'Relay unreachable. Try again later.');
}
