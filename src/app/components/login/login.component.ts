import { Component, signal } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    FormsModule,
    MatCardModule,
    MatFormFieldModule,
    MatInputModule,
    MatButtonModule,
    MatIconModule,
    MatProgressSpinnerModule
  ],
  templateUrl: './login.component.html',
  styleUrl: './login.component.scss'
})
export class LoginComponent {
  userName = '';
  password = '';
  hidePassword = signal(true);
  isLoading = signal(false);
  errorMessage = signal('');

  constructor(
    private readonly authService: AuthService,
    private readonly router: Router
  ) {}

  onLogin(): void {
    if (!this.userName || !this.password) {
      this.errorMessage.set('Bitte Benutzername und Passwort eingeben.');
      return;
    }

    this.isLoading.set(true);
    this.errorMessage.set('');

    this.authService.login(this.userName, this.password).subscribe({
      next: (response) => {
        this.isLoading.set(false);
        if (response.success) {
          this.router.navigate(['/licenses']);
        } else {
          this.errorMessage.set('Login fehlgeschlagen. Bitte überprüfen Sie Ihre Zugangsdaten.');
        }
      },
      error: (err) => {
        this.isLoading.set(false);
        if (err.status === 401) {
          this.errorMessage.set('Ungültiger Benutzername oder Passwort.');
        } else {
          this.errorMessage.set('Verbindungsfehler. Bitte versuchen Sie es später erneut.');
        }
      }
    });
  }

  togglePasswordVisibility(): void {
    this.hidePassword.update(v => !v);
  }
}
