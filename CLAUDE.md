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
- `test/*.test.js` – tests using `node:test`

## Commands
- Test: `npm test` (= `node --test`)
- Run: `python3 -m http.server` and open http://localhost:8000

## Rules
- Vanilla JS ES modules, no bundler, no dependencies.
- Pure logic lives in `src/game.js`; keep DOM code in `src/main.js`.
- Relative paths only (site is served under `/<repo>/` on GitHub Pages).
