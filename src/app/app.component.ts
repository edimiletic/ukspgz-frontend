import { Component, OnInit, OnDestroy, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Title } from '@angular/platform-browser';
import { NavigationEnd, Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';
import { Subscription } from 'rxjs';
import { filter } from 'rxjs/operators';
import { AuthService } from './services/login.service';
import { documentTitle, leafRouteTitle } from './utils/document-title';

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
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.initializeAuth();
  }

  private initializeAuth(): void {
    if (!this.isBrowser) {
      this.isInitializing = false;
      return;
    }

    if (this.authService.currentUserValue) {
      this.isInitializing = false;
      return;
    }

    this.authService.getCurrentUser().subscribe({
      next: () => {
        this.isInitializing = false;
      },
      error: (error) => {
        if (error?.status === 401 || error?.status === 403) {
          this.authService.clearSession();
        }
        this.isInitializing = false;
      }
    });
  }
}
