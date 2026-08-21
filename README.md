# LicenseStoreWeb

Angular web application for managing Sico product licenses. Replaces the legacy WPF **SicoPassword** desktop application.

## Overview

LicenseStoreWeb provides a browser-based interface for generating, viewing, and deleting license passwords for four Sico product lines:

| Product | Type | Special Fields |
|---------|------|----------------|
| **Sico1010** | Standard | Password, Modem Password |
| **Sico5000** | Standard + Premium | Password, Modem Password, Premium Password |
| **Sico2020** | Network | Password, Premium Password, Server IP, Wireguard Address |
| **Sico6000** | Network | Password, Premium Password, Server IP, Wireguard Address |

## Features

- **JWT Authentication** — Login against the SicoLicenseStore backend (`/api/auth/login`)
- **Dashboard** — One tab per product (Sico6000, Sico2020, Sico1010, Sico5000) plus a **Statistik** tab
- **License Table** — Sortable/paginated Material table, default sorted by date (newest first)
- **Smart Filter** — Supports text search, single date (`dd.MM.yyyy`), date range (`01.01.2005 - 30.06.2025`), year (`2026`), and year range (`2020 - 2025`)
- **Range Presets** — "Zeitraum" button fills the Von/Bis fields with a ready-made range (last 12 months, last 2/3/4 years, year to date, one of the last four calendar years) and applies it; the filled dates stay editable
- **Statistics** — Licenses per period and product as a grouped bar chart plus a data table; range presets (last 12 months, last 2/3/5 years, year to date, last 5 calendar years, everything since 2012, single years), grouped by calendar year or by rolling 12-month windows. Built from plain HTML/CSS — no charting library
- **Scope switches** — Two checkboxes take Sico1010 out of the whole calculation, or count only genuinely sold ones (description carries a `xxxx-yyyy` word; a four-character label marks an update, not a sale)
- **Growth in percent** — The first period of the range is the base (100 %); every later period is shown relative to it, plus the change against the preceding period
- **Licence amounts (€)** — Manual input per period (monthly or yearly, switchable), stored in the browser only and visible to a single user. Kept out of the bar chart on purpose: euros and installation counts share no scale, so both series are indexed to their base period and compared in percentage points
- **Version Display** — 4-part version (`environment.version`) shown next to the app title in the toolbar
- **Detail Panel** — Shows selected row details: Neuron ID, Version, Project Name, Description, IP/Wireguard (network products), Password, Premium Password, Modem Password
- **Password Generation** — Create dialog with pre-fill from selected row; Wireguard/IP fields for Sico2020/6000
- **License Deletion** — Delete with confirmation dialog
- **Response Display** — Generated passwords shown in the detail panel (with IP/Wireguard parsing for network products)

## Architecture

```
src/
├── app/
│   ├── components/
│   │   ├── login/                  # JWT login form
│   │   ├── license-dashboard/      # Tab container (4 product tabs + Statistik)
│   │   ├── license-table/          # Reusable table per product
│   │   ├── statistics/             # Statistik tab + grouped bar chart
│   │   ├── create-license-dialog/  # Password generation dialog
│   │   └── confirm-dialog/         # Delete confirmation
│   ├── services/
│   │   ├── auth.service.ts         # JWT auth, token storage
│   │   └── license.service.ts      # API calls (CRUD per product)
│   ├── guards/
│   │   └── auth.guard.ts           # Route protection
│   ├── interceptors/
│   │   └── auth.interceptor.ts     # Bearer token injection
│   ├── shared/
│   │   └── german-date.ts          # dd.MM.yyyy parsing/formatting, month arithmetic
│   └── models/
│       ├── sico-anlage.model.ts    # TypeScript interfaces
│       └── product-info.model.ts   # Product lifecycle + chart color slot
└── environments/
    ├── environment.ts              # Dev (localhost)
    └── environment.prod.ts         # Production
```

## Backend

Communicates with **SicoLicenseStore** via REST API:

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/auth/login` | POST | Authenticate, receive JWT token |
| `/api/licenses/sico1010` | GET | Get all Sico1010 licenses |
| `/api/licenses/sico2020` | GET | Get all Sico2020 licenses |
| `/api/licenses/sico5000` | GET | Get all Sico5000 licenses |
| `/api/licenses/sico6000` | GET | Get all Sico6000 licenses |
| `/api/licenses/{product}` | POST | Generate password |
| `/api/licenses/{product}` | DELETE | Delete license |

Default backend URL: `https://sicotronictest.de:9443`

## Tech Stack

- **Angular 21** with standalone components
- **Angular Material** (azure-blue theme)
- **TypeScript** with signals-based reactivity
- **nginx** for production serving (Docker)

## Development

```bash
# Install dependencies
npm install

# Start dev server
ng serve
# → http://localhost:4200/

# Build for production
ng build --configuration=production
```

### Versioning

The app version uses the 4-part scheme `major.minor.patch.build` (same as the WPF
predecessor) and lives in `environment.version`. It is rendered next to the
"SicoLicenseStore" title in the toolbar. `angular.json` defines no `fileReplacements`, so
bump the value in **both** `environment.ts` and `environment.prod.ts` to keep them in sync.

## Documentation

`docs/` holds dated notes about what was changed and why — start there when a feature's
background is unclear.

## AI / Editor Instructions

`.github/copilot-instructions.md` holds the project-wide rules; path-scoped rules live in
`.github/instructions/*.instructions.md` (components, services, models, styles, build) and
reusable prompts in `.github/prompts/`. Read them before changing data-handling code — the
`SicoAnlage` fields carry different meanings per product.

## Deployment (Railway)

The app is configured for deployment on [Railway](https://railway.app) via Docker:

- **Dockerfile** — Multi-stage build: Node 22 (build) → nginx:alpine (serve)
- **railway.json** / **railway.toml** — Railway deployment configuration
- **nginx.conf** — SPA routing, gzip, asset caching, `/health` endpoint

Railway auto-deploys on push to `main` branch.

### Railway Setup

1. Create new project in Railway → "Deploy from GitHub repo"
2. Select `tangueroR/LicenseStoreWeb`
3. Railway detects the Dockerfile automatically
4. Go to **Settings → Networking → Generate Domain** to expose publicly

## Repository

- **GitHub**: [tangueroR/LicenseStoreWeb](https://github.com/tangueroR/LicenseStoreWeb)
- **Origin**: Replaces the WPF `SicoPassword` application (PasswortList.xaml)
