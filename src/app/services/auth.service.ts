import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { Observable, tap } from 'rxjs';
import { environment } from '../../environments/environment';
import { LoginRequest, LoginResponse } from '../models/sico-anlage.model';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private readonly apiUrl = environment.apiBaseUrl;
  private readonly tokenKey = 'auth_token';
  private readonly expiresAtKey = 'auth_expires_at';
  private readonly userNameKey = 'auth_user_name';
  private readonly isAdminKey = 'auth_is_admin';
  private readonly canManageLicensesKey = 'auth_can_manage';

  private readonly _isLoggedIn = signal(this.hasValidToken());
  private readonly _isAdmin = signal(this.getStoredBoolean(this.isAdminKey));
  private readonly _canManageLicenses = signal(this.getStoredBoolean(this.canManageLicensesKey));
  private readonly _userName = signal(this.getStoredString(this.userNameKey));

  readonly isLoggedIn = this._isLoggedIn.asReadonly();
  readonly isAdmin = this._isAdmin.asReadonly();
  readonly canManageLicenses = this._canManageLicenses.asReadonly();
  readonly userName = this._userName.asReadonly();

  constructor(
    private readonly http: HttpClient,
    private readonly router: Router
  ) {}

  login(userName: string, password: string): Observable<LoginResponse> {
    const body: LoginRequest = { userName, password };
    return this.http.post<LoginResponse>(`${this.apiUrl}/api/auth/login`, body).pipe(
      tap(response => {
        if (response.success) {
          localStorage.setItem(this.tokenKey, response.token);
          localStorage.setItem(this.expiresAtKey, response.expiresAt);
          localStorage.setItem(this.userNameKey, userName);
          localStorage.setItem(this.isAdminKey, String(response.isAdmin));
          localStorage.setItem(this.canManageLicensesKey, String(response.canManageLicenses));

          this._isLoggedIn.set(true);
          this._isAdmin.set(response.isAdmin);
          this._canManageLicenses.set(response.canManageLicenses);
          this._userName.set(userName);
        }
      })
    );
  }

  logout(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.expiresAtKey);
    localStorage.removeItem(this.userNameKey);
    localStorage.removeItem(this.isAdminKey);
    localStorage.removeItem(this.canManageLicensesKey);

    this._isLoggedIn.set(false);
    this._isAdmin.set(false);
    this._canManageLicenses.set(false);
    this._userName.set('');

    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    if (!this.hasValidToken()) {
      return null;
    }
    return localStorage.getItem(this.tokenKey);
  }

  private hasValidToken(): boolean {
    const token = localStorage.getItem(this.tokenKey);
    const expiresAt = localStorage.getItem(this.expiresAtKey);
    if (!token || !expiresAt) {
      return false;
    }
    return new Date(expiresAt) > new Date();
  }

  private getStoredBoolean(key: string): boolean {
    return localStorage.getItem(key) === 'true';
  }

  private getStoredString(key: string): string {
    return localStorage.getItem(key) ?? '';
  }
}
