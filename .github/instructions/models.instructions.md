---
applyTo: "src/app/models/**"
description: Rules for the shared data model.
---

# Model instructions

All shared interfaces and types live in `sico-anlage.model.ts`. Dialog-local
`…DialogData` / `…DialogResult` interfaces stay next to their dialog component.

## Legacy field overloading

`SicoAnlage` mirrors the legacy WPF `Anlage` table. Field names are historic and **must not
be renamed** — the backend serializes exactly these names.

| Field | Sico1010 / Sico5000 | Sico2020 / Sico6000 |
|-------|---------------------|---------------------|
| `password` | Password | Password |
| `modemPassword` | Modem password | **Server IP address** |
| `password3` | *(unused)* | **Wireguard address** |
| `password4` | Premium password | Premium password |
| `password5` | **Version** | **Version** |

Further encodings that live outside the type system:

- `LicenseResponse.modemPassword` may carry `"IP|Wireguard"` for network products.
- `LicenseRequest.userName` carries `user|wireguard|ip` when creating a network license.

When you add a mapping helper, put it in the component that renders the value and name it
after the **meaning**, not the field (`getRowWireguardAddress`, not `getPassword3`).

## Rules

- Interfaces, not classes — these are plain DTOs.
- No optional fields unless the backend really omits them; use `?? ''` at the read site.
- `ProductType` is the single source of truth for product ids:
  `'sico1010' | 'sico2020' | 'sico5000' | 'sico6000'`. Never use bare strings.
- Adding a product means: extend `ProductType`, add a tab in
  `license-dashboard.component.ts`, and decide its column set in `license-table.component.ts`.
