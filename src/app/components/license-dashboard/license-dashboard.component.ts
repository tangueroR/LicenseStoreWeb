import { Component, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';
import { LicenseTableComponent } from '../license-table/license-table.component';
import { LicenseStatisticsComponent } from '../statistics/license-statistics.component';
import { ProductType } from '../../models/sico-anlage.model';
import { environment } from '../../../environments/environment';

interface ProductTab {
  label: string;
  product: ProductType;
}

@Component({
  selector: 'app-license-dashboard',
  standalone: true,
  imports: [
    MatTabsModule,
    MatToolbarModule,
    MatButtonModule,
    MatIconModule,
    MatMenuModule,
    MatDividerModule,
    LicenseTableComponent,
    LicenseStatisticsComponent
  ],
  templateUrl: './license-dashboard.component.html',
  styleUrl: './license-dashboard.component.scss'
})
export class LicenseDashboardComponent {
  /** 4-part application version (major.minor.patch.build) shown next to the app title */
  readonly appVersion = environment.version;

  readonly tabs: ProductTab[] = [
    { label: 'Sico6000', product: 'sico6000' },
    { label: 'Sico2020', product: 'sico2020' },
    { label: 'Sico1010', product: 'sico1010' },
    { label: 'Sico5000', product: 'sico5000' }
  ];

  readonly selectedIndex = signal(0);

  constructor(readonly authService: AuthService) {}

  onLogout(): void {
    this.authService.logout();
  }
}
