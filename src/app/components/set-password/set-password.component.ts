import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/login.service';
import { PASSWORD_MIN_LENGTH, passwordPolicyError } from '../../utils/password-policy';

@Component({
  selector: 'app-set-password',
  imports: [CommonModule, ReactiveFormsModule, RouterLink],
  templateUrl: './set-password.component.html',
  styleUrl: '../auth/auth.component.scss'
})
export class SetPasswordComponent implements OnInit {
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private token = '';

  private readonly route = inject(ActivatedRoute);
  private readonly auth = inject(AuthService);
  private readonly router = inject(Router);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    password: ['', [Validators.required, Validators.minLength(PASSWORD_MIN_LENGTH)]],
    confirmPassword: ['', Validators.required]
  });

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Link nije važeći ili je istekao.';
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.form.markAllAsTouched();
    if (!this.token) {
      this.errorMessage = 'Link nije važeći ili je istekao.';
      return;
    }
    const { password, confirmPassword } = this.form.getRawValue();
    const policyError = passwordPolicyError(password);
    if (policyError) {
      this.errorMessage = policyError;
      return;
    }
    if (password !== confirmPassword) {
      this.errorMessage = 'Lozinke se ne podudaraju.';
      return;
    }

    this.isLoading = true;
    this.form.disable();
    this.auth.resetPassword(this.token, password).subscribe({
      next: (response) => {
        this.isLoading = false;
        this.successMessage = response.message || 'Lozinka je postavljena.';
        setTimeout(() => this.router.navigate(['/login']), 1500);
      },
      error: (error: HttpErrorResponse) => {
        this.isLoading = false;
        this.form.enable();
        this.errorMessage = error.error?.error || 'Link nije važeći ili je istekao.';
      }
    });
  }
}
