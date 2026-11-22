import { createGame, setDirection, step, tickMs } from './game.js';
import { detectSwipe } from './swipe.js';
import { keyToAction, shouldPreventDefault, modeOnFocusLoss } from './input.js';
import { loadHighScore, saveHighScore, loadDifficulty, saveDifficulty } from './storage.js';
import { boardSize, baseTickMs } from './difficulty.js';
import { vibrate, HAPTIC_EAT, HAPTIC_OVER } from './haptics.js';
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

let level = loadDifficulty(); // level applied to the current/next game
let size = boardSize(level);
let baseMs = baseTickMs(level);
diffSlider.value = String(level);

function updateDiffLabel() {
  const l = Number(diffSlider.value);
  diffLabel.textContent = `Level ${l} · ${boardSize(l)}×${boardSize(l)} board · ${baseTickMs(l)} ms/tick`;
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
  level = Number(diffSlider.value);
  size = boardSize(level);
  baseMs = baseTickMs(level);
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
    while (acc >= tickMs(state.score, baseMs)) {
      acc -= tickMs(state.score, baseMs);
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
