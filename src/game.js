// Pure game logic (no DOM access) so it can be tested with node --test.
export const PLACEHOLDER = 'snake';

export function placeholder() {
  return PLACEHOLDER;
}

export const DIRS = {
  up: { x: 0, y: -1 },
  down: { x: 0, y: 1 },
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
};

export const FOOD_KINDS = 5;

function placeFood(state) {
  const occ = new Set(state.snake.map((s) => s.y * state.cols + s.x));
  const free = [];
  for (let i = 0; i < state.cols * state.rows; i++) if (!occ.has(i)) free.push(i);
  if (free.length === 0) return null;
  const i = free[Math.min(free.length - 1, Math.floor(state.rng() * free.length))];
  const kind = Math.min(FOOD_KINDS - 1, Math.floor(state.rng() * FOOD_KINDS));
  return { x: i % state.cols, y: Math.floor(i / state.cols), kind };
}

export function createGame({ cols = 20, rows = 20, rng = Math.random } = {}) {
  const x = Math.floor(cols / 2);
  const y = Math.floor(rows / 2);
  const snake = [{ x, y }];
  if (cols > 2) snake.push({ x: x - 1, y });
  const state = {
    cols, rows, rng, snake,
    dir: 'right', queue: [],
    food: null, score: 0, gameOver: false, won: false,
  };
  state.food = placeFood(state);
  return state;
}

const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' };

export function setDirection(state, dir) {
  if (!DIRS[dir] || state.gameOver) return;
  const last = state.queue.length ? state.queue[state.queue.length - 1] : state.dir;
  if (dir === last || dir === OPPOSITE[last]) return;
  if (state.queue.length >= 2) return;
  state.queue.push(dir);
}

export function step(state) {
  if (state.gameOver) return state;
  if (state.queue.length) state.dir = state.queue.shift();
  const d = DIRS[state.dir];
  const head = state.snake[0];
  const nh = { x: head.x + d.x, y: head.y + d.y };
  if (nh.x < 0 || nh.y < 0 || nh.x >= state.cols || nh.y >= state.rows) {
    state.gameOver = true;
    return state;
  }
  const eating = state.food && nh.x === state.food.x && nh.y === state.food.y;
  const body = eating ? state.snake : state.snake.slice(0, -1);
  if (body.some((s) => s.x === nh.x && s.y === nh.y)) {
    state.gameOver = true;
    return state;
  }
  state.snake.unshift(nh);
  if (eating) {
    state.score += 1;
    state.food = placeFood(state);
    if (!state.food) {
      state.won = true;
      state.gameOver = true;
    }
  } else {
    state.snake.pop();
  }
  return state;
}

export const BASE_TICK_MS = 120;
export const MIN_TICK_MS = 60;
export const TICK_STEP_MS = 3;

// Tick interval shrinks by TICK_STEP_MS per point, capped at MIN_TICK_MS.
export function tickMs(score) {
  const s = Number.isFinite(score) && score > 0 ? score : 0;
  return Math.max(MIN_TICK_MS, BASE_TICK_MS - s * TICK_STEP_MS);
}
