// Pure room-code helpers (shared by client and relay server).
export const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // no 0/O/1/I
export const CODE_LENGTH = 5;

export function generateCode(random = Math.random) {
  let s = '';
  for (let i = 0; i < CODE_LENGTH; i++) {
    s += ALPHABET[Math.floor(random() * ALPHABET.length)];
  }
  return s;
}

// Uppercases, trims and validates. Returns the code, or null if invalid.
export function normalizeCode(input) {
  if (typeof input !== 'string') return null;
  const code = input.trim().toUpperCase();
  if (code.length !== CODE_LENGTH) return null;
  for (const ch of code) if (!ALPHABET.includes(ch)) return null;
  return code;
}
