import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';
import { MatTooltipModule } from '@angular/material/tooltip';

/** One series of the chart — one product */
export interface BarChartSeries {
  key: string;
  label: string;
  /** CSS color, normally a `var(--viz-series-N)` reference defined by the host */
  color: string;
}

/** One band on the x-axis — one calendar year or one rolling 12-month window */
export interface BarChartGroup {
  /** Main label under the band, e.g. "2024" */
  label: string;
  /** Second label line, e.g. "Teiljahr" or "bis 08.2026" */
  hint?: string;
  /** Value per series key; a missing key counts as 0 */
  values: Record<string, number>;
}

/** Number of gridline steps aimed for on the value axis */
const TICK_COUNT = 4;

@Component({
  selector: 'app-grouped-bar-chart',
  imports: [MatTooltipModule],
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    @if (bands().length === 0) {
      <p class="chart-empty">Keine Daten im gewählten Zeitraum.</p>
    } @else {
      <div class="chart">
        <div class="y-axis" aria-hidden="true">
          @for (tick of ticks(); track tick) {
            <span class="tick">{{ tick }}</span>
          }
        </div>

        <div class="plot" role="img" [attr.aria-label]="ariaLabel()">
          <div class="gridlines" aria-hidden="true">
            @for (tick of ticks(); track tick) {
              <span class="gridline"></span>
            }
          </div>
          <div class="bands">
            @for (band of bands(); track band.label) {
              <div class="band">
                @for (bar of band.bars; track bar.key) {
                  <div
                    class="bar-slot"
                    [matTooltip]="bar.label + ': ' + bar.value + ' Anlagen (' + band.label + ')'"
                  >
                    <span class="bar" [style.height.%]="bar.heightPercent" [style.background]="bar.color"></span>
                  </div>
                }
              </div>
            }
          </div>
        </div>

        <div class="band-labels" aria-hidden="true">
          @for (band of bands(); track band.label) {
            <div class="band-label">
              <span class="band-label-main">{{ band.label }}</span>
              @if (band.hint) {
                <span class="band-label-hint">{{ band.hint }}</span>
              }
            </div>
          }
        </div>
      </div>
    }
  `,
  styles: `
    :host {
      display: block;
    }

    .chart-empty {
      margin: 0;
      padding: 32px 0;
      text-align: center;
      color: var(--mat-sys-on-surface-variant);
    }

    .chart {
      display: grid;
      grid-template-columns: auto 1fr;
      column-gap: 8px;
      font-variant-numeric: tabular-nums;
    }

    .y-axis {
      display: flex;
      flex-direction: column;
      justify-content: space-between;
      height: 260px;
      font-size: 11px;
      line-height: 1;
      color: var(--viz-muted);
    }

    .tick {
      transform: translateY(-50%);
      text-align: right;
    }

    .plot {
      position: relative;
      height: 260px;
      border-bottom: 1px solid var(--viz-axis);
    }

    .gridlines {
      position: absolute;
      inset: 0;
      display: flex;
      flex-direction: column;
      justify-content: space-between;
    }

    .gridline {
      display: block;
      border-top: 1px solid var(--viz-grid);
    }

    .bands,
    .band-labels {
      display: flex;
      align-items: flex-end;
      gap: 12px;
    }

    .bands {
      position: absolute;
      inset: 0;
    }

    .band {
      flex: 1 1 0;
      min-width: 0;
      height: 100%;
      display: flex;
      align-items: flex-end;
      justify-content: center;
      /* 2px of surface between neighbouring bars — the separator is the gap, not a border */
      gap: 2px;
    }

    .bar-slot {
      flex: 0 1 24px;
      min-width: 4px;
      height: 100%;
      display: flex;
      align-items: flex-end;
    }

    .bar {
      display: block;
      width: 100%;
      border-radius: 4px 4px 0 0;
    }

    .band-labels {
      grid-column: 2;
      padding-top: 6px;
    }

    .band-label {
      flex: 1 1 0;
      min-width: 0;
      display: flex;
      flex-direction: column;
      align-items: center;
      text-align: center;
    }

    .band-label-main {
      font-size: 12px;
      font-weight: 500;
      color: var(--mat-sys-on-surface);
    }

    .band-label-hint {
      font-size: 10px;
      line-height: 1.3;
      color: var(--viz-muted);
    }
  `
})
export class GroupedBarChartComponent {
  readonly series = input.required<BarChartSeries[]>();
  readonly groups = input.required<BarChartGroup[]>();
  /** Describes the chart for screen readers; the table below carries the numbers */
  readonly caption = input('Balkendiagramm');

  /** Largest value on the chart — drives the axis scale */
  private readonly maxValue = computed(() => {
    const values = this.groups().flatMap((group) =>
      this.series().map((series) => group.values[series.key] ?? 0)
    );
    return values.length > 0 ? Math.max(...values) : 0;
  });

  /** Whole-number gridline step, rounded to 1 / 2 / 5 × 10ⁿ */
  private readonly tickStep = computed(() => {
    const rough = Math.max(1, this.maxValue()) / TICK_COUNT;
    const magnitude = 10 ** Math.floor(Math.log10(rough));
    const normalized = rough / magnitude;
    const factor = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10;
    return Math.max(1, factor * magnitude);
  });

  /** Axis maximum, rounded up to the next gridline */
  private readonly axisMax = computed(() => {
    const step = this.tickStep();
    return Math.max(step, Math.ceil(this.maxValue() / step) * step);
  });

  /** Tick values from top to bottom */
  readonly ticks = computed(() => {
    const step = this.tickStep();
    const values: number[] = [];
    for (let value = this.axisMax(); value >= 0; value -= step) {
      values.push(value);
    }
    return values;
  });

  /** Render model: bands with their bars and pre-computed heights */
  readonly bands = computed(() =>
    this.groups().map((group) => ({
      label: group.label,
      hint: group.hint,
      bars: this.series().map((series) => {
        const value = group.values[series.key] ?? 0;
        return {
          key: series.key,
          label: series.label,
          color: series.color,
          value,
          // A non-zero count always keeps a visible sliver
          heightPercent: value > 0 ? Math.max((value / this.axisMax()) * 100, 1) : 0
        };
      })
    }))
  );

  readonly ariaLabel = computed(
    () =>
      `${this.caption()}. Die einzelnen Werte stehen in der Tabelle unter dem Diagramm.`
  );
}
