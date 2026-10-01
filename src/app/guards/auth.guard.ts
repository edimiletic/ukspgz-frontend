// auth.guard.ts - Also update for SSR
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { AuthService } from '../services/login.service';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  private isBrowser: boolean;

  constructor(
    private router: Router,
    private authService: AuthService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean> {
    if (!this.isBrowser) {
      return of(true);
    }
    
    if (!this.authService.isAuthenticated()) {
      this.router.navigate(['/login'], { replaceUrl: true });
      return of(false);
    }

    if (this.authService.currentUserValue) {
      return of(true);
    }

    return this.authService.getCurrentUser().pipe(
      map(user => {
        if (user) {
          return true;
        }
        this.router.navigate(['/login'], { replaceUrl: true });
        return false;
      }),
      catchError(() => {
        this.router.navigate(['/login'], { replaceUrl: true });
        return of(false);
      })
    );
  }
}