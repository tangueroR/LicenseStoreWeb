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
- **4-Tab Dashboard** — One tab per product (Sico6000, Sico2020, Sico1010, Sico5000)
- **License Table** — Sortable/paginated Material table, default sorted by date (newest first)
- **Smart Filter** — Supports text search, single date (`dd.MM.yyyy`), date range (`01.01.2005 - 30.06.2025`), year (`2026`), and year range (`2020 - 2025`)
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
│   │   ├── license-dashboard/      # Tab container (4 tabs)
│   │   ├── license-table/          # Reusable table per product
│   │   ├── create-license-dialog/  # Password generation dialog
│   │   └── confirm-dialog/         # Delete confirmation
│   ├── services/
│   │   ├── auth.service.ts         # JWT auth, token storage
│   │   └── license.service.ts      # API calls (CRUD per product)
│   ├── guards/
│   │   └── auth.guard.ts           # Route protection
│   ├── interceptors/
│   │   └── auth.interceptor.ts     # Bearer token injection
│   └── models/
│       └── sico-anlage.model.ts    # TypeScript interfaces
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
