# SicoLicenseStore Web — Copilot / AI Agent Instructions

Angular 21 single-page app for creating and viewing Sico product licenses (license
passwords). Replaces the legacy WPF **SicoPassword** desktop application. All UI text is
**German**; all code, identifiers and comments are **English**.

## Quick facts

| Topic | Value |
|-------|-------|
| Framework | Angular 21, standalone components, signals |
| UI library | Angular Material 21 (M3, `mat.theme()`, azure-blue palette) |
| Language | TypeScript 5.9, `strict` |
| Styles | SCSS, one `.scss` per component, Material system variables (`--mat-sys-*`) |
| State | Signals — no NgRx, no RxJS `BehaviorSubject` stores |
| HTTP | `HttpClient` + functional interceptor (`authInterceptor`) |
| Tests | No test setup in this repo (`skipTests: true` in `angular.json`) |
| Package manager | npm (`npm@11.8.0`) |
| Build | `npm run build` (production is the default configuration) |
| Dev server | `npm start` → http://localhost:4200 |
| Deployment | Docker (nginx:alpine) → Railway, auto-deploy on push to `main` |

## Architecture

```
src/
├── app/
│   ├── components/
│   │   ├── login/                  # JWT login form
│   │   ├── license-dashboard/      # Toolbar + 4 product tabs
│   │   ├── license-table/          # Table, filter, detail panel (per product)
│   │   ├── create-license-dialog/  # Password generation dialog
│   │   └── confirm-dialog/         # Generic yes/no dialog
│   ├── services/                   # auth.service.ts, license.service.ts
│   ├── guards/auth.guard.ts        # Functional CanActivateFn
│   ├── interceptors/auth.interceptor.ts
│   └── models/sico-anlage.model.ts # ALL interfaces live here
└── environments/
    ├── environment.ts              # dev
    └── environment.prod.ts         # prod (keep in sync — see note below)
```

Routing (`app.routes.ts`) is fully lazy-loaded via `loadComponent`. Every new feature route
must be lazy too.

### Known repo quirks — do not "fix" without asking

- `src/app/app.html` and `src/app/app.scss` are **leftover CLI scaffolding**. The real root
  component `App` (`app.ts`) uses an inline template `<router-outlet />`. Do not edit
  `app.html`.
- `angular.json` has **no `fileReplacements`**, so `environment.prod.ts` is currently not
  wired into the production build. When you change `environment.ts`, mirror the change in
  `environment.prod.ts` so the two never drift.
- The backend list endpoint is `/api/projects/{product}` while create/delete live under
  `/api/licenses/{product}` — that asymmetry is intentional and matches the backend.

## Domain model — read this before touching data code

The backend reuses the legacy WPF `Anlage` table, so `SicoAnlage` fields are **overloaded
per product**. Never rename these fields, and never assume a field means what it is called.

| Field | Sico1010 / Sico5000 | Sico2020 / Sico6000 (network) |
|-------|---------------------|-------------------------------|
| `password` | Password | Password |
| `modemPassword` | Modem password | **Server IP address** |
| `password3` | *(unused)* | **Wireguard address** |
| `password4` | Premium password | Premium password |
| `password5` | **Version** | **Version** |
| `userName` | User | User |

Additional encodings:

- `LicenseResponse.modemPassword` may carry `"IP|Wireguard"` for network products — split on
  `|` (`getResponseIpAddress` / `getResponseWireguardAddress`).
- When creating a license for a network product, `LicenseRequest.userName` is encoded as
  `` `${userName}|${wireguardAddress}|${ipAddress}` `` (`buildNetworkUserName`).
- A `modemPassword` containing `|` is not a real IP and is hidden in the detail panel
  (`getRowIpAddress`).

Products: `'sico1010' | 'sico2020' | 'sico5000' | 'sico6000'` (`ProductType`).
Network products = `sico2020` and `sico6000`.

## Backend API

Base URL comes from `environment.apiBaseUrl` (default `https://sicotronictest.de:9443`).

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/login` | POST | Login, returns JWT + `isAdmin` / `canManageLicenses` |
| `/api/projects/{product}?userName=` | GET | List licenses of a product |
| `/api/licenses/{product}` | POST | Generate password |
| `/api/licenses/{product}/delete` | POST | Delete license |

`authInterceptor` attaches `Authorization: Bearer <token>` to every request. Auth state lives
in `localStorage` and is exposed as read-only signals from `AuthService`
(`isLoggedIn`, `isAdmin`, `canManageLicenses`, `userName`).

Anything that changes data must be guarded by `authService.canManageLicenses()` in the
template, exactly as the toolbar buttons in `license-table.component.html` do.

## TypeScript rules

- Strict type checking; prefer type inference when the type is obvious.
- Avoid `any`; use `unknown` when the type is uncertain.
- All shared interfaces go into `src/app/models/sico-anlage.model.ts`. Dialog-specific
  `…DialogData` / `…DialogResult` interfaces stay next to their dialog component.

## Angular rules

- Standalone components only — never `NgModule`.
- Do **not** write `standalone: true`; it is the default since v20.
- Signals for state, `computed()` for derived state; never `mutate()`, use `set()`/`update()`.
- Lazy-load feature routes with `loadComponent`.
- No `@HostBinding` / `@HostListener` — use the `host` object in the decorator.
- `NgOptimizedImage` for static images (not for inline base64).
- Prefer `inject()` over constructor injection in **new** code.

### Components

- Small, single-responsibility.
- `input()` / `output()` functions instead of `@Input()` / `@Output()` decorators in new code.
- `changeDetection: ChangeDetectionStrategy.OnPush` for new components.
- Inline templates for small components; otherwise paths relative to the component `.ts`.
- Reactive forms preferred over template-driven for new forms.
- `class`/`style` bindings — never `ngClass` / `ngStyle`.

### Templates

- Native control flow `@if` / `@for` / `@switch` — never `*ngIf` / `*ngFor` / `*ngSwitch`.
- `@for` always needs `track`.
- No arrow functions and no globals like `new Date()` in templates.
- Keep logic out of templates; put it in the component or a `computed()`.
- Use the `async` pipe for observables.

### Services

- One responsibility per service, `providedIn: 'root'`.
- `inject()` instead of constructor injection.
- Services return `Observable`s; components subscribe and map into signals.

## Accessibility (hard requirement)

- Must pass all AXE checks and WCAG AA minimums.
- Every icon-only button needs an accessible name (`aria-label` or `matTooltip` + `aria-label`).
- Never encode information by color alone; keep 4.5:1 text contrast — prefer `currentColor`
  and `--mat-sys-*` tokens over hard-coded colors.
- Interactive rows/controls must be keyboard reachable and show a visible focus ring.

## Conventions

- File names: `kebab-case`, components `*.component.ts`, services `*.service.ts`.
- Prettier: `printWidth: 100`, `singleQuote: true` (config lives in `package.json`).
- German UI strings, German date format `dd.MM.yyyy`, German error/snackbar messages.
- Version number: 4-part (`major.minor.patch.build`, e.g. `1.0.0.0`) in
  `environment.version`, rendered in the dashboard toolbar. Bump it with every release.

## Path-specific instructions

More detailed rules live in `.github/instructions/*.instructions.md` and apply automatically
to the file globs declared in their front matter.
