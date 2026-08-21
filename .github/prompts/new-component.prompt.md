---
mode: agent
description: Scaffold a new standalone Angular component for this app.
---

Create a new standalone component under `src/app/components/<name>/`.

Requirements:

1. Three files: `<name>.component.ts`, `.html` and `.scss` (inline template only if the
   markup is under ~15 lines).
2. `@Component` with `selector: 'app-<name>'`, explicit Material imports,
   `changeDetection: ChangeDetectionStrategy.OnPush`, and **no** `standalone: true`.
3. `inject()` for all dependencies, `input()` / `output()` functions for the public API.
4. `signal()` for local state, `computed()` for anything derived.
5. Native control flow `@if` / `@for` (with `track`) in the template; no arrow functions and
   no globals in template expressions.
6. German UI strings, dates formatted `dd.MM.yyyy`.
7. SCSS using `--mat-sys-*` tokens — no hard-coded colors.
8. Accessible: labelled controls, `aria-label` on icon-only buttons, visible focus, WCAG AA
   contrast.
9. If the component reaches the backend, call `LicenseService` / `AuthService` and handle the
   `error` branch with a `MatSnackBar` message.

Finish by running `npm run build` and reporting the result.
