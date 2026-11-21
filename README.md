# snake-web

A dependency-free snake game (vanilla JS + canvas).

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
