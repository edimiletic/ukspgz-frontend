import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/login.service';

@Component({
  selector: 'app-set-password',
  imports: [CommonModule, FormsModule, RouterLink],
  templateUrl: './set-password.component.html',
  styleUrl: '../auth/auth.component.scss'
})
export class SetPasswordComponent implements OnInit {
  password = '';
  confirmPassword = '';
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  private token = '';

  constructor(
    private readonly route: ActivatedRoute,
    private readonly auth: AuthService,
    private readonly router: Router
  ) {}

  ngOnInit(): void {
    this.token = this.route.snapshot.queryParamMap.get('token') || '';
    if (!this.token) {
      this.errorMessage = 'Link nije važeći ili je istekao.';
    }
  }

  onSubmit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.token) {
      this.errorMessage = 'Link nije važeći ili je istekao.';
      return;
    }
    if (!this.password || this.password.length < 8) {
      this.errorMessage = 'Lozinka mora imati najmanje 8 znakova.';
      return;
    }
    if (this.password !== this.confirmPassword) {
      this.errorMessage = 'Lozinke se ne podudaraju.';
      return;
    }

    this.isLoading = true;
    this.auth.resetPassword(this.token, this.password).subscribe({
        next: (response) => {
          this.isLoading = false;
          this.successMessage = response.message || 'Lozinka je postavljena.';
          setTimeout(() => this.router.navigate(['/login']), 1500);
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = error.error?.error || 'Link nije važeći ili je istekao.';
        }
      });
  }
}
