import { createGame, setDirection, step, tickMs } from './game.js';
import { detectSwipe } from './swipe.js';
import { keyToAction, shouldPreventDefault, modeOnFocusLoss } from './input.js';
import { loadHighScore, saveHighScore, loadDifficulty, saveDifficulty, loadBoardSize, saveBoardSize } from './storage.js';
import { clampBoardSize } from './board.js';
import { clampDifficulty, baseTickMs, speedStepMs, MIN_TICK_MS } from './difficulty.js';
import { vibrate, HAPTIC_EAT, HAPTIC_OVER } from './haptics.js';
import { normalizeCode, parseJoinParam, buildShareUrl, errorText } from './lobby.js';
import { connect, createRoom } from './net.js';
import { T } from './protocol.js';
import { interpolateSnake, snapshotSnake, frameAlpha } from './interp.js';
import { draw, resizeCanvas, availableBoardPx } from './render.js';
import { hudText, roundResult, matchResult, disconnectText, countdownSeconds, RECONNECTING_TEXT, GRACE_SECONDS } from './matchview.js';
import { seededRng } from './rng.js';
import { BOARD_SIZE_DEFAULT } from './board.js';
import { RELAY_URL as CONFIG_RELAY_URL } from './config.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const bestEl = document.getElementById('best');
const dpad = document.getElementById('dpad');
const actionBtn = document.getElementById('action');
const diffWrap = document.getElementById('difficulty');
const diffSlider = document.getElementById('difficulty-slider');
const diffLabel = document.getElementById('difficulty-label');

const onlineBtn = document.getElementById('online-btn');
let level = loadDifficulty(); // level applied to the current/next game
const sizeWrap = document.getElementById('board-size');
const sizeSelect = document.getElementById('board-size-select');
let size = loadBoardSize();
sizeSelect.value = String(size);
let baseMs = baseTickMs(level);
let stepMs = speedStepMs(level);
diffSlider.value = String(level);

function updateDiffLabel() {
  const l = Number(diffSlider.value);
  diffLabel.textContent = `Level ${l} · ${baseTickMs(l)} ms start · −${speedStepMs(l)} ms per food`;
}
updateDiffLabel();

let state = createGame({ cols: size, rows: size });
let mode = 'start'; // start | running | paused | over | countdown | waiting
let online = null; // {slot, oppScore, wins, round, cdTimer} while in a match
let cell = 1;
let dpr = 1;
let best = loadHighScore();
let acc = 0;
let last = 0;
let prevSnake = snapshotSnake(state.snake);
const motionQuery = window.matchMedia?.('(prefers-reduced-motion: reduce)');
let reducedMotion = !!(motionQuery && motionQuery.matches);
if (motionQuery && motionQuery.addEventListener) motionQuery.addEventListener('change', (e) => { reducedMotion = e.matches; });

function resize() {
  dpr = window.devicePixelRatio || 1;
  const { w, h } = availableBoardPx(window.innerWidth, window.innerHeight, dpad.offsetHeight || 0);
  cell = resizeCanvas(canvas, w, h, size, size, dpr);
  render();
}

function render() {
  const alpha = frameAlpha({ mode, gameOver: state.gameOver, acc, tick: tickMs(state.score, baseMs, stepMs, MIN_TICK_MS), reducedMotion });
  draw(ctx, state, cell, dpr, { snake: interpolateSnake(prevSnake, state.snake, alpha, state.cols, state.rows) });
  scoreEl.textContent = `Score: ${state.score}`;
  if (online) hud.textContent = hudText(state.score, online.oppScore, online.wins.me, online.wins.opp);
  bestEl.textContent = `Best: ${best}`;
}

function showOverlay() {
  if (online) return; // online overlays are managed by the match code below
  overlay.hidden = mode === 'running';
  diffWrap.hidden = !(mode === 'start' || mode === 'over');
  sizeWrap.hidden = diffWrap.hidden;
  onlineBtn.hidden = diffWrap.hidden;
  if (mode === 'start') {
    overlayTitle.textContent = 'Snake';
    overlayMsg.textContent = 'Arrow keys / WASD to move. Space to pause.';
    actionBtn.textContent = 'Start';
  } else if (mode === 'paused') {
    overlayTitle.textContent = 'Paused';
    overlayMsg.textContent = '';
    actionBtn.textContent = 'Resume';
  } else if (mode === 'over') {
    overlayTitle.textContent = state.won ? 'You win!' : 'Game over';
    overlayMsg.textContent = `Score: ${state.score}`;
    actionBtn.textContent = 'Restart';
  }
}

function setMode(m) {
  mode = m;
  showOverlay();
}

function restart() {
  if (document.activeElement === diffSlider) diffSlider.blur(); // so game keys steer
  if (document.activeElement === sizeSelect) sizeSelect.blur();
  size = clampBoardSize(sizeSelect.value);
  level = Number(diffSlider.value);
  baseMs = baseTickMs(level);
  stepMs = speedStepMs(level);
  state = createGame({ cols: size, rows: size });
  prevSnake = snapshotSnake(state.snake);
  acc = 0;
  resize();
  setMode('running');
}

function action() {
  if (online) return;
  if (mode === 'over' || mode === 'start') restart();
  else if (mode === 'paused') setMode('running');
  actionBtn.blur();
}

function frame(t) {
  const dt = Math.min(t - last, 250);
  last = t;
  if (mode === 'running') {
    acc += dt;
    while (acc >= tickMs(state.score, baseMs, stepMs, MIN_TICK_MS)) {
      acc -= tickMs(state.score, baseMs, stepMs, MIN_TICK_MS);
      const before = state.score;
      prevSnake = snapshotSnake(state.snake);
      step(state);
      if (state.score > before) vibrate(HAPTIC_EAT);
      if (online && state.score > before) conn.send({ type: T.SCORE, score: state.score });
      if (!online && state.score > best) { best = state.score; saveHighScore(best); }
      if (state.gameOver) {
        vibrate(HAPTIC_OVER);
        if (online) {
          conn.send({ type: T.DEAD, score: state.score });
          mode = 'waiting';
          showOnlineOverlay('Waiting for opponent…', '', []);
        } else setMode('over');
        break;
      }
    }
    render();
  }
  requestAnimationFrame(frame);
}

sizeSelect.addEventListener('change', () => saveBoardSize(clampBoardSize(sizeSelect.value)));
diffSlider.addEventListener('input', updateDiffLabel);
diffSlider.addEventListener('change', () => {
  saveDifficulty(Number(diffSlider.value));
  updateDiffLabel();
});
// Pointer-driven changes: release focus so game keys work again.
// Keyboard steps keep focus so arrow keys can keep adjusting.
diffSlider.addEventListener('pointerup', () => diffSlider.blur());

window.addEventListener('keydown', (e) => {
  // Let arrow keys adjust the slider while it is focused.
  if (e.target === diffSlider && e.key.startsWith('Arrow')) return;
  // keys belong to the select while focused
  if (e.target === sizeSelect) return;
  if (e.target.closest && e.target.closest("#lobby")) return; // lobby inputs never steer
  if (e.ctrlKey || e.metaKey || e.altKey) return;
  if (shouldPreventDefault(e.key)) e.preventDefault();
  const act = keyToAction(e.key, mode);
  if (!act) return;
  if (act.type === 'dir') {
    if (mode === 'running') setDirection(state, act.dir);
  } else if (act.type === 'pause') {
    if (online) return;
    setMode(mode === 'running' ? 'paused' : 'running');
  } else if (act.type === 'start') {
    e.preventDefault();
    action();
  }
});

actionBtn.addEventListener('click', action);

// ---- Online lobby ----
const RELAY_URL = window.SNAKE_RELAY_URL || CONFIG_RELAY_URL;
const lobby = document.getElementById('lobby');
const lobbyChoice = document.getElementById('lobby-choice');
const lobbyRoom = document.getElementById('lobby-room');
const lobbyCode = document.getElementById('lobby-code');
const lobbyRoomCode = document.getElementById('lobby-room-code');
const lobbyWait = document.getElementById('lobby-wait');
const lobbyError = document.getElementById('lobby-error');
const lobbyShare = document.getElementById('lobby-share');
let conn = null;
const hud = document.getElementById('hud');
const banner = document.getElementById('banner');
const matchActions = document.getElementById('match-actions');
const readyBtn = document.getElementById('ready-btn');
const rematchBtn = document.getElementById('rematch-btn');
const exitBtn = document.getElementById('exit-btn');
let discTimer = null;
let reconnecting = false;
let roomCode = null;

function lobbyReset() {
  if (conn) { conn.close(); conn = null; }
  online = null;
  roomCode = null;
  lobbyChoice.hidden = false;
  lobbyRoom.hidden = true;
  lobbyError.textContent = '';
}
function openLobby(prefill) {
  lobbyReset();
  lobby.hidden = false;
  if (prefill) lobbyCode.value = prefill;
}
function closeLobby() {
  lobbyReset();
  lobby.hidden = true;
  lobbyCode.blur();
}
function enterRoom(code, creator) {
  roomCode = code;
  lobbyChoice.hidden = true;
  lobbyRoom.hidden = false;
  lobbyRoomCode.textContent = code;
  lobbyShare.hidden = !creator;
  lobbyWait.textContent = creator ? 'Waiting for opponent…' : 'Joined. Waiting for host…';
  lobbyError.textContent = '';
  conn = connect({ relayUrl: RELAY_URL, code, helloExtra: creator ? { level: clampDifficulty(Number(diffSlider.value)) } : {} });
  setupOnline();
  conn.on(T.ERROR, (m) => { if (online && online.round) { exitOnline(); return; } lobbyReset(); lobbyError.textContent = errorText(m.reason); });
  conn.on('status', (st) => { if (st === 'failed') { console.warn('relay connection failed', RELAY_URL, code); if (online && online.round) { exitOnline(); return; } lobbyReset(); lobbyError.textContent = errorText('connect_failed'); } });
  conn.on(T.OPPONENT_JOINED, () => { lobbyWait.textContent = 'Opponent joined!'; });
}
// ---- Online match ----
function showOnlineOverlay(title, msg, buttons) {
  overlayTitle.textContent = title;
  overlayMsg.textContent = msg;
  overlay.hidden = false;
  diffWrap.hidden = sizeWrap.hidden = onlineBtn.hidden = actionBtn.hidden = true;
  matchActions.hidden = buttons.length === 0;
  readyBtn.hidden = !buttons.includes('ready');
  rematchBtn.hidden = !buttons.includes('rematch');
  exitBtn.hidden = !buttons.includes('exit');
}
function updateBanner() {
  const t = reconnecting ? RECONNECTING_TEXT : (discTimer ? discTimer.text : '');
  banner.textContent = t;
  banner.hidden = !t;
}
function clearDisc() {
  if (discTimer) clearInterval(discTimer.id);
  discTimer = null;
  updateBanner();
}
function startDisc(graceMs) {
  clearDisc();
  const until = Date.now() + (graceMs || GRACE_SECONDS * 1000);
  const tick = () => {
    if (!discTimer) return;
    discTimer.text = disconnectText((until - Date.now()) / 1000);
    updateBanner();
  };
  discTimer = { id: setInterval(tick, 250), text: '' };
  tick();
}
function stopCountdown() {
  if (online && online.cdTimer) { clearInterval(online.cdTimer); online.cdTimer = null; }
}
function exitOnline() {
  stopCountdown();
  clearDisc();
  reconnecting = false;
  updateBanner();
  if (conn) { conn.close(); conn = null; }
  online = null;
  hud.hidden = true;
  matchActions.hidden = true;
  actionBtn.hidden = false;
  state = createGame({ cols: size, rows: size });
  mode = 'start';
  resize();
  showOverlay();
}
function onRoundStart(m) {
  stopCountdown();
  online.round = m.round;
  online.oppScore = 0;
  lobby.hidden = true;
  hud.hidden = false;
  level = m.level;
  baseMs = baseTickMs(level);
  stepMs = speedStepMs(level);
  size = BOARD_SIZE_DEFAULT;
  state = createGame({ cols: size, rows: size, rng: seededRng(m.seed) });
  prevSnake = snapshotSnake(state.snake);
  acc = 0;
  mode = 'countdown';
  overlay.hidden = true;
  resize();
  const begin = () => {
    stopCountdown();
    acc = 0;
    mode = 'running';
    overlay.hidden = true;
    banner.hidden = !(reconnecting || discTimer);
    updateBanner();
  };
  const tick = () => {
    const s = countdownSeconds(m.startsAt, Date.now());
    if (s <= 0) { begin(); return; }
    overlayTitle.textContent = `Round ${m.round}`;
    showOnlineOverlay(`Round ${m.round}`, `Starting in ${s}…`, []);
  };
  online.cdTimer = setInterval(tick, 100);
  tick();
}
function onRoundEnd(m) {
  stopCountdown();
  const slot = online.slot;
  const other = slot === 'p1' ? 'p2' : 'p1';
  online.wins = { me: m.wins[slot], opp: m.wins[other] };
  online.oppScore = m.scores[other];
  mode = 'waiting';
  const r = roundResult(m, slot);
  readyBtn.disabled = false;
  showOnlineOverlay(r.title, r.msg, ['ready']);
  render();
}
function onMatchEnd(m) {
  stopCountdown();
  mode = 'waiting';
  clearDisc();
  const r = matchResult(m, online.slot);
  showOnlineOverlay(r.title, r.msg, ['rematch', 'exit']);
}
function setupOnline() {
  online = { slot: null, oppScore: 0, wins: { me: 0, opp: 0 }, round: 0, cdTimer: null };
  conn.on(T.WELCOME, (m) => {
    if (!online) return;
    online.slot = m.slot;
    // Round 1 starts once both players are ready; the server keeps the flag until the opponent joins.
    if (!online.round && conn) conn.send({ type: T.READY });
  });
  conn.on(T.ROUND_START, (m) => { if (online) onRoundStart(m); });
  conn.on(T.OPPONENT_SCORE, (m) => { if (online) { online.oppScore = m.score; render(); } });
  conn.on(T.ROUND_END, (m) => {
    if (online && online.slot) onRoundEnd(m);
  });
  conn.on(T.MATCH_END, (m) => { if (online && online.slot) onMatchEnd(m); });
  conn.on(T.OPPONENT_LEFT, (m) => startDisc(m.graceMs));
  conn.on(T.OPPONENT_BACK, clearDisc);
  conn.on('status', (st) => { reconnecting = st === 'reconnecting'; updateBanner(); });
}
readyBtn.addEventListener('click', () => {
  if (!conn) return;
  conn.send({ type: T.READY });
  readyBtn.disabled = true;
  overlayMsg.textContent += '\nWaiting for opponent…';
});
exitBtn.addEventListener('click', () => { exitOnline(); });
rematchBtn.addEventListener('click', async () => {
  exitOnline();
  openLobby();
  await onCreate();
});

async function onCreate() {
  lobbyError.textContent = '';
  try {
    const res = await createRoom({ relayUrl: RELAY_URL });
    const code = normalizeCode(res && res.code);
    if (!code) throw new Error('bad code');
    enterRoom(code, true);
  } catch (err) {
    console.warn('createRoom failed', RELAY_URL, err);
    lobbyError.textContent = errorText('create_failed');
  }
}
function onJoin() {
  const code = normalizeCode(lobbyCode.value);
  if (!code) { lobbyError.textContent = 'Enter a 5-character room code.'; return; }
  enterRoom(code, false);
}
async function onShare() {
  if (!roomCode) return;
  const url = buildShareUrl(roomCode, location.href);
  try {
    if (navigator.share) await navigator.share({ title: 'Snake', text: 'Join my Snake match', url });
    else { await navigator.clipboard.writeText(url); lobbyWait.textContent = 'Link copied! Waiting for opponent…'; }
  } catch { /* share cancelled */ }
}
onlineBtn.addEventListener('click', () => openLobby());
document.getElementById('lobby-create').addEventListener('click', onCreate);
document.getElementById('lobby-join').addEventListener('click', onJoin);
document.getElementById('lobby-back').addEventListener('click', closeLobby);
lobbyShare.addEventListener('click', onShare);
lobbyCode.addEventListener('keydown', (e) => { if (e.key === 'Enter') onJoin(); });
lobbyCode.addEventListener('input', () => { lobbyCode.value = lobbyCode.value.toUpperCase(); });
const joinParam = parseJoinParam(location.search);
if (joinParam) openLobby(joinParam);

// Auto-pause when the tab/window loses focus; never auto-resume.
function autoPause() {
  if (online) return;
  const next = modeOnFocusLoss(mode);
  if (!next) return;
  acc = 0;
  setMode(next);
}
document.addEventListener('visibilitychange', () => { if (document.hidden) autoPause(); });
window.addEventListener('blur', autoPause);

// Touch: swipe on canvas + d-pad
let touchStart = null;
canvas.addEventListener('touchstart', (e) => {
  e.preventDefault();
  const t = e.changedTouches[0];
  touchStart = { x: t.clientX, y: t.clientY };
}, { passive: false });
canvas.addEventListener('touchmove', (e) => e.preventDefault(), { passive: false });
canvas.addEventListener('touchend', (e) => {
  e.preventDefault();
  if (!touchStart) return;
  const t = e.changedTouches[0];
  const dir = detectSwipe(t.clientX - touchStart.x, t.clientY - touchStart.y);
  touchStart = null;
  if (dir && mode === 'running') setDirection(state, dir);
}, { passive: false });
canvas.addEventListener('touchcancel', () => { touchStart = null; });

dpad.addEventListener('pointerdown', (e) => {
  const btn = e.target.closest('button[data-dir]');
  if (!btn) return;
  e.preventDefault();
  if (mode === 'running') setDirection(state, btn.dataset.dir);
});
// Block pinch-zoom gestures (iOS Safari)
document.addEventListener('gesturestart', (e) => e.preventDefault());

window.addEventListener('resize', resize);
resize();
showOverlay();
requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
