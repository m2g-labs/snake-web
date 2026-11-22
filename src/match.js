// Pure best-of-3 match referee. No DOM, no network. Every mutator returns a list of events to broadcast.
export const WINS_NEEDED = 2;

export function createMatch({ level = 5 } = {}) {
  return {
    level,
    players: {},
    phase: 'lobby', // lobby | playing | between | over
    round: 0,
    seed: null,
    scores: { p1: 0, p2: 0 },
    wins: { p1: 0, p2: 0 },
    dead: { p1: false, p2: false },
    winner: null,
  };
}

export function addPlayer(m, id) {
  for (const s of ['p1', 'p2']) if (m.players[s] === id) return s;
  const slot = m.players.p1 === undefined ? 'p1' : m.players.p2 === undefined ? 'p2' : null;
  if (slot) m.players[slot] = id;
  return slot;
}

export function startRound(m, seed) {
  if (m.phase === 'over') return [];
  if (m.phase !== 'playing') m.round = m.phase === 'between' && m.replay ? m.round : m.round + 1;
  m.replay = false;
  m.phase = 'playing';
  m.seed = seed;
  m.scores = { p1: 0, p2: 0 };
  m.dead = { p1: false, p2: false };
  return [{ type: 'roundStart', round: m.round, seed, level: m.level }];
}

const valid = (slot) => slot === 'p1' || slot === 'p2';
const other = (slot) => (slot === 'p1' ? 'p2' : 'p1');

export function reportScore(m, slot, score) {
  if (m.phase !== 'playing' || !valid(slot) || m.dead[slot]) return [];
  if (!Number.isInteger(score) || score < 0) return [];
  m.scores[slot] = Math.max(m.scores[slot], score);
  return [{ type: 'opponentScore', to: other(slot), score: m.scores[slot] }];
}

export function reportDeath(m, slot, score) {
  if (m.phase !== 'playing' || !valid(slot) || m.dead[slot]) return [];
  if (Number.isInteger(score) && score >= 0) m.scores[slot] = Math.max(m.scores[slot], score);
  m.dead[slot] = true;
  const { p1, p2 } = m.scores;
  const winner = p1 === p2 ? 'draw' : p1 > p2 ? 'p1' : 'p2';
  m.phase = 'between';
  if (winner === 'draw') m.replay = true;
  else m.wins[winner]++;
  const events = [{ type: 'roundEnd', winner, scores: { ...m.scores }, wins: { ...m.wins } }];
  if (winner !== 'draw' && m.wins[winner] >= WINS_NEEDED) {
    m.phase = 'over';
    m.winner = winner;
    events.push({ type: 'matchEnd', winner, reason: 'score' });
  }
  return events;
}

export function forfeit(m, slot) {
  if (m.phase === 'over' || !valid(slot)) return [];
  m.phase = 'over';
  m.winner = other(slot);
  return [{ type: 'matchEnd', winner: m.winner, reason: 'forfeit' }];
}
