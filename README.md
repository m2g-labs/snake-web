# snake-web

A dependency-free snake game (vanilla JS + canvas).

## Gameplay
Steer the snake to eat food and grow. Hitting a wall or yourself ends the game. Your best score is saved in the browser (localStorage).

## Controls
**Desktop:** Arrow keys or WASD to steer; Space or P to pause/resume; Space or Enter to start/restart.

**Mobile:** swipe on the board to steer, or use the on-screen d-pad (shown on touch devices); tap the Start button to begin.

The layout adapts to the viewport and is usable from 360px wide up to desktop.

## Run
Serve the folder statically, e.g. `python3 -m http.server`, then open http://localhost:8000.
(ES modules require http, not `file://`.)

## Test
`npm test` (runs `node --test`).

## Deployment
Live: https://m2g-labs.github.io/snake-web/

Pushes to `main` run the tests and then deploy to GitHub Pages
(`.github/workflows/deploy.yml`). Pull requests run the tests (`.github/workflows/ci.yml`).

**Setup:** in the repository's Settings → Pages, set **Source** to **GitHub Actions**.
All asset paths are relative so the site works under `/snake-web/`.
