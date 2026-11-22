# snake-web

A dependency-free snake game (vanilla JS + canvas).

## Gameplay
Steer the snake to eat food and grow. The snake wraps around the walls; hitting yourself ends the game. Your best score is saved in the browser (localStorage).

## Controls
**Desktop:** Arrow keys or WASD to steer; Space or P to pause/resume; Space or Enter to start/restart.

**Mobile:** swipe on the board to steer, or use the on-screen d-pad (shown on touch devices); tap the Start button to begin.

The layout adapts to the viewport and is usable from 360px wide up to desktop.

## Run
Serve the folder statically, e.g. `python3 -m http.server`, then open http://localhost:8000.
(ES modules require http, not `file://`.)

## Test
`npm test` (runs `node --test`).

## Relay server (multiplayer scaffold)
`server/` holds a Cloudflare Worker + Durable Object (`Room`, SQLite-backed, Free plan). No npm dependencies:
`cd server && npx wrangler dev` starts it locally; `npx wrangler deploy` publishes it.
Routes: `POST /rooms` -> `{code}`; `GET /rooms/:code/ws` (WebSocket); unknown/expired code -> 404.

## Relay deployment (Cloudflare Workers)
`.github/workflows/worker.yml` deploys the relay on pushes to `main` that touch `server/**`, `src/match.js`, `src/protocol.js`, `src/rng.js` or `src/roomcode.js`. It runs `npm test`, then `npx wrangler deploy --config server/wrangler.toml`. If the secrets below are missing it skips the deploy with a warning.

Setup:
1. Create a free account at https://dash.cloudflare.com/sign-up and pick a `workers.dev` subdomain (Workers & Pages).
2. Create an API token (My Profile → API Tokens → Create Token) using the **Edit Cloudflare Workers** template (Workers Scripts: Edit permission).
3. Copy your Account ID (Workers & Pages overview page).
4. In the GitHub repo: Settings → Secrets and variables → Actions → add `CLOUDFLARE_API_TOKEN` and `CLOUDFLARE_ACCOUNT_ID`.
5. Push a change under `server/` (or re-run the workflow) to deploy.
6. Set `DEFAULT_RELAY_URL` in `src/config.js` to `https://snake-relay.<your-subdomain>.workers.dev`. For local dev, override with `?relay=http://localhost:8787` (e.g. with `cd server && npx wrangler dev`).

Free-tier limits (Workers Free plan, subject to Cloudflare changes): ~100,000 requests/day, 10 ms CPU per request; Durable Objects are available on Free only with SQLite storage (as used here), with daily request/duration/storage caps. Hibernating WebSockets keep idle rooms cheap; beyond the limits requests fail until the daily reset.

## Deployment
Live: https://m2g-labs.github.io/snake-web/

Pushes to `main` run the tests and then deploy to GitHub Pages
(`.github/workflows/deploy.yml`). Pull requests run the tests (`.github/workflows/ci.yml`).

**Setup:** in the repository's Settings → Pages, set **Source** to **GitHub Actions**.
All asset paths are relative so the site works under `/snake-web/`.
