---
applyTo: "src/environments/**,angular.json,package.json,Dockerfile,nginx.conf,railway.json,railway.toml"
description: Build, environment and versioning rules.
---

# Build, environment and release instructions

## Environments

`src/environments/environment.ts` (dev) and `environment.prod.ts` (prod) must always expose
the **same keys**:

```ts
export const environment = {
  production: false,
  apiBaseUrl: 'https://sicotronictest.de:9443',
  version: '1.0.0.0',
};
```

`angular.json` currently declares **no `fileReplacements`**, so the production build also
uses `environment.ts`. Until that is wired up, every change to `environment.ts` has to be
mirrored in `environment.prod.ts` by hand, otherwise the two silently drift.

## Version number

- Format: 4-part `major.minor.patch.build` (e.g. `1.0.0.0`) — same scheme as the WPF
  application this app replaces.
- Single source of truth: `environment.version`. Never hard-code a version in a template.
- It is rendered next to the "SicoLicenseStore" title in the dashboard toolbar.
- Bump it in **both** environment files in the same commit as the change it ships.

  | Part | Bump when |
  |------|-----------|
  | major | breaking change / new backend contract |
  | minor | new feature |
  | patch | bug fix |
  | build | rebuild or deployment-only change |

## Commands

```bash
npm install                            # install
npm start                              # dev server on :4200
npm run build                          # production build (default configuration)
npm run watch                          # development build in watch mode
```

There is no test setup in this repo (`skipTests: true` in `angular.json`), so do not claim
tests were run — verify changes with a build and, where useful, in the browser.

## Budgets

Production budgets: initial bundle warns at 500 kB / fails at 1 MB, per-component styles
warn at 4 kB / fail at 8 kB. New Material imports are the usual reason the initial budget
grows — import single Material entry points, never the whole library.

## Deployment

Docker multi-stage build (Node 22 → nginx:alpine) deployed on Railway; `main` auto-deploys.
`nginx.conf` handles SPA fallback routing, gzip, asset caching and `/health`. Changing the
build output path means updating both the `Dockerfile` copy step and `nginx.conf`.
