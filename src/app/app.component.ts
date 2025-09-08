import { Component, OnInit, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  isInitializing = true;
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {    
    // Track navigation for debugging
    this.router.events.pipe(
      filter(event => event instanceof NavigationEnd)
    ).subscribe((event: NavigationEnd) => {
      console.log('Navigation to:', event.url);
    });

    this.initializeAuth();
  }

  private initializeAuth(): void {
    
    // On server-side, finish initialization immediately
    if (!this.isBrowser) {
      this.isInitializing = false;
      return;
    }
    
    // Check if user is authenticated
    if (!this.authService.isAuthenticated()) {
      console.log('Not authenticated, finishing initialization');
      this.isInitializing = false;
      return;
    }

    // If user data is already loaded, finish initialization
    if (this.authService.currentUserValue) {
      console.log('User already loaded, finishing initialization');
      this.isInitializing = false;
      return;
    }

    // Load user data before showing the app
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('User loaded:', user);
        this.isInitializing = false;
      },
      error: (error) => {
        console.error('Failed to load user:', error);
        // Clear invalid token and finish initialization
        localStorage.removeItem('token');
        this.isInitializing = false;
      }
    });
  }
}