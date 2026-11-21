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
  state.snake.forEach((s, i) => {
    ctx.fillStyle = i === 0 ? '#7f7' : '#0c0';
    ctx.fillRect(s.x * cell + 1, s.y * cell + 1, cell - 2, cell - 2);
  });
}
