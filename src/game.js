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

function placeFood(state) {
  const occ = new Set(state.snake.map((s) => s.y * state.cols + s.x));
  const free = [];
  for (let i = 0; i < state.cols * state.rows; i++) if (!occ.has(i)) free.push(i);
  if (free.length === 0) return null;
  const i = free[Math.min(free.length - 1, Math.floor(state.rng() * free.length))];
  return { x: i % state.cols, y: Math.floor(i / state.cols) };
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
