import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormControl, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatButtonToggleModule } from '@angular/material/button-toggle';
import { MatCardModule } from '@angular/material/card';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDividerModule } from '@angular/material/divider';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatMenuModule } from '@angular/material/menu';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatSnackBar } from '@angular/material/snack-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { forkJoin } from 'rxjs';
import { PRODUCT_INFOS, ProductInfo } from '../../models/product-info.model';
import { ProductType, SicoAnlage } from '../../models/sico-anlage.model';
import { AuthService } from '../../services/auth.service';
import { LicenseService } from '../../services/license.service';
import {
  endOfDay,
  formatGermanDate,
  formatGermanMonth,
  monthsBefore,
  parseGermanDate,
  startOfDay
} from '../../shared/german-date';
import {
  BarChartGroup,
  BarChartSeries,
  GroupedBarChartComponent
} from './grouped-bar-chart.component';

/** How the selected range is cut into bars */
type Grouping = 'calendar' | 'rolling';

/** One bar band: a calendar year or a rolling 12-month window */
interface Band {
  label: string;
  hint?: string;
  /** Year the band is attributed to — used for the product lifecycle hints */
  year: number;
  start: Date;
  end: Date;
}

/** Oldest year offered as a preset — records reach back to about 2012 */
const EARLIEST_YEAR = 2012;

/** Calendar years shown by default and offered as single-year presets */
const DEFAULT_YEAR_SPAN = 5;

/** Hard stop for rolling windows, so a long range cannot produce hundreds of bars */
const MAX_ROLLING_BANDS = 20;

/**
 * A Sico1010 counts as genuinely sold when its description carries a four-character block,
 * a hyphen and another four-character block (e.g. `ABCD-1234`). A description of only four
 * characters marks an update of an existing installation, not a sale, and is left out.
 *
 * Adjust this one constant if the real descriptions follow a narrower rule (digits only,
 * fixed prefix, …) — nothing else in the component knows the format.
 */
const SOLD_SICO1010_PATTERN = /^[^\s-]{4}-[^\s-]{4}$/;

/**
 * Whether a Sico1010 row looks like a sale rather than an update. The pattern is matched
 * against whole words, not anywhere in the text, so a description like "Update-2024" does
 * not slip through just because "date-2024" happens to fit the shape.
 */
function isSoldSico1010(row: SicoAnlage): boolean {
  const description = row.description ?? '';
  return description.split(/\s+/).some((word) => SOLD_SICO1010_PATTERN.test(word));
}

/** localStorage keys for the two Sico1010 switches */
const INCLUDE_SICO1010_KEY = 'stats_include_sico1010';
const SOLD_SICO1010_ONLY_KEY = 'stats_sico1010_sold_only';

/** localStorage key for the manually entered licence amounts */
const MANUAL_STORAGE_KEY = 'stats_manual_counts';

/** localStorage key for what the entered amounts mean */
const MANUAL_UNIT_KEY = 'stats_manual_unit';

/**
 * What one entered amount stands for. It does not affect any percentage — an index is
 * scale-invariant — but it decides how the amount relates to a period's installation count.
 */
type AmountUnit = 'month' | 'year';

/**
 * Only this user sees the licence amounts. This hides the section in the UI — the figures
 * live in the browser's own localStorage and never reach the server, so this is a display
 * rule, not an access control boundary.
 */
const MANUAL_FIGURES_USER = 'radu';

/** Euro amounts are money, never a bar next to installation counts — they share no scale */
const EURO_FORMAT = new Intl.NumberFormat('de-DE', {
  style: 'currency',
  currency: 'EUR',
  maximumFractionDigits: 2
});

/** A percentage change, with the direction kept separate from the text for styling */
interface Change {
  text: string;
  direction: 'up' | 'down' | 'flat' | 'none';
}

/** Used whenever there is nothing to compare against — a missing base is not "0 %" */
const NO_CHANGE: Change = { text: '–', direction: 'none' };

/** Value relative to the base band as a number, or null when there is nothing to divide by */
function indexValue(value: number, base: number): number | null {
  return base > 0 ? (value / base) * 100 : null;
}

/** Value relative to the base band, e.g. "142 %". Without a base there is no percentage. */
function formatIndex(value: number, base: number): string {
  const index = indexValue(value, base);
  return index === null ? '–' : `${Math.round(index)} %`;
}

/**
 * Gap between two index values in percentage points. Two series measured in different units
 * (euros and installations) can only be compared once both are indexed to their own base.
 *
 * Deliberately without a direction: a negative value does not mean anything fell. Both series
 * can be growing and the gap still be negative — it only says which one grew faster.
 */
function formatPoints(value: number | null, reference: number | null): string {
  if (value === null || reference === null) return '–';
  const points = Math.round(value - reference);
  if (points === 0) return '±0 %-Pkt.';
  return `${points > 0 ? '+' : '−'}${Math.abs(points)} %-Pkt.`;
}

/** Signed growth against the base period, e.g. "+27 %" */
function signedGrowth(index: number): string {
  const growth = Math.round(index - 100);
  return `${growth > 0 ? '+' : growth < 0 ? '−' : '±'}${Math.abs(growth)} %`;
}

/** Spells out in words what the percentage-point gap means, so nobody reads it as a decline */
function explainPoints(
  amountIndex: number | null,
  countIndex: number | null,
  baseLabel: string
): string {
  if (amountIndex === null || countIndex === null) {
    return 'Kein Vergleich möglich — im Basiszeitraum fehlt ein Wert.';
  }
  const points = Math.round(amountIndex - countIndex);
  const comparison =
    points > 0
      ? 'Der Betrag entwickelt sich stärker als die Anlagenzahl.'
      : points < 0
        ? 'Der Betrag entwickelt sich schwächer als die Anlagenzahl — beide können trotzdem steigen.'
        : 'Beide entwickeln sich gleich.';
  return `Gegenüber ${baseLabel}: Betrag ${signedGrowth(amountIndex)}, Anlagen ${signedGrowth(countIndex)}. ${comparison}`;
}

/** Money as German currency, e.g. "5.500,00 €" */
function formatEuro(value: number): string {
  return EURO_FORMAT.format(value);
}

/** Signed change against an earlier value, e.g. "+32 %" */
function formatChange(value: number, previous: number): Change {
  if (previous <= 0) return NO_CHANGE;
  const percent = Math.round((value / previous - 1) * 100);
  if (percent === 0) return { text: '±0 %', direction: 'flat' };
  return {
    text: `${percent > 0 ? '+' : '−'}${Math.abs(percent)} %`,
    direction: percent > 0 ? 'up' : 'down'
  };
}

/** Reads the stored amounts; a broken or missing entry simply means "nothing entered yet" */
function readStoredManualAmounts(): Record<string, number> {
  try {
    const raw = localStorage.getItem(MANUAL_STORAGE_KEY);
    if (!raw) return {};
    const parsed: unknown = JSON.parse(raw);
    if (typeof parsed !== 'object' || parsed === null) return {};
    return Object.fromEntries(
      Object.entries(parsed as Record<string, unknown>).filter(
        (entry): entry is [string, number] => typeof entry[1] === 'number' && isFinite(entry[1])
      )
    );
  } catch {
    return {};
  }
}

/** Amounts live in the browser only — they are not part of the license data */
function storeManualAmounts(counts: Record<string, number>): void {
  try {
    localStorage.setItem(MANUAL_STORAGE_KEY, JSON.stringify(counts));
  } catch {
    // Private mode or a full quota — the figures then just do not survive a reload
  }
}

function readStoredFlag(key: string, fallback: boolean): boolean {
  try {
    const raw = localStorage.getItem(key);
    return raw === null ? fallback : raw === 'true';
  } catch {
    return fallback;
  }
}

function storeFlag(key: string, value: boolean): void {
  try {
    localStorage.setItem(key, String(value));
  } catch {
    // See storeManualAmounts
  }
}

function readStoredAmountUnit(): AmountUnit {
  try {
    return localStorage.getItem(MANUAL_UNIT_KEY) === 'year' ? 'year' : 'month';
  } catch {
    return 'month';
  }
}

function storeAmountUnit(unit: AmountUnit): void {
  try {
    localStorage.setItem(MANUAL_UNIT_KEY, unit);
  } catch {
    // See storeManualAmounts
  }
}

@Component({
  selector: 'app-license-statistics',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatButtonToggleModule,
    MatCardModule,
    MatCheckboxModule,
    MatDividerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatMenuModule,
    MatProgressBarModule,
    MatTooltipModule,
    GroupedBarChartComponent
  ],
  changeDetection: ChangeDetectionStrategy.OnPush,
  templateUrl: './license-statistics.component.html',
  styleUrl: './license-statistics.component.scss'
})
export class LicenseStatisticsComponent implements OnInit {
  private readonly licenseService = inject(LicenseService);
  private readonly authService = inject(AuthService);
  private readonly snackBar = inject(MatSnackBar);

  readonly isLoading = signal(false);
  readonly loadFailed = signal(false);

  /** Raw rows per product — loaded once, the range is then applied client-side */
  private readonly rowsByProduct = signal<Record<ProductType, SicoAnlage[]>>({
    sico6000: [],
    sico2020: [],
    sico1010: [],
    sico5000: []
  });

  /** Text in the "Von"/"Bis" inputs — only applied on demand */
  readonly dateFromControl = new FormControl('', { nonNullable: true });
  readonly dateToControl = new FormControl('', { nonNullable: true });

  /** The range the numbers below are based on */
  private readonly rangeFrom = signal(new Date());
  private readonly rangeTo = signal(new Date());

  readonly grouping = signal<Grouping>('calendar');

  /** Whether Sico1010 takes part in the calculation at all */
  readonly includeSico1010 = signal(readStoredFlag(INCLUDE_SICO1010_KEY, true));

  /** Whether only genuinely sold Sico1010 count, i.e. description `xxxx-yyyy` */
  readonly soldSico1010Only = signal(readStoredFlag(SOLD_SICO1010_ONLY_KEY, false));

  setIncludeSico1010(value: boolean): void {
    this.includeSico1010.set(value);
    storeFlag(INCLUDE_SICO1010_KEY, value);
  }

  setSoldSico1010Only(value: boolean): void {
    this.soldSico1010Only.set(value);
    storeFlag(SOLD_SICO1010_ONLY_KEY, value);
  }

  /** The products every number on this tab is built from */
  readonly activeProducts = computed(() =>
    this.includeSico1010()
      ? PRODUCT_INFOS
      : PRODUCT_INFOS.filter((info) => info.product !== 'sico1010')
  );

  /**
   * Fixed categorical order — a product keeps its color regardless of the range or of which
   * products are switched on, so nothing is repainted when Sico1010 drops out.
   */
  readonly series = computed<BarChartSeries[]>(() =>
    this.activeProducts().map((info) => ({
      key: info.product,
      label: info.label,
      color: `var(--viz-series-${info.colorSlot})`
    }))
  );

  /** The last calendar years, newest first — single-year presets */
  readonly recentYears = Array.from(
    { length: DEFAULT_YEAR_SPAN },
    (_, index) => new Date().getFullYear() - index
  );

  readonly earliestYear = EARLIEST_YEAR;

  ngOnInit(): void {
    this.applyLastCalendarYears(DEFAULT_YEAR_SPAN);
    this.loadData();
  }

  // --- data ---------------------------------------------------------------

  /** Loads every product in one go — the API has no server-side date filter */
  loadData(): void {
    this.isLoading.set(true);
    this.loadFailed.set(false);
    const userName = this.authService.userName();

    forkJoin({
      sico6000: this.licenseService.getProjects('sico6000', userName),
      sico2020: this.licenseService.getProjects('sico2020', userName),
      sico1010: this.licenseService.getProjects('sico1010', userName),
      sico5000: this.licenseService.getProjects('sico5000', userName)
    }).subscribe({
      next: (rows) => {
        this.rowsByProduct.set(rows);
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.loadFailed.set(true);
        this.snackBar.open('Fehler beim Laden der Statistikdaten.', 'OK', { duration: 5000 });
        console.error('Error loading statistics:', err);
      }
    });
  }

  /** Rows that go into the calculation once the Sico1010 description filter is applied */
  private readonly consideredRows = computed<Record<ProductType, SicoAnlage[]>>(() => {
    const rows = this.rowsByProduct();
    return {
      ...rows,
      sico1010: this.soldSico1010Only() ? rows.sico1010.filter(isSoldSico1010) : rows.sico1010
    };
  });

  /** Release dates per product as sorted timestamps — rows without a date drop out */
  private readonly timesByProduct = computed<Record<ProductType, number[]>>(() => {
    const rows = this.consideredRows();
    const result = {} as Record<ProductType, number[]>;
    for (const info of PRODUCT_INFOS) {
      result[info.product] = rows[info.product]
        .map((row) => new Date(row.releaseDate).getTime())
        .filter((time) => !isNaN(time))
        .sort((a, b) => a - b);
    }
    return result;
  });

  /**
   * Rows the backend returned without a usable release date — they cannot be counted.
   * Measured against the considered rows, so the description filter is not mistaken for
   * a missing date, and only for the products that are switched on.
   */
  readonly undatedCount = computed(() => {
    const rows = this.consideredRows();
    const times = this.timesByProduct();
    return this.activeProducts().reduce(
      (sum, info) => sum + (rows[info.product].length - times[info.product].length),
      0
    );
  });

  /** How many Sico1010 look sold — shown next to the checkbox so the rule can be checked */
  readonly sico1010Counts = computed(() => {
    const all = this.rowsByProduct().sico1010;
    return { total: all.length, sold: all.filter(isSoldSico1010).length };
  });

  // --- range --------------------------------------------------------------

  readonly rangeLabel = computed(
    () => `${formatGermanDate(this.rangeFrom())} bis ${formatGermanDate(this.rangeTo())}`
  );

  /** Apply whatever currently stands in the "Von"/"Bis" inputs */
  applyRange(): void {
    const from = parseGermanDate(this.dateFromControl.value);
    const to = parseGermanDate(this.dateToControl.value);

    if (!from || !to) {
      this.snackBar.open('Bitte Von und Bis im Format TT.MM.JJJJ eingeben.', 'OK', {
        duration: 5000
      });
      return;
    }
    if (from > to) {
      this.snackBar.open('Das Von-Datum liegt nach dem Bis-Datum.', 'OK', { duration: 5000 });
      return;
    }

    this.rangeFrom.set(from);
    this.rangeTo.set(to);
  }

  /** Range that ends today and starts the given number of months earlier */
  applyLastMonths(months: number): void {
    const today = new Date();
    this.setRange(monthsBefore(today, months), today, 'rolling');
  }

  /** Range that ends today and spans the given number of years */
  applyLastYears(years: number): void {
    this.applyLastMonths(years * 12);
  }

  /** 01.01. of the current year until today */
  applyYearToDate(): void {
    const today = new Date();
    this.setRange(new Date(today.getFullYear(), 0, 1), today, 'calendar');
  }

  /** The last n calendar years including the current one, up to today */
  applyLastCalendarYears(years: number): void {
    const today = new Date();
    this.setRange(new Date(today.getFullYear() - years + 1, 0, 1), today, 'calendar');
  }

  /** One full calendar year — clamped to today for the running year */
  applyCalendarYear(year: number): void {
    const today = new Date();
    const end = year === today.getFullYear() ? today : new Date(year, 11, 31);
    this.setRange(new Date(year, 0, 1), end, 'calendar');
  }

  /** Everything on record: 01.01.2012 until today */
  applyFullHistory(): void {
    const today = new Date();
    this.setRange(new Date(EARLIEST_YEAR, 0, 1), today, 'calendar');
  }

  private setRange(from: Date, to: Date, grouping: Grouping): void {
    this.dateFromControl.setValue(formatGermanDate(from));
    this.dateToControl.setValue(formatGermanDate(to));
    this.rangeFrom.set(from);
    this.rangeTo.set(to);
    this.grouping.set(grouping);
  }

  // --- aggregation --------------------------------------------------------

  /** The x-axis bands for the current range and grouping */
  private readonly bands = computed<Band[]>(() => {
    const from = startOfDay(this.rangeFrom());
    const to = endOfDay(this.rangeTo());
    return this.grouping() === 'rolling'
      ? this.rollingBands(from, to)
      : this.calendarBands(from, to);
  });

  /** One band per calendar year; the first and last one may be partial */
  private calendarBands(from: Date, to: Date): Band[] {
    const bands: Band[] = [];
    for (let year = from.getFullYear(); year <= to.getFullYear(); year++) {
      const yearStart = new Date(year, 0, 1);
      const yearEnd = endOfDay(new Date(year, 11, 31));
      const start = from > yearStart ? from : yearStart;
      const end = to < yearEnd ? to : yearEnd;
      const isPartial = start > yearStart || end < yearEnd;
      bands.push({
        label: String(year),
        hint: isPartial ? 'Teiljahr' : undefined,
        year,
        start,
        end
      });
    }
    return bands;
  }

  /** 12-month windows counted back from the end date — "jeweils zu diesem Tag ein Jahr zurück" */
  private rollingBands(from: Date, to: Date): Band[] {
    const bands: Band[] = [];

    for (let index = 0; index < MAX_ROLLING_BANDS; index++) {
      // Every window ends on an anniversary of the end date, so no drift builds up
      const end = index === 0 ? to : endOfDay(monthsBefore(to, 12 * index));
      const anchor = startOfDay(monthsBefore(to, 12 * (index + 1)));
      // The anniversary day belongs to the older window, so this one starts a day later
      const isOldest = anchor <= from;
      const start = isOldest
        ? from
        : new Date(anchor.getFullYear(), anchor.getMonth(), anchor.getDate() + 1);

      bands.push({
        label: formatGermanMonth(start),
        hint: `bis ${formatGermanMonth(end)}`,
        year: end.getFullYear(),
        start,
        end
      });
      if (isOldest) break;
    }

    return bands.reverse();
  }

  /** Number of licenses of one product created within a time window */
  private countBetween(product: ProductType, start: Date, end: Date): number {
    const startTime = start.getTime();
    const endTime = end.getTime();
    return this.timesByProduct()[product].filter((time) => time >= startTime && time <= endTime)
      .length;
  }

  /** Counts per band and product — computed once, reused by chart, tables and percentages */
  private readonly bandCounts = computed(() =>
    this.bands().map((band) => {
      const counts = this.activeProducts().map((info) =>
        this.countBetween(info.product, band.start, band.end)
      );
      return { band, counts, total: counts.reduce((sum, count) => sum + count, 0) };
    })
  );

  /**
   * Chart input: one group per band, one value per product. The euro amounts stay out of
   * the chart on purpose — a bar of 5.500 € next to a bar of 96 installations would flatten
   * the installations to nothing and compare two things that share no scale.
   */
  readonly chartGroups = computed<BarChartGroup[]>(() =>
    this.bandCounts().map(({ band, counts }) => ({
      label: band.label,
      hint: band.hint,
      values: Object.fromEntries(
        this.activeProducts().map((info, index) => [info.product, counts[index]])
      )
    }))
  );

  /** Table below the chart — same numbers, readable one by one */
  readonly tableRows = computed(() =>
    this.bandCounts().map(({ band, counts, total }) => ({
      label: band.label,
      hint: band.hint,
      cells: this.activeProducts().map((info, index) => ({
        product: info.product,
        // "–" only when the product genuinely was not on sale and no data contradicts it
        text: counts[index] === 0 && !this.wasOnSale(info, band.year) ? '–' : String(counts[index])
      })),
      total
    }))
  );

  /** Label of the band every percentage is measured against */
  readonly baseLabel = computed(() => this.bandCounts()[0]?.band.label ?? '');

  /** A growth comparison needs at least two bands */
  readonly hasGrowth = computed(() => this.bandCounts().length > 1);

  /** Label of the newest band — the other half of every card delta */
  readonly latestLabel = computed(() => this.bandCounts().at(-1)?.band.label ?? '');

  /**
   * The newest band is usually still running. Comparing it against a full base period
   * looks like a slump, so say so instead of letting the number speak alone.
   */
  readonly latestIsPartial = computed(() => this.bandCounts().at(-1)?.band.hint !== undefined);

  /** Explains which two periods a card delta compares */
  readonly changeTooltip = computed(() => {
    const base = `${this.latestLabel()} gegenüber ${this.baseLabel()}`;
    return this.latestIsPartial()
      ? `${base} — ${this.latestLabel()} ist noch nicht vollständig und daher nicht direkt vergleichbar.`
      : base;
  });

  /**
   * Growth table: the first band is the base and counts as 100 %, every later band is
   * expressed relative to it. The last column is the change against the band before.
   */
  readonly growthRows = computed(() => {
    const bands = this.bandCounts();
    if (bands.length === 0) return [];
    const base = bands[0];

    return bands.map((entry, index) => ({
      label: entry.band.label,
      hint: entry.band.hint,
      isBase: index === 0,
      cells: this.activeProducts().map((info, productIndex) => ({
        product: info.product,
        text: formatIndex(entry.counts[productIndex], base.counts[productIndex])
      })),
      totalText: formatIndex(entry.total, base.total),
      change: index > 0 ? formatChange(entry.total, bands[index - 1].total) : NO_CHANGE
    }));
  });

  /** Totals per product over the whole selected range, plus newest band vs. base band */
  readonly productSummaries = computed(() => {
    const bands = this.bandCounts();
    const first = bands[0];
    const last = bands[bands.length - 1];
    const start = startOfDay(this.rangeFrom());
    const end = endOfDay(this.rangeTo());

    return this.activeProducts().map((info, index) => ({
      label: info.label,
      note: info.note,
      color: `var(--viz-series-${info.colorSlot})`,
      count: this.countBetween(info.product, start, end),
      change: this.hasGrowth() ? formatChange(last.counts[index], first.counts[index]) : NO_CHANGE
    }));
  });

  /** All products together over the whole selected range */
  readonly totalInRange = computed(() =>
    this.productSummaries().reduce((sum, summary) => sum + summary.count, 0)
  );

  /** Newest band against the base band, all products together */
  readonly totalChange = computed(() => {
    const bands = this.bandCounts();
    return this.hasGrowth() ? formatChange(bands[bands.length - 1].total, bands[0].total) : NO_CHANGE;
  });

  // --- manually entered licence amounts -----------------------------------

  /** Euro amount per band label, e.g. { '2024': 5800 }. Browser-local, never sent anywhere. */
  private readonly manualAmounts = signal<Record<string, number>>(readStoredManualAmounts());

  readonly hasManualData = computed(() => Object.keys(this.manualAmounts()).length > 0);

  /** Whether one entered amount is a monthly or a yearly figure */
  readonly amountUnit = signal<AmountUnit>(readStoredAmountUnit());

  readonly amountColumnLabel = computed(() =>
    this.amountUnit() === 'month' ? 'Betrag (€ / Monat)' : 'Betrag (€ / Jahr)'
  );

  setAmountUnit(unit: AmountUnit): void {
    this.amountUnit.set(unit);
    storeAmountUnit(unit);
  }

  /** Only one user gets to see the amounts at all */
  readonly canSeeManualFigures = computed(() =>
    this.authService.userName().toLowerCase().includes(MANUAL_FIGURES_USER)
  );

  /** Current input value of one band, empty when nothing was entered */
  manualValue(label: string): string {
    const value = this.manualAmounts()[label];
    return value === undefined ? '' : String(value);
  }

  /** Takes the amount typed into one row; an empty field clears that entry again */
  onManualInput(label: string, event: Event): void {
    const raw = (event.target as HTMLInputElement).value.trim();

    if (raw !== '') {
      const parsed = Number(raw);
      if (!Number.isFinite(parsed) || parsed < 0) {
        this.snackBar.open('Bitte einen Betrag ab 0 eingeben.', 'OK', { duration: 5000 });
        return;
      }
      this.setManualAmount(label, Math.round(parsed * 100) / 100);
      return;
    }
    this.setManualAmount(label, null);
  }

  /** Throws away every entered amount */
  clearManualAmounts(): void {
    this.manualAmounts.set({});
    storeManualAmounts({});
  }

  private setManualAmount(label: string, value: number | null): void {
    this.manualAmounts.update((current) => {
      const next = { ...current };
      if (value === null) {
        delete next[label];
      } else {
        next[label] = value;
      }
      storeManualAmounts(next);
      return next;
    });
  }

  /**
   * Amounts next to the recorded installations. Euros and installations cannot be
   * subtracted from one another, so both are indexed to their own base period first and
   * only the two percentages are compared — the gap is in percentage points.
   */
  readonly manualRows = computed(() => {
    const bands = this.bandCounts();
    const amounts = this.manualAmounts();
    const baseRecorded = bands[0]?.total ?? 0;
    const baseAmount = bands.length > 0 ? (amounts[bands[0].band.label] ?? 0) : 0;
    // A period holds twelve months, so a monthly figure has to be annualised before it can
    // be divided by the installations of that period
    const monthsPerPeriod = this.amountUnit() === 'month' ? 12 : 1;

    return bands.map((entry, index) => {
      const amount = amounts[entry.band.label];
      const previousAmount = index > 0 ? amounts[bands[index - 1].band.label] : undefined;
      const amountIndex = amount === undefined ? null : indexValue(amount, baseAmount);
      const recordedIndex = indexValue(entry.total, baseRecorded);

      return {
        label: entry.band.label,
        hint: entry.band.hint,
        isBase: index === 0,
        amountText: amount === undefined ? '–' : formatEuro(amount),
        amountIndexText: amountIndex === null ? '–' : `${Math.round(amountIndex)} %`,
        amountChange:
          amount !== undefined && previousAmount !== undefined
            ? formatChange(amount, previousAmount)
            : NO_CHANGE,
        recorded: entry.total,
        recordedIndexText: formatIndex(entry.total, baseRecorded),
        // The plain business number behind the percentage gap, always on a yearly basis
        averagePriceText:
          amount !== undefined && entry.total > 0
            ? formatEuro((amount * monthsPerPeriod) / entry.total)
            : '–',
        gapText: formatPoints(amountIndex, recordedIndex),
        gapExplanation: explainPoints(amountIndex, recordedIndex, this.baseLabel())
      };
    });
  });

  /** Whether the product was on sale in that year, per the known product lifecycle */
  private wasOnSale(info: ProductInfo, year: number): boolean {
    if (info.availableFrom !== undefined && year < info.availableFrom) return false;
    if (info.discontinuedFrom !== undefined && year >= info.discontinuedFrom) return false;
    return true;
  }
}
