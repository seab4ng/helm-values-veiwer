# Contributing

## Project structure

| File | Purpose |
|---|---|
| `app/index.html` | All frontend logic — single file, no build step |
| `app/lib.js` | Pure utility functions (flatten, coerce, chart tree, search) |
| `tests/unit.js` | Unit tests for `lib.js` (Node.js built-in runner) |
| `tests/e2e/` | Playwright end-to-end tests |
| `Dockerfile` | Two-stage build: Node (vendor js-yaml) → nginx (serve) |

## How to run locally

```bash
# Serve the app
npx serve app -p 3000

# Unit tests
node --test tests/unit.js

# E2E tests (requires Chrome)
npm ci
npx playwright install --with-deps chromium
npx playwright test
```

## Making changes

1. Fork the repo and create a branch: `git checkout -b feature/my-change`
2. Make your changes in `app/index.html` or `app/lib.js`
3. Run unit tests: `node --test tests/unit.js`
4. If you changed any user-visible behaviour, update or add E2E tests in `tests/e2e/`
5. Open a pull request against `main`

## Guidelines

- Keep the app a single HTML file with no build step — no bundlers, no transpilers
- All logic that can be pure functions belongs in `lib.js` with a matching unit test
- Do not introduce external runtime dependencies (the app is airgapped by design)
- Test both Chrome and Edge if you change anything related to the File System Access API
