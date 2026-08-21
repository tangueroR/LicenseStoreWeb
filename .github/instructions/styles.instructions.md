---
applyTo: "**/*.scss"
description: Styling rules.
---

# Style instructions

## Theming

The app uses Angular Material 3 via `mat.theme()` in `src/styles.scss` (azure-blue primary,
blue tertiary, Roboto, density 0). Component styles must consume the generated system
variables instead of literal colors:

- `var(--mat-sys-primary)`, `var(--mat-sys-on-surface)`, `var(--mat-sys-on-surface-variant)`,
  `var(--mat-sys-surface)`.
- Tinted backgrounds: `color-mix(in srgb, var(--mat-sys-primary) 8%, transparent)`.
- `currentColor` for anything sitting on the primary toolbar.

Hard-coded hex values are only acceptable for the documented browser workarounds in
`src/styles.scss` (white dialog/menu surfaces for older browsers).

## Rules

- One `.scss` per component; component styles are scoped, so keep selectors flat and short.
- Nest at most two levels.
- Spacing in multiples of 4px.
- `border-radius: 8px` for cards, panels and table wrappers.
- Keep the `anyComponentStyle` budget in mind: warning at 4 kB, error at 8 kB.
- Do not use `::ng-deep` — put global Material overrides into `src/styles.scss`.
- Responsive: the license table already shrinks its font below 1200px; keep new toolbar
  items inside the existing `flex-wrap` layout instead of adding media queries.

## Contrast

Text must reach WCAG AA (4.5:1). Do not lower contrast with `opacity` on text; pick a proper
`--mat-sys-*` token or `currentColor` instead.
