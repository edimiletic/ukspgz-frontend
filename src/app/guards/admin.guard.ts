import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/login.service';

@Injectable({
  providedIn: 'root',
})
export class AdminGuard implements CanActivate {
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
      return of(this.allowAdminOrRedirect(this.authService.isAdmin()));
    }

    return this.authService.getCurrentUser().pipe(
      map((user) => this.allowAdminOrRedirect(user?.role === 'Admin')),
      catchError(() => {
        this.router.navigate(['/login'], { replaceUrl: true });
        return of(false);
      })
    );
  }

  private allowAdminOrRedirect(isAdmin: boolean): boolean {
    if (isAdmin) {
      return true;
    }
    this.router.navigate(['/home'], {
      replaceUrl: true,
      queryParams: {
        error: 'access_denied',
        message: 'Nemate pristup ovoj stranici. Samo administratori mogu pristupiti.'
      }
    });
    return false;
  }
}
