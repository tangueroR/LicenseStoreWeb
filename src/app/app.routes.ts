import { Routes } from '@angular/router';
import { authGuard } from './guards/auth.guard';

export const routes: Routes = [
  {
    path: 'login',
    loadComponent: () =>
      import('./components/login/login.component').then(m => m.LoginComponent)
  },
  {
    path: 'licenses',
    loadComponent: () =>
      import('./components/license-dashboard/license-dashboard.component').then(m => m.LicenseDashboardComponent),
    canActivate: [authGuard]
  },
  {
    path: '',
    redirectTo: 'licenses',
    pathMatch: 'full'
  },
  {
    path: '**',
    redirectTo: 'licenses'
  }
];
