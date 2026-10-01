import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/login.service';
import { canViewStatistics } from '../model/roles';

@Injectable({
  providedIn: 'root',
})
export class StatisticsGuard implements CanActivate {
  private isBrowser: boolean;

  constructor(
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  canActivate(): Observable<boolean> {
    if (!this.isBrowser) {
      return of(true);
    }

    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return of(false);
    }

    if (this.authService.currentUserValue) {
      return of(this.allowOrRedirect(canViewStatistics(this.authService.currentUserValue)));
    }

    return this.authService.getCurrentUser().pipe(
      map((user) => this.allowOrRedirect(canViewStatistics(user))),
      catchError(() => {
        this.router.navigate(['/login'], { replaceUrl: true });
        return of(false);
      })
    );
  }

  private allowOrRedirect(allowed: boolean): boolean {
    if (allowed) {
      return true;
    }
    this.router.navigate(['/home'], {
      replaceUrl: true,
      queryParams: {
        error: 'access_denied',
        message: 'Nemate pristup statistici.'
      }
    });
    return false;
  }
}
