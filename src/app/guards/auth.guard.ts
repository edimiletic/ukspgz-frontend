// auth.guard.ts - Updated to not redirect immediately
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { AuthService } from '../services/login.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(
    private router: Router,
    private authService: AuthService
  ) {}

  canActivate(): boolean {
    const isAuthenticated = this.authService.isAuthenticated();
    
    if (isAuthenticated) {
      // Load user data if not already loaded
      if (!this.authService.currentUserValue) {
        this.authService.loadUserData();
      }
      return true;
    }

    // Use replaceUrl to prevent back button issues
    this.router.navigate(['/login'], { replaceUrl: true });
    return false;
  }
}