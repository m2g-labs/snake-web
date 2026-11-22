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
import { draw, resizeCanvas, availableBoardPx } from './render.js';

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
let mode = 'start'; // start | running | paused | over
let cell = 1;
let dpr = 1;
let best = loadHighScore();
let acc = 0;
let last = 0;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const { w, h } = availableBoardPx(window.innerWidth, window.innerHeight, dpad.offsetHeight || 0);
  cell = resizeCanvas(canvas, w, h, size, size, dpr);
  render();
}

function render() {
  draw(ctx, state, cell, dpr);
  scoreEl.textContent = `Score: ${state.score}`;
  bestEl.textContent = `Best: ${best}`;
}

function showOverlay() {
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
  acc = 0;
  resize();
  setMode('running');
}

function action() {
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
      step(state);
      if (state.score > before) vibrate(HAPTIC_EAT);
      if (state.score > best) { best = state.score; saveHighScore(best); }
      if (state.gameOver) {
        vibrate(HAPTIC_OVER);
        setMode('over');
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
    setMode(mode === 'running' ? 'paused' : 'running');
  } else if (act.type === 'start') {
    e.preventDefault();
    action();
  }
});

actionBtn.addEventListener('click', action);

// ---- Online lobby ----
const RELAY_URL = window.SNAKE_RELAY_URL || 'https://snake-relay.m2g-labs.workers.dev';
const lobby = document.getElementById('lobby');
const lobbyChoice = document.getElementById('lobby-choice');
const lobbyRoom = document.getElementById('lobby-room');
const lobbyCode = document.getElementById('lobby-code');
const lobbyRoomCode = document.getElementById('lobby-room-code');
const lobbyWait = document.getElementById('lobby-wait');
const lobbyError = document.getElementById('lobby-error');
const lobbyShare = document.getElementById('lobby-share');
let conn = null;
let roomCode = null;

function lobbyReset() {
  if (conn) { conn.close(); conn = null; }
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
  conn.on(T.ERROR, (m) => { lobbyReset(); lobbyError.textContent = errorText(m.reason); });
  conn.on('status', (st) => { if (st === 'failed') { lobbyReset(); lobbyError.textContent = errorText(''); } });
  conn.on(T.OPPONENT_JOINED, () => { lobbyWait.textContent = 'Opponent joined!'; });
}
async function onCreate() {
  lobbyError.textContent = '';
  try {
    const res = await createRoom({ relayUrl: RELAY_URL });
    const code = normalizeCode(res && res.code);
    if (!code) throw new Error('bad code');
    enterRoom(code, true);
  } catch {
    lobbyError.textContent = errorText('');
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
