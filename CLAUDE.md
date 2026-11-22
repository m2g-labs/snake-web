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
- `src/haptics.js` – feature-detected `vibrate()` + haptic patterns (unit tested)
- `src/difficulty.js` – pure level (1–10) -> board size / base tick mapping; `src/storage.js` persists high score and difficulty
- Difficulty slider (`#difficulty-slider` in the start/game-over overlay) is applied on next start/restart and saved via `saveDifficulty`; the global keydown handler ignores arrow keys while it is focused, and it blurs on pointerup and at start/restart (not on keyboard change, so arrows keep adjusting)
- `test/*.test.js` – tests using `node:test`

## Commands
- Test: `npm test` (= `node --test`)
- Run: `python3 -m http.server` and open http://localhost:8000

## Rules
- Vanilla JS ES modules, no bundler, no dependencies.
- Pure logic lives in `src/game.js`; keep DOM code in `src/main.js`.
- Relative paths only (site is served under `/<repo>/` on GitHub Pages).
