// Pure text formatting for the online match HUD/overlays (no DOM).
export const GRACE_SECONDS = 15;

// 'p1'|'p2' -> 'me' | 'opp' relative to our slot.
export function relative(winner, slot) {
  return winner === slot ? 'me' : 'opp';
}

export function hudText(myScore, oppScore, myWins, oppWins) {
  return `You ${myScore} · Opp ${oppScore} | Rounds: You ${myWins} – ${oppWins} Opp`;
}

export function winsText(myWins, oppWins) {
  return `You ${myWins} – ${oppWins} Opp`;
}

// roundEnd message -> { title, msg } for the overlay.
export function roundResult(msg, slot) {
  const other = slot === 'p1' ? 'p2' : 'p1';
  const mine = msg.scores[slot];
  const theirs = msg.scores[other];
  const score = `Score: ${mine} – ${theirs}`;
  const wins = winsText(msg.wins[slot], msg.wins[other]);
  let title;
  if (msg.winner === 'draw') title = 'Draw – replay';
  else title = msg.winner === slot ? 'You win the round!' : 'You lose the round';
  return { title, msg: `${score}\n${wins}` };
}

const REASONS = {
  forfeit: 'Opponent disconnected (forfeit)',
  wins: 'Won the best of 3',
  score: 'Won the best of 3',
};
export function reasonText(reason) {
  const r = String(reason || '');
  return REASONS[r] || r;
}

export function matchResult(msg, slot) {
  const title = msg.winner === slot ? 'You win the match!' : 'You lose the match';
  return { title, msg: reasonText(msg.reason) };
}

export function disconnectText(secondsLeft) {
  return `Opponent disconnected – ${Math.max(0, Math.ceil(secondsLeft))}s`;
}

export const RECONNECTING_TEXT = 'Reconnecting…';

// Seconds remaining until startsAt (ms epoch); clamped to [0, max].
export function countdownSeconds(startsAt, now, maxMs = 10000) {
  const ms = Math.min(maxMs, Math.max(0, startsAt - now));
  return Math.ceil(ms / 1000);
}
