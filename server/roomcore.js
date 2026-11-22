// Testable core of the Room Durable Object: no Cloudflare APIs. Slots are 0|1 (wire: 'p1'|'p2').
import { createMatch, addPlayer, startRound, reportScore, reportDeath, forfeit } from '../src/match.js';
import { decode, T } from '../src/protocol.js';
import { randomSeed } from '../src/rng.js';

export const GRACE_MS = 15000;
export const COUNTDOWN_MS = 3000;
export const IDLE_MS = 10 * 60 * 1000;

const name = (slot) => (slot === 0 ? 'p1' : 'p2');
const index = (n) => (n === 'p1' ? 0 : 1);

export function freshState(now) {
  return {
    match: createMatch(),
    tokens: [null, null],
    ready: [false, false],
    graceUntil: [null, null],
    lastActivity: now,
  };
}

export class RoomCore {
  // send(slot, msg); now(); setAlarm(ms); state = persisted snapshot (mutated in place, re-persist after calls)
  constructor({ send, now, setAlarm, code = '', state, connected = [false, false], newToken = () => crypto.randomUUID() }) {
    this.send = send;
    this.now = now;
    this.setAlarm = setAlarm;
    this.code = code;
    this.newToken = newToken;
    this.state = state || freshState(now());
    this.connected = connected;
  }

  broadcast(msg) { this.send(0, msg); this.send(1, msg); }

  emit(events) {
    for (const { to, ...ev } of events) {
      if (to) this.send(index(to), ev);
      else this.broadcast(ev);
    }
  }

  touch() {
    this.state.lastActivity = this.now();
    const times = [this.state.lastActivity + IDLE_MS, ...this.state.graceUntil.filter((t) => t !== null)];
    this.setAlarm(Math.min(...times));
  }

  // Returns the slot for this socket, or null if rejected (caller sends error/closes).
  hello(msg) {
    const s = this.state;
    let slot;
    if (typeof msg.token === 'string') {
      slot = s.tokens.indexOf(msg.token);
      if (slot < 0) return null;
    } else {
      slot = s.tokens.indexOf(null);
      if (slot < 0) return null;
      s.tokens[slot] = this.newToken();
      addPlayer(s.match, name(slot));
    }
    const reconnect = s.graceUntil[slot] !== null;
    s.graceUntil[slot] = null;
    this.connected[slot] = true;
    if (slot === 0 && Number.isInteger(msg.level)) s.match.level = msg.level;
    this.send(slot, { type: T.WELCOME, slot: name(slot), token: s.tokens[slot], code: this.code });
    if (this.connected[1 - slot]) this.send(1 - slot, { type: reconnect ? T.OPPONENT_BACK : T.OPPONENT_JOINED });
    this.touch();
    return slot;
  }

  // Handle a raw text message from a socket bound to `slot` (null = no hello yet). Returns the (possibly new) slot.
  message(slot, text) {
    const msg = decode(text);
    if (!msg) return slot;
    if (msg.type === T.HELLO) return slot === null ? this.hello(msg) : slot;
    if (slot === null) return slot;
    const m = this.state.match;
    this.touch();
    if (msg.type === T.READY) {
      this.state.ready[slot] = true;
      const s = this.state;
      if (s.ready[0] && s.ready[1] && this.connected[0] && this.connected[1] &&
          (m.phase === 'lobby' || m.phase === 'between')) {
        s.ready = [false, false];
        const startsAt = this.now() + COUNTDOWN_MS;
        this.emit(startRound(m, randomSeed()).map((e) => ({ ...e, startsAt })));
      }
    } else if (msg.type === T.SCORE) {
      this.emit(reportScore(m, name(slot), msg.score));
    } else if (msg.type === T.DEAD) {
      this.emit(reportDeath(m, name(slot), msg.score));
    }
    return slot;
  }

  disconnect(slot) {
    if (slot === null || slot === undefined) return;
    const s = this.state;
    this.connected[slot] = false;
    s.ready[slot] = false;
    if (s.tokens[slot] === null || s.match.phase === 'over') return;
    s.graceUntil[slot] = this.now() + GRACE_MS;
    if (this.connected[1 - slot]) this.send(1 - slot, { type: T.OPPONENT_LEFT, graceMs: GRACE_MS });
    this.touch();
  }

  // Returns true if the room has expired from inactivity and should be deleted.
  alarm() {
    const s = this.state;
    const t = this.now();
    for (const slot of [0, 1]) {
      if (s.graceUntil[slot] !== null && s.graceUntil[slot] <= t) {
        s.graceUntil[slot] = null;
        this.emit(forfeit(s.match, name(slot)));
      }
    }
    if (t - s.lastActivity >= IDLE_MS) return true;
    const times = [s.lastActivity + IDLE_MS, ...s.graceUntil.filter((x) => x !== null)];
    this.setAlarm(Math.min(...times));
    return false;
  }
}
