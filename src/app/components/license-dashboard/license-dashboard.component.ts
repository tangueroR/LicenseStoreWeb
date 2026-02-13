import { Component, OnInit, signal } from '@angular/core';
import { MatTabsModule } from '@angular/material/tabs';
import { MatToolbarModule } from '@angular/material/toolbar';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatMenuModule } from '@angular/material/menu';
import { MatDividerModule } from '@angular/material/divider';
import { AuthService } from '../../services/auth.service';
import { LicenseTableComponent } from '../license-table/license-table.component';
import { ProductType } from '../../models/sico-anlage.model';

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
    LicenseTableComponent
  ],
  templateUrl: './license-dashboard.component.html',
  styleUrl: './license-dashboard.component.scss'
})
export class LicenseDashboardComponent {
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
