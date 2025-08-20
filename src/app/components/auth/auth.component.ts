import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/login.service';

@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent implements OnInit {
  username: string = '';
  password: string = '';
  isLoading: boolean = false;
  errorMessage: string = '';

  constructor(
    private router: Router,
    private authService: AuthService
  ) {
    console.log('🔐 AuthComponent constructor');
  }

  ngOnInit() {
    console.log('🔐 AuthComponent ngOnInit');
    // If already authenticated, redirect to home
    if (this.authService.isAuthenticated()) {
      console.log('✅ Already authenticated, redirecting to home');
      this.router.navigate(['/home']);
    } else {
      console.log('❌ Not authenticated, staying on login page');
    }
  }

  onSubmit() {
    if (!this.username || !this.password) {
      this.errorMessage = 'Molimo unesite korisničko ime i lozinku';
      return;
    }
    this.login();
  }

  login() {
    this.isLoading = true;
    this.errorMessage = '';
    const credentials = {
      username: this.username.trim(),
      password: this.password
    };

    this.authService.login(credentials).subscribe({
      next: (response) => {
        console.log('🔑 Login response in component:', response);
        // Always redirect to home after login
        this.router.navigate(['/home']);
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error.error?.error || 'Neispravno korisničko ime ili lozinka';
        console.error('❌ Login error in component:', error);
      },
      complete: () => {
        this.isLoading = false;
      }
    });
  }
}