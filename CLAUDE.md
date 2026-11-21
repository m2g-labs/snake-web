# snake-web

A dependency-free static snake game (vanilla JS ES modules + HTML canvas), playable on desktop (arrow keys/WASD) and mobile (swipe + on-screen d-pad), deployed to GitHub Pages via GitHub Actions. Defaults chosen: no framework or bundler; tests use Node's built-in test runner (`node --test`) on a pure game-logic module; high score stored in localStorage; relative asset paths so it works under the /<repo>/ Pages subpath.

Created by the agent factory from m2g-labs/agent-factory#4.

## Conventions
- Small PRs, each with tests.
- Keep this file up to date with how to build, test and run the project.
