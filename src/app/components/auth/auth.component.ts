import { Component, OnInit, inject } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/login.service';
import { loginFailureMessage } from './auth.helpers';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {
  isLoading = false;
  errorMessage = '';

  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    username: ['', Validators.required],
    password: ['', Validators.required]
  });

  ngOnInit() {
    if (this.authService.isAuthenticated()) {
      this.router.navigate(['/home']);
    }
  }

  onSubmit() {
    this.form.markAllAsTouched();
    if (this.form.invalid) {
      this.errorMessage = 'Molimo unesite korisničko ime i lozinku';
      return;
    }
    this.login();
  }

  login() {
    this.isLoading = true;
    this.errorMessage = '';
    const { username, password } = this.form.getRawValue();
    this.form.disable();
    this.authService.login({ username: username.trim(), password }).subscribe({
      next: () => {
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.isLoading = false;
        this.form.enable();
        this.errorMessage = loginFailureMessage(error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}
