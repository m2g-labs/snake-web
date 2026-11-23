# snake-web

A dependency-free static snake game (vanilla JS ES modules + HTML canvas), playable on desktop (arrow keys/WASD) and mobile (swipe + on-screen d-pad), deployed to GitHub Pages via GitHub Actions. Defaults chosen: no framework or bundler; tests use Node's built-in test runner (`node --test`) on a pure game-logic module; high score stored in localStorage; relative asset paths so it works under the /<repo>/ Pages subpath.

Created by the agent factory from m2g-labs/agent-factory#4.

## Conventions
- Small PRs, each with tests.
- Keep this file up to date with how to build, test and run the project.

## Layout
- `index.html` – entry page; loads `src/main.js` via relative path as a module
- `style.css` – styles
- `src/main.js` – DOM/canvas/input wiring only
- `src/game.js` – pure game logic (no DOM), unit tested
- `src/swipe.js` – pure swipe detection (unit tested)
- `src/render.js` – canvas drawing (no game rules); snake drawn as a tapered rounded body with eyed head (square fallback if cell < 6); exports pure helpers `headDirection(snake)` and `segmentRadius(i, length, cell)`
- `src/rng.js` – pure seeded PRNG: `seededRng(seed)` (mulberry32, floats in [0,1)) and `randomSeed()` (uint32); pass as `createGame({rng})` for identical boards
- `src/board.js` – pure board size options (`BOARD_SIZES`, `BOARD_SIZE_DEFAULT`, `clampBoardSize`); persisted via `loadBoardSize`/`saveBoardSize` in `src/storage.js`
- `src/input.js` – pure key->action mapping
- `src/interp.js` – pure snake interpolation for smooth rendering: `interpolateSnake(prev, curr, alpha, cols, rows)` (wrap-aware, float positions) and `snapshotSnake(snake)` (deep copy)
- Smooth movement: `main.js` keeps `prevSnake`, snapshotted (`snapshotSnake`) before every `step()` and on new games (restart/online round start); `render()` passes the renderer `{snake: interpolateSnake(prevSnake, state.snake, alpha, cols, rows)}` with `alpha` from pure `frameAlpha({mode, gameOver, acc, tick, reducedMotion})` in `src/interp.js` (acc/tick while running, else 1). `prefers-reduced-motion: reduce` (read at startup, updated on `change`) turns smoothing off (alpha 1, snaps per tick)
- `src/haptics.js` – feature-detected `vibrate()` + haptic patterns (unit tested)
- `src/difficulty.js` – pure level (1–10) -> base tick / per-food speed-up step (`baseTickMs`, `speedStepMs`, `MIN_TICK_MS`) mapping; `src/storage.js` persists high score and difficulty
- Difficulty slider (`#difficulty-slider` in the start/game-over overlay) is applied on next start/restart and saved via `saveDifficulty`; the global keydown handler ignores arrow keys while it is focused, and it blurs on pointerup and at start/restart (not on keyboard change, so arrows keep adjusting)
- `src/roomcode.js` – pure room-code generation/`normalizeCode` (shared with the client)
- `server/` – Cloudflare Worker relay: `worker.js` (entry), `routes.js` (pure `route()` routing, unit tested), `room.js` (`Room` Durable Object, hibernation API, max 2 sockets), `wrangler.toml`. Run locally with `cd server && npx wrangler dev`; no npm deps, tests stay `node --test`
- `server/roomcore.js` – testable Room core (injected `send/now/setAlarm`; named `GRACE_MS`, `COUNTDOWN_MS`, `IDLE_MS`); `room.js` is thin socket glue persisting state in DO storage
- `src/match.js` – pure best-of-3 match referee (`createMatch/addPlayer/startRound/reportScore/reportDeath/forfeit`, each returns events to broadcast; draws replay the round); `src/protocol.js` – message type constants, `encode`/`decode` (null on invalid), protocol documented in its header comment
- Board size picker (`#board-size-select` in `#board-size`, shown only in start/over overlay like the difficulty slider) is persisted via `saveBoardSize`, read with `clampBoardSize` in `restart()` (grid is `size`×`size`, then `resize()`); independent of difficulty; the global keydown handler ignores all keys while it is focused, and it blurs at start/restart
- `src/config.js` – `RELAY_URL` (default placeholder, `?relay=` override via pure `resolveRelayUrl`)
- `src/lobby.js` – pure lobby helpers (`normalizeCode`, `parseJoinParam`, `buildShareUrl`, `errorText`); lobby panel `#lobby` in `index.html` wired in `main.js` (`?join=CODE` opens Join pre-filled; keydown ignored inside `#lobby`; relay URL from `window.SNAKE_RELAY_URL`)
- `src/net.js` – relay client: `connect({relayUrl, code, token, WebSocketImpl, storage, setTimeoutImpl, clearTimeoutImpl, now})` -> `{on(type, fn), send(msg), close()}` (connects to `<relayUrl>/rooms/<code>/ws`, sends `hello{token}` on open, token kept in sessionStorage as `snake-token:<code>`, auto-reconnect with 0.5s/1s/2s… backoff up to 15s after a connection has opened (if no socket ever opens, gives up after exported `INITIAL_MAX_ATTEMPTS = 3` attempts, ~1.5s, emitting `failed`), `status` events `connecting|open|reconnecting|failed`); `createRoom({relayUrl, fetchImpl})` POSTs `/rooms`, rejects on HTTP error (unit tested with fakes)
- `src/matchview.js` – pure HUD/result text (`hudText`, `roundResult`, `matchResult`, `disconnectText`, `countdownSeconds`). Online play in `main.js` (`online` state): `roundStart` -> countdown to `startsAt` then `createGame({rng: seededRng(seed)})` on the default board size at the room's `level`; sends `score` on eat and `dead{score}` on death; `roundEnd` stops the local game and shows result + Ready; `matchEnd` shows Rematch/Exit; `#banner` shows opponent-disconnect countdown / "Reconnecting…"; online games never touch the single-player high score; pause/auto-pause disabled online
- `test/*.test.js` – tests using `node:test`

## Commands
- Test: `npm test` (= `node --test`)
- Run: `python3 -m http.server` and open http://localhost:8000

## Rules
- Vanilla JS ES modules, no bundler, no dependencies.
- Pure logic lives in `src/game.js`; keep DOM code in `src/main.js`.
- Relative paths only (site is served under `/<repo>/` on GitHub Pages).
