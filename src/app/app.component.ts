// src/app/app.component.ts - Fixed to prevent login page flash
import { Component, OnInit } from '@angular/core';
import { AuthComponent } from "./components/auth/auth.component";
import { Router, RouterModule, NavigationEnd } from '@angular/router';
import { CommonModule } from '@angular/common';
import { AuthService } from './services/login.service';
import { filter } from 'rxjs/operators';

@Component({
  selector: 'app-root',
  imports: [RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {
  title = 'uhks';
  isInitialized = false;
  private hasNavigated = false;

  constructor(
    private router: Router, 
    private authService: AuthService
  ) {
    // Prevent any navigation until we're initialized
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe(() => {
      this.hasNavigated = true;
    });
  }

  ngOnInit() {
    this.initializeApp();
  }

  private async initializeApp() {
    // Wait a bit longer to ensure everything is ready
    await new Promise(resolve => setTimeout(resolve, 200));

    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      const currentUrl = this.router.url;
      
      if (token && this.authService.isAuthenticated()) {
        // Token is valid
        if (!this.authService.currentUserValue) {
          this.authService.loadUserData();
        }
        
        // Only navigate if we're on login page or root
        if (currentUrl === '/login' || currentUrl === '/' || currentUrl === '') {
          await this.router.navigate(['/home']);
        }
      } else {
        // No valid token
        if (currentUrl !== '/login') {
          await this.router.navigate(['/login']);
        }
      }
    }

    // Mark as initialized after all checks are done
    this.isInitialized = true;
  }
}