import { createGame, setDirection, step, tickMs } from './game.js';
import { keyToAction, shouldPreventDefault } from './input.js';
import { loadHighScore, saveHighScore } from './storage.js';
import { draw, resizeCanvas } from './render.js';

const COLS = 20;
const ROWS = 20;

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
const scoreEl = document.getElementById('score');
const overlay = document.getElementById('overlay');
const overlayTitle = document.getElementById('overlay-title');
const overlayMsg = document.getElementById('overlay-msg');
const bestEl = document.getElementById('best');
const actionBtn = document.getElementById('action');

let state = createGame({ cols: COLS, rows: ROWS });
let mode = 'start'; // start | running | paused | over
let cell = 1;
let dpr = 1;
let best = loadHighScore();
let acc = 0;
let last = 0;

function resize() {
  dpr = window.devicePixelRatio || 1;
  const w = Math.min(window.innerWidth - 16, 800);
  const h = window.innerHeight - 70;
  cell = resizeCanvas(canvas, w, h, COLS, ROWS, dpr);
  render();
}

function render() {
  draw(ctx, state, cell, dpr);
  scoreEl.textContent = `Score: ${state.score}`;
  bestEl.textContent = `Best: ${best}`;
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
    while (acc >= tickMs(state.score)) {
      acc -= tickMs(state.score);
      step(state);
      if (state.score > best) { best = state.score; saveHighScore(best); }
      if (state.gameOver) {
        setMode('over');
        break;
      }
    }
    render();
  }
  requestAnimationFrame(frame);
}

window.addEventListener('keydown', (e) => {
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
window.addEventListener('resize', resize);
resize();
showOverlay();
requestAnimationFrame((t) => { last = t; requestAnimationFrame(frame); });
