import { Component, Input, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatTableModule, MatTableDataSource } from '@angular/material/table';
import { MatSortModule, MatSort, Sort } from '@angular/material/sort';
import { MatPaginatorModule, MatPaginator } from '@angular/material/paginator';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatDialog, MatDialogModule } from '@angular/material/dialog';
import { MatSnackBar, MatSnackBarModule } from '@angular/material/snack-bar';
import { MatCardModule } from '@angular/material/card';
import { MatChipsModule } from '@angular/material/chips';
import { DatePipe } from '@angular/common';
import { SicoAnlage, ProductType, LicenseRequest, LicenseResponse, DeleteRequest } from '../../models/sico-anlage.model';
import { LicenseService } from '../../services/license.service';
import { AuthService } from '../../services/auth.service';
import { CreateLicenseDialogComponent, CreateLicenseDialogData } from '../create-license-dialog/create-license-dialog.component';
import { ConfirmDialogComponent, ConfirmDialogData } from '../confirm-dialog/confirm-dialog.component';

@Component({
  selector: 'app-license-table',
  standalone: true,
  imports: [
    FormsModule,
    MatTableModule,
    MatSortModule,
    MatPaginatorModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressBarModule,
    MatTooltipModule,
    MatDialogModule,
    MatSnackBarModule,
    MatCardModule,
    MatChipsModule,
    DatePipe
  ],
  templateUrl: './license-table.component.html',
  styleUrl: './license-table.component.scss'
})
export class LicenseTableComponent implements OnInit {
  @Input({ required: true }) product!: ProductType;

  @ViewChild(MatSort) sort!: MatSort;
  @ViewChild(MatPaginator) paginator!: MatPaginator;

  dataSource = new MatTableDataSource<SicoAnlage>();
  isLoading = signal(false);
  filterValue = '';

  /** Date range filter fields */
  dateFrom = '';
  dateTo = '';

  /** Active filter info for display */
  activeFilterInfo = signal<string>('');

  /** Currently selected row */
  selectedRow = signal<SicoAnlage | null>(null);

  /** Last license creation/generation response */
  lastLicenseResponse = signal<LicenseResponse | null>(null);

  /** Columns shown for Sico1010 */
  private readonly sico1010Columns = [
    'projectName', 'description', 'releaseDate', 'neuronId',
    'password', 'modemPassword', 'userName', 'actions'
  ];

  /** Columns shown for Sico5000 (with premium password) */
  private readonly sico5000Columns = [
    'projectName', 'description', 'releaseDate', 'neuronId',
    'password', 'modemPassword', 'premiumPassword', 'userName', 'actions'
  ];

  /** Columns shown for Sico2020 / Sico6000 (IP/Wireguard + premium) */
  private readonly networkColumns = [
    'projectName', 'description', 'releaseDate', 'neuronId',
    'password', 'ipAddress', 'wireguardAddress', 'premiumPassword', 'userName', 'actions'
  ];

  get displayedColumns(): string[] {
    if (this.isNetworkProduct) return this.networkColumns;
    if (this.product === 'sico5000') return this.sico5000Columns;
    return this.sico1010Columns;
  }

  get isNetworkProduct(): boolean {
    return this.product === 'sico2020' || this.product === 'sico6000';
  }

  /** Whether this product shows premium passwords */
  get showsPremium(): boolean {
    return this.product !== 'sico1010';
  }

  constructor(
    private readonly licenseService: LicenseService,
    readonly authService: AuthService,
    private readonly dialog: MatDialog,
    private readonly snackBar: MatSnackBar
  ) {}

  ngOnInit(): void {
    this.loadData();
  }

  ngAfterViewInit(): void {
    this.dataSource.sort = this.sort;
    this.dataSource.paginator = this.paginator;

    // Default sort: releaseDate descending (newest first)
    this.sort.active = 'releaseDate';
    this.sort.direction = 'desc';
    this.sort.sortChange.emit({ active: 'releaseDate', direction: 'desc' });

    this.dataSource.filterPredicate = (data: SicoAnlage, filter: string): boolean => {
      return this.matchesFilter(data, filter);
    };
  }

  /**
   * Parse a German date string (dd.MM.yyyy) into a Date object.
   * Returns null if the format is invalid.
   */
  private parseGermanDate(dateStr: string): Date | null {
    const match = dateStr.trim().match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (!match) return null;
    const day = parseInt(match[1], 10);
    const month = parseInt(match[2], 10) - 1;
    const year = parseInt(match[3], 10);
    const d = new Date(year, month, day);
    if (d.getFullYear() === year && d.getMonth() === month && d.getDate() === day) {
      return d;
    }
    return null;
  }

  /**
   * Get the releaseDate of an SicoAnlage as a Date object.
   */
  private getRowDate(data: SicoAnlage): Date | null {
    if (!data.releaseDate) return null;
    // releaseDate could be ISO string or other format
    const d = new Date(data.releaseDate);
    return isNaN(d.getTime()) ? null : d;
  }

  /**
   * Smart filter matching:
   * - "2026" → all entries from 2026
   * - "01.01.2005 - 30.06.2025" → entries within date range
   * - "01.01.2026" → entries from exactly that date
   * - anything else → text search across projectName, description, neuronId, userName, password, releaseDate
   */
  private matchesFilter(data: SicoAnlage, filter: string): boolean {
    const search = filter.trim();
    if (!search) return true;

    // Try date range: "dd.MM.yyyy - dd.MM.yyyy"
    const rangeMatch = search.match(/^(\d{1,2}\.\d{1,2}\.\d{4})\s*-\s*(\d{1,2}\.\d{1,2}\.\d{4})$/);
    if (rangeMatch) {
      const from = this.parseGermanDate(rangeMatch[1]);
      const to = this.parseGermanDate(rangeMatch[2]);
      if (from && to) {
        to.setHours(23, 59, 59, 999);
        const rowDate = this.getRowDate(data);
        if (!rowDate) return false;
        return rowDate >= from && rowDate <= to;
      }
    }

    // Try single German date: "dd.MM.yyyy"
    const singleDate = this.parseGermanDate(search);
    if (singleDate) {
      const rowDate = this.getRowDate(data);
      if (!rowDate) return false;
      return (
        rowDate.getFullYear() === singleDate.getFullYear() &&
        rowDate.getMonth() === singleDate.getMonth() &&
        rowDate.getDate() === singleDate.getDate()
      );
    }

    // Try pure year: "2026"
    const yearMatch = search.match(/^(\d{4})$/);
    if (yearMatch) {
      const year = parseInt(yearMatch[1], 10);
      if (year >= 1990 && year <= 2100) {
        const rowDate = this.getRowDate(data);
        if (!rowDate) return false;
        return rowDate.getFullYear() === year;
      }
    }

    // Try year range: "2020 - 2025"
    const yearRangeMatch = search.match(/^(\d{4})\s*-\s*(\d{4})$/);
    if (yearRangeMatch) {
      const fromYear = parseInt(yearRangeMatch[1], 10);
      const toYear = parseInt(yearRangeMatch[2], 10);
      if (fromYear >= 1990 && toYear <= 2100) {
        const rowDate = this.getRowDate(data);
        if (!rowDate) return false;
        const y = rowDate.getFullYear();
        return y >= fromYear && y <= toYear;
      }
    }

    // Default: text search across multiple fields + formatted date
    const lowerSearch = search.toLowerCase();
    const formattedDate = this.formatDateGerman(data.releaseDate);
    return (
      (data.projectName?.toLowerCase().includes(lowerSearch) ?? false) ||
      (data.description?.toLowerCase().includes(lowerSearch) ?? false) ||
      (data.neuronId?.toLowerCase().includes(lowerSearch) ?? false) ||
      (data.userName?.toLowerCase().includes(lowerSearch) ?? false) ||
      (data.password?.toLowerCase().includes(lowerSearch) ?? false) ||
      (formattedDate.toLowerCase().includes(lowerSearch))
    );
  }

  /** Format a date string to German format for text matching */
  private formatDateGerman(dateStr: string): string {
    if (!dateStr) return '';
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    const day = d.getDate().toString().padStart(2, '0');
    const month = (d.getMonth() + 1).toString().padStart(2, '0');
    const year = d.getFullYear();
    return `${day}.${month}.${year}`;
  }

  loadData(): void {
    this.isLoading.set(true);
    const userName = this.authService.userName();

    this.licenseService.getProjects(this.product, userName).subscribe({
      next: (data) => {
        this.dataSource.data = data;
        this.isLoading.set(false);
      },
      error: (err) => {
        this.isLoading.set(false);
        this.snackBar.open('Fehler beim Laden der Daten.', 'OK', { duration: 5000 });
        console.error('Error loading projects:', err);
      }
    });
  }

  applyFilter(): void {
    const trimmed = this.filterValue.trim();
    // We pass the original case for date parsing, lowercase only for text matching inside predicate
    this.dataSource.filter = trimmed;
    this.updateFilterInfo(trimmed);
    if (this.dataSource.paginator) {
      this.dataSource.paginator.firstPage();
    }
  }

  /** Update the displayed info about which filter is active */
  private updateFilterInfo(filter: string): void {
    if (!filter) {
      this.activeFilterInfo.set('');
      return;
    }

    // Date range
    const rangeMatch = filter.match(/^(\d{1,2}\.\d{1,2}\.\d{4})\s*-\s*(\d{1,2}\.\d{1,2}\.\d{4})$/);
    if (rangeMatch) {
      this.activeFilterInfo.set(`Zeitraum: ${rangeMatch[1]} bis ${rangeMatch[2]}`);
      return;
    }

    // Single date
    if (/^\d{1,2}\.\d{1,2}\.\d{4}$/.test(filter)) {
      this.activeFilterInfo.set(`Datum: ${filter}`);
      return;
    }

    // Year
    const yearMatch = filter.match(/^(\d{4})$/);
    if (yearMatch) {
      const y = parseInt(yearMatch[1], 10);
      if (y >= 1990 && y <= 2100) {
        this.activeFilterInfo.set(`Jahr: ${y}`);
        return;
      }
    }

    // Year range
    const yearRangeMatch = filter.match(/^(\d{4})\s*-\s*(\d{4})$/);
    if (yearRangeMatch) {
      this.activeFilterInfo.set(`Jahre: ${yearRangeMatch[1]} bis ${yearRangeMatch[2]}`);
      return;
    }

    this.activeFilterInfo.set(`Textsuche: "${filter}"`);
  }

  clearFilter(): void {
    this.filterValue = '';
    this.dateFrom = '';
    this.dateTo = '';
    this.applyFilter();
  }

  /** Apply date range from the date-from / date-to inputs */
  applyDateRange(): void {
    if (this.dateFrom && this.dateTo) {
      this.filterValue = `${this.dateFrom} - ${this.dateTo}`;
    } else if (this.dateFrom) {
      this.filterValue = this.dateFrom;
    } else if (this.dateTo) {
      this.filterValue = this.dateTo;
    }
    this.applyFilter();
  }

  onRowSelect(row: SicoAnlage): void {
    this.selectedRow.set(row);
    this.lastLicenseResponse.set(null);
  }

  /** Get premium password from the anlage data */
  getPremiumPassword(row: SicoAnlage): string {
    return row.password4 ?? '';
  }

  /**
   * For Sico2020/6000: row.modemPassword contains the IP address.
   * The WPF Anlage model filters out pipe-separated values.
   */
  getRowIpAddress(row: SicoAnlage): string {
    const mp = row.modemPassword ?? '';
    if (mp.includes('|')) return '';
    return mp;
  }

  /** For Sico2020/6000: row.password3 contains the Wireguard address */
  getRowWireguardAddress(row: SicoAnlage): string {
    return row.password3 ?? '';
  }

  /**
   * Parse IP address from response modemPassword.
   * For network products, modemPassword may contain "IP|Wireguard".
   */
  getResponseIpAddress(resp: LicenseResponse): string {
    if (!resp.modemPassword) return '';
    if (resp.modemPassword.includes('|')) {
      return resp.modemPassword.split('|')[0];
    }
    return resp.modemPassword;
  }

  /**
   * Parse Wireguard address from response modemPassword.
   * For network products, modemPassword may contain "IP|Wireguard".
   */
  getResponseWireguardAddress(resp: LicenseResponse): string {
    if (!resp.modemPassword) return '';
    if (resp.modemPassword.includes('|')) {
      const parts = resp.modemPassword.split('|');
      return parts.length > 1 ? parts[1] : '';
    }
    return '';
  }

  onCreateLicense(): void {
    const dialogData: CreateLicenseDialogData = {
      product: this.product,
      userName: this.authService.userName(),
      selectedRow: this.selectedRow()
    };

    const dialogRef = this.dialog.open(CreateLicenseDialogComponent, {
      width: '550px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(result => {
      if (result) {
        this.isLoading.set(true);
        const request: LicenseRequest = {
          neuronId: result.neuronId,
          projectName: result.projectName,
          description: result.description,
          version: result.version,
          userName: this.isNetworkProduct
            ? this.buildNetworkUserName(result)
            : this.authService.userName(),
          isPremium: result.isPremium,
          hasLicence: result.hasLicence
        };

        this.licenseService.createLicense(this.product, request).subscribe({
          next: (response) => {
            this.isLoading.set(false);
            this.lastLicenseResponse.set(response);
            this.snackBar.open('Passwort erfolgreich generiert.', 'OK', { duration: 3000 });
            this.loadData();
          },
          error: (err) => {
            this.isLoading.set(false);
            this.snackBar.open('Fehler beim Erstellen der Lizenz.', 'OK', { duration: 5000 });
            console.error('Error creating license:', err);
          }
        });
      }
    });
  }

  /** For Sico2020/6000 the userName field carries Wireguard/IP info separated by | */
  private buildNetworkUserName(result: any): string {
    const userName = this.authService.userName();
    if (result.wireguardAddress || result.ipAddress) {
      return `${userName}|${result.wireguardAddress ?? ''}|${result.ipAddress ?? ''}`;
    }
    return userName;
  }

  onDeleteLicense(anlage: SicoAnlage): void {
    const dialogData: ConfirmDialogData = {
      title: 'Lizenz löschen',
      message: `Möchten Sie die Lizenz für "${anlage.projectName}" (${anlage.neuronId}) wirklich löschen?`
    };

    const dialogRef = this.dialog.open(ConfirmDialogComponent, {
      width: '400px',
      data: dialogData
    });

    dialogRef.afterClosed().subscribe(confirmed => {
      if (confirmed) {
        this.isLoading.set(true);
        const request: DeleteRequest = {
          neuronId: anlage.neuronId,
          userName: this.authService.userName()
        };

        this.licenseService.deleteLicense(this.product, request).subscribe({
          next: (response) => {
            this.isLoading.set(false);
            if (response.success) {
              this.snackBar.open('Lizenz erfolgreich gelöscht.', 'OK', { duration: 3000 });
              this.selectedRow.set(null);
              this.loadData();
            } else {
              this.snackBar.open(response.message || 'Fehler beim Löschen.', 'OK', { duration: 5000 });
            }
          },
          error: (err) => {
            this.isLoading.set(false);
            this.snackBar.open('Fehler beim Löschen der Lizenz.', 'OK', { duration: 5000 });
            console.error('Error deleting license:', err);
          }
        });
      }
    });
  }
}
