import { createGame, setDirection, step } from './game.js';
import { detectSwipe } from './swipe.js';
import { draw, resizeCanvas } from './render.js';

const COLS = 20;
const ROWS = 20;
const TICK_MS = 120;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const dpad = document.getElementById('dpad');
const actionBtn = document.getElementById('action');

let state = createGame({ cols: COLS, rows: ROWS });
let mode = 'start'; // start | running | paused | over
let cell = 1;
let dpr = 1;
let acc = 0;
let last = 0;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const w = Math.min(window.innerWidth - 16, 800);
  const h = window.innerHeight - 70 - (dpad.offsetHeight || 0);
  cell = resizeCanvas(canvas, w, h, COLS, ROWS, dpr);
  render();
}

function render() {
  draw(ctx, state, cell, dpr);
  scoreEl.textContent = `Score: ${state.score}`;
}

function showOverlay() {
  overlay.hidden = mode === 'running';
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
  state = createGame({ cols: COLS, rows: ROWS });
  acc = 0;
  render();
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
    while (acc >= TICK_MS) {
      acc -= TICK_MS;
      step(state);
      if (state.gameOver) {
        setMode('over');
        break;
      }
    }
    render();
  }
  requestAnimationFrame(frame);
}

const KEYS = {
  ArrowUp: 'up', ArrowDown: 'down', ArrowLeft: 'left', ArrowRight: 'right',
  w: 'up', s: 'down', a: 'left', d: 'right',
  W: 'up', S: 'down', A: 'left', D: 'right',
};

window.addEventListener('keydown', (e) => {
  if (e.key === ' ' || e.key === 'p' || e.key === 'P') {
    e.preventDefault();
    if (mode === 'running') setMode('paused');
    else if (mode === 'paused') setMode('running');
    return;
  }
  if (e.key === 'Enter' && mode !== 'running') {
    e.preventDefault();
    action();
    return;
  }
  const dir = KEYS[e.key];
  if (dir) {
    e.preventDefault();
    if (mode === 'running') setDirection(state, dir);
  }
});

actionBtn.addEventListener('click', action);

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
