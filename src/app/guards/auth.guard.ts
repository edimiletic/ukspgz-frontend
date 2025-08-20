// auth.guard.ts - Also update for SSR
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CanActivate, Router, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { Observable, of } from 'rxjs';
import { map, catchError, tap } from 'rxjs/operators';
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
    console.log('🛡️ AuthGuard canActivate called for route:', state.url);
    
    // On server-side, allow navigation (will be handled on client-side)
    if (!this.isBrowser) {
      console.log('🌐 Server-side rendering - allowing navigation');
      return of(true);
    }
    
    if (!this.authService.isAuthenticated()) {
      console.log('❌ Not authenticated, redirecting to login');
      this.router.navigate(['/login'], { replaceUrl: true });
      return of(false);
    }

    // If user data already loaded, allow immediately
    if (this.authService.currentUserValue) {
      console.log('✅ User already loaded, allowing access');
      return of(true);
    }

    console.log('⏳ User not loaded, fetching user data...');
    // Otherwise, load user data and wait for it
    return this.authService.getCurrentUser().pipe(
      tap(user => console.log('👤 User fetched in guard:', user)),
      map(user => {
        if (user) {
          console.log('✅ User loaded, allowing access');
          return true;
        } else {
          console.log('❌ No user returned, redirecting to login');
          this.router.navigate(['/login'], { replaceUrl: true });
          return false;
        }
      }),
      catchError(error => {
        console.error('❌ Auth guard error:', error);
        this.router.navigate(['/login'], { replaceUrl: true });
        return of(false);
      })
    );
  }
}