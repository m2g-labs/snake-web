/*
 * Wire protocol: JSON text messages `{type, ...fields}`.
 *
 * client -> server
 *   hello{token,level?} identify / resume (token may be null for new players);
 *                       level = creator's difficulty (1-10), optional
 *   score{score}        current score (non-negative integer)
 *   dead{score}         player died with final score
 *   ready               player ready for next round
 * server -> client
 *   welcome{slot,token,code}   slot 'p1'|'p2', resume token, room code
 *   opponentJoined
 *   roundStart{round,seed,level,startsAt}
 *   opponentScore{score}
 *   roundEnd{winner,scores,wins}   winner 'p1'|'p2'|'draw'
 *   matchEnd{winner,reason}
 *   opponentLeft{graceMs}
 *   opponentBack
 *   error{reason}
 *
 * decode() returns null for bad JSON, unknown type, bad field shapes,
 * negative/non-integer scores, or payloads over MAX_SIZE characters.
 */
export const MAX_SIZE = 1024;

export const T = {
  HELLO: 'hello', SCORE: 'score', DEAD: 'dead', READY: 'ready',
  WELCOME: 'welcome', OPPONENT_JOINED: 'opponentJoined', ROUND_START: 'roundStart',
  OPPONENT_SCORE: 'opponentScore', ROUND_END: 'roundEnd', MATCH_END: 'matchEnd',
  OPPONENT_LEFT: 'opponentLeft', OPPONENT_BACK: 'opponentBack', ERROR: 'error',
};

const isScore = (v) => Number.isInteger(v) && v >= 0;
const isStr = (v) => typeof v === 'string';
const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isSlot = (v) => v === 'p1' || v === 'p2';
const pair = (v) => isObj(v) && isScore(v.p1) && isScore(v.p2);

const validators = {
  hello: (m) => (m.token === null || m.token === undefined || isStr(m.token)) &&
    (m.level === undefined || isScore(m.level)),
  score: (m) => isScore(m.score),
  dead: (m) => isScore(m.score),
  ready: () => true,
  welcome: (m) => isSlot(m.slot) && isStr(m.token) && isStr(m.code),
  opponentJoined: () => true,
  roundStart: (m) => isScore(m.round) && Number.isFinite(m.seed) && isScore(m.level) && Number.isFinite(m.startsAt),
  opponentScore: (m) => isScore(m.score),
  roundEnd: (m) => (isSlot(m.winner) || m.winner === 'draw') && pair(m.scores) && pair(m.wins),
  matchEnd: (m) => isSlot(m.winner) && isStr(m.reason),
  opponentLeft: (m) => isScore(m.graceMs),
  opponentBack: () => true,
  error: (m) => isStr(m.reason),
};

export function encode(msg) {
  return JSON.stringify(msg);
}

export function decode(text) {
  if (!isStr(text) || text.length > MAX_SIZE) return null;
  let msg;
  try { msg = JSON.parse(text); } catch { return null; }
  if (!isObj(msg) || !isStr(msg.type)) return null;
  if (!Object.hasOwn(validators, msg.type)) return null;
  return validators[msg.type](msg) ? msg : null;
}
