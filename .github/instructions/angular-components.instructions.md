---
applyTo: "src/app/components/**"
description: Rules for Angular components in the SicoLicenseStore web app.
---

# Component instructions

## Structure

Every component folder holds three files with the same base name:

```
my-feature/
├── my-feature.component.ts
├── my-feature.component.html   # omit for small components → inline template
└── my-feature.component.scss
```

Reference external files with paths relative to the `.ts` file
(`templateUrl: './my-feature.component.html'`).

## Decorator checklist

```ts
@Component({
  selector: 'app-my-feature',            // always the `app-` prefix
  imports: [MatButtonModule],            // standalone imports; no NgModule
  templateUrl: './my-feature.component.html',
  styleUrl: './my-feature.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
```

- Never write `standalone: true` — it is the default in Angular v20+.
- Never use `@HostBinding` / `@HostListener`; use the `host` object instead.

## State and inputs

- `input()` / `input.required()` and `output()` functions — not the decorators.
- Local state: `signal()`. Derived state: `computed()`. Never `mutate()`.
- Inject with `inject()`:

```ts
private readonly licenseService = inject(LicenseService);
protected readonly authService = inject(AuthService);
```

- Anything a template reads must be `public` or `protected`, never `private`.

## Templates

- `@if` / `@for` / `@switch` only; `@for` always with `track`.
- No arrow functions, no `new Date()`, no complex expressions — move logic into the
  component or a `computed()`.
- Prefer `computed()` over getters or method calls for values rendered in a template; a
  method in an interpolation runs on every change detection cycle.
- `class`/`style` bindings instead of `ngClass` / `ngStyle`.
- German UI strings; dates via `| date:'dd.MM.yyyy'`.

## Material usage

- Import only the specific Material modules a component needs.
- Feedback via `MatSnackBar` (German text, `duration: 3000` for success, `5000` for errors).
- Confirmations via `ConfirmDialogComponent` with `ConfirmDialogData`.
- Dialogs return `null` on cancel and a typed `…DialogResult` on confirm.

## Permissions

Any control that creates or deletes data must be wrapped in:

```html
@if (authService.canManageLicenses()) { … }
```

## Accessibility

- Icon-only buttons need an `aria-label` (a `matTooltip` alone is not enough).
- Keep DOM order equal to visual order; manage focus when opening/closing panels.
- Table rows that act as buttons need keyboard support and a visible focus indicator.

## Error handling

Subscribe with the object form and always handle `error`:

```ts
this.licenseService.getProjects(product, userName).subscribe({
  next: (data) => { /* … */ },
  error: (err) => {
    this.isLoading.set(false);
    this.snackBar.open('Fehler beim Laden der Daten.', 'OK', { duration: 5000 });
    console.error('Error loading projects:', err);
  },
});
```
