---
applyTo: "src/app/components/statistics/**"
description: Rules for the Statistik tab and every chart in the SicoLicenseStore web app.
---

# Chart instructions

The Statistik tab is the only place in the app that visualises data. Charts are built from
plain HTML/CSS — **do not add a charting library**; the initial bundle budget is 500 kB and
the shapes needed here are bars.

## Structure

| File | Responsibility |
|------|----------------|
| `license-statistics.component.*` | Loads the data, owns the range, aggregates into bands |
| `grouped-bar-chart.component.ts` | Presentational only — inputs in, bars out. No data access |

Keep that split. The chart component must never know about `SicoAnlage`, products, or the
`LicenseService`; it takes `series` + `groups` and renders them.

## Palette — do not pick colors by hand

The four product colors are a **validated categorical palette**, defined once as
`--viz-series-1…4` on the statistics component host and referenced through
`ProductInfo.colorSlot`:

| Slot | Product | Light |
|------|---------|-------|
| 1 | Sico6000 | `#2a78d6` |
| 2 | Sico2020 | `#eb6834` |
| 3 | Sico1010 | `#1baf7a` |
| 4 | Sico5000 | `#eda100` |

Rules:

- **Color follows the product, never the rank.** Changing the range must not repaint a series.
- The order is the colorblind-safety mechanism (adjacent-pair separation), not decoration.
  If you change a hue, re-validate the whole set before committing — lightness band, chroma
  floor, CVD separation and contrast, both for normal vision and simulated CVD.
- Two slots (aqua, yellow) sit below 3:1 against the light surface. That is allowed **only**
  because identity is also carried by the legend and the data table — never remove both.
- The app pins `color-scheme: light` in `src/styles.scss`. If dark mode is ever enabled, the
  dark steps must be picked and validated separately, not derived by inverting.

## One scale per chart

**Never plot two different units in the same chart.** Euro amounts and installation counts do
not share a scale: a 5.500 € bar next to a 96-installation bar flattens the installations to
nothing. A second y-axis is not the fix either — it invents a correlation the data does not
contain. Index both series to their own base period and compare the percentages, or use two
separate charts.

## Percentages

- The **first band of the range is the base and counts as 100 %**. Never index against an
  arbitrary period.
- A base of 0 has no percentage — render `–`, never `0 %` or `∞` (`formatIndex`).
- Changes are signed and carry the direction in the text (`+`, `−`, `±0 %`) before any color,
  so the meaning survives without color (`formatChange`).
- Partial periods stay marked ("Teiljahr"). A running period compared against a full one is
  not a like-for-like comparison and must say so.

- Comparing two indexed series is done in **percentage points**, never by subtracting the raw
  values (`formatPoints`).
- A percentage-point gap gets **no red/green** and no up/down direction: both series can be
  rising and the gap still be negative — it only says which one grew faster. Reserve the
  delta colors for numbers where a direction really is good or bad, and spell the gap out in
  words in a tooltip (`explainPoints`). Where a plain business figure explains it better —
  the average price per installation — show that column too and name it for what it is
  ("Ø Preis je Anlage"), not as a generic ratio.

## Manually entered licence amounts

- They live in `localStorage` only (`stats_manual_counts`), keyed by band label, and never
  go to the server. Guard every read and write with `try`/`catch` — private mode throws.
- Invalid input is rejected with a message; it never silently overwrites or clears a value.
- They are **money**, so they stay out of the bar chart (see "One scale per chart") and are
  formatted with `Intl.NumberFormat('de-DE', { style: 'currency', currency: 'EUR' })`.
- Visible to one user only (`MANUAL_FIGURES_USER`). That is a **display rule**, not access
  control — it holds only because the amounts never leave the browser. The moment they are
  stored server-side, the permission check belongs in the backend; a frontend `@if` protects
  nothing.

## Mark and chrome specs

- Bars: max 24px wide, `border-radius: 4px 4px 0 0` (rounded data end, square at the baseline),
  2px gap between neighbouring bars — the separator is the gap, never a border.
- Gridlines and axis: 1px, solid, recessive. Never dashed.
- Text never wears the series color. Labels, values and legend use the Material text tokens;
  identity comes from the colored swatch beside the text.
- Value axis ticks are whole numbers rounded to 1 / 2 / 5 × 10ⁿ.
- No value label on every bar — the numbers live in the table and the tooltip.

## Accessibility

- The plot carries `role="img"` and an `aria-label`; the table below it is the text
  alternative and must always show the same numbers.
- Every series appears in the legend, so identity is never color-alone.
- The table uses `<caption>`, `scope="col"` / `scope="row"`.

## Aggregation

- Ranges are inclusive: `[startOfDay(from), endOfDay(to)]`.
- Bands must **tile the range exactly** — no gaps, no overlaps — so the band totals add up to
  the range total. Verify new band logic numerically before shipping it.
- Use the helpers in `src/app/shared/german-date.ts`; do not re-implement date math.
- The API has no server-side date filter: all products are fetched once and filtered
  client-side. Rows without a parseable `releaseDate` are excluded and their count is shown.
