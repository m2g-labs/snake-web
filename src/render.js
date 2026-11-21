// Canvas drawing only. No game rules: it reads state produced by game.js.

export const FOOD_ICONS = ['🍎','🍒','🍇','🍓','🍊'];

export function fitCellSize(availW, availH, cols, rows) {
  return Math.max(1, Math.floor(Math.min(availW / cols, availH / rows)));
}

// Sizes the canvas backing store for the device pixel ratio; returns CSS cell size.
export function resizeCanvas(canvas, availW, availH, cols, rows, dpr = 1) {
  const cell = fitCellSize(availW, availH, cols, rows);
  const w = cell * cols;
  const h = cell * rows;
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  return cell;
}

export function draw(ctx, state, cell, dpr = 1) {
  const w = state.cols * cell;
  const h = state.rows * cell;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#000';
  ctx.fillRect(0, 0, w, h);
  ctx.strokeStyle = '#141414';
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (let x = 1; x < state.cols; x++) { ctx.moveTo(x * cell, 0); ctx.lineTo(x * cell, h); }
  for (let y = 1; y < state.rows; y++) { ctx.moveTo(0, y * cell); ctx.lineTo(w, y * cell); }
  ctx.stroke();
  if (state.food && cell >= 10) {
    ctx.font = `${Math.round(cell * 0.8)}px serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = '#fff';
    const icon = FOOD_ICONS[(state.food.kind || 0) % FOOD_ICONS.length];
    ctx.fillText(icon, state.food.x * cell + cell / 2, state.food.y * cell + cell / 2);
  } else if (state.food) {
    ctx.fillStyle = '#f33';
    ctx.fillRect(state.food.x * cell + 1, state.food.y * cell + 1, cell - 2, cell - 2);
  }
  if (cell < 6) {
    state.snake.forEach((s, i) => {
      ctx.fillStyle = i === 0 ? '#7f7' : '#0c0';
      ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
    });
  } else {
    drawSnake(ctx, state.snake, cell);
  }
}

// Direction the head faces, from snake[0] relative to snake[1]. The board wraps,
// so a delta larger than 1 is a wrap-around and is inverted.
export function headDirection(snake) {
  if (!snake || snake.length < 2) return 'right';
  let dx = snake[0].x - snake[1].x;
  let dy = snake[0].y - snake[1].y;
  if (Math.abs(dx) > 1) dx = -Math.sign(dx);
  if (Math.abs(dy) > 1) dy = -Math.sign(dy);
  if (dx > 0) return 'right';
  if (dx < 0) return 'left';
  if (dy > 0) return 'down';
  if (dy < 0) return 'up';
  return 'right';
}

// Body thickness radius: ~0.45*cell at the head, tapering linearly to ~0.25*cell at the tail.
export function segmentRadius(i, length, cell) {
  const t = length > 1 ? i / (length - 1) : 0;
  return Math.max(1, cell * (0.45 - 0.2 * t));
}

const DIRS = { up: [0, -1], down: [0, 1], left: [-1, 0], right: [1, 0] };

function drawSnake(ctx, snake, cell) {
  const n = snake.length;
  const c = (s) => [s.x * cell + cell / 2, s.y * cell + cell / 2];
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  // Tail to head so the head overlaps the body.
  for (let i = n - 1; i >= 0; i--) {
    const [x, y] = c(snake[i]);
    const r = segmentRadius(i, n, cell);
    ctx.fillStyle = i % 2 ? '#0a0' : '#0c0';
    ctx.strokeStyle = ctx.fillStyle;
    if (i < n - 1 && Math.abs(snake[i].x - snake[i + 1].x) <= 1 && Math.abs(snake[i].y - snake[i + 1].y) <= 1) {
      const [px, py] = c(snake[i + 1]);
      ctx.lineWidth = 2 * Math.min(r, segmentRadius(i + 1, n, cell));
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(x, y);
      ctx.stroke();
    }
    ctx.beginPath();
    ctx.arc(x, y, r, 0, Math.PI * 2);
    ctx.fill();
  }
  // Head
  const [hx, hy] = c(snake[0]);
  const [dx, dy] = DIRS[headDirection(snake)];
  const hr = Math.min(cell / 2, segmentRadius(0, n, cell) * 1.1);
  if (cell >= 10) {
    ctx.strokeStyle = '#f33';
    ctx.lineWidth = Math.max(1, cell * 0.08);
    ctx.beginPath();
    ctx.moveTo(hx + dx * hr, hy + dy * hr);
    ctx.lineTo(hx + dx * (hr + cell * 0.25), hy + dy * (hr + cell * 0.25));
    ctx.stroke();
  }
  ctx.fillStyle = '#7f7';
  ctx.beginPath();
  ctx.arc(hx, hy, hr, 0, Math.PI * 2);
  ctx.fill();
  // Eyes: offset forward and to either side (perpendicular)
  const er = Math.max(1, cell * 0.12);
  for (const side of [-1, 1]) {
    const ex = hx + dx * hr * 0.35 + -dy * side * hr * 0.5;
    const ey = hy + dy * hr * 0.35 + dx * side * hr * 0.5;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(ex, ey, er, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#111';
    ctx.beginPath();
    ctx.arc(ex + dx * er * 0.35, ey + dy * er * 0.35, er * 0.5, 0, Math.PI * 2);
    ctx.fill();
  }
}
