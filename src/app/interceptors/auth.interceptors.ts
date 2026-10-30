import { HttpInterceptorFn, HttpErrorResponse, HttpResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, tap, throwError } from 'rxjs';
import { Router } from '@angular/router';
import { AuthService } from '../services/login.service';

const MUTATING = new Set(['POST', 'PUT', 'PATCH', 'DELETE']);

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const authService = inject(AuthService);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);
  const isPublicAuthRequest =
    req.url.includes('/login') ||
    req.url.includes('/reset-password') ||
    req.url.includes('/logout');
  const isSessionProbe = req.url.includes('/me');

  if (isBrowser) {
    const csrf = authService.csrfToken;
    req = req.clone({
      withCredentials: true,
      setHeaders: csrf && MUTATING.has(req.method) ? { 'X-CSRF-Token': csrf } : {}
    });
  }

  return next(req).pipe(
    tap((event) => {
      if (event instanceof HttpResponse) {
        const token = event.headers.get('X-CSRF-Token');
        if (token) {
          authService.setCsrfToken(token);
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      if (
        isBrowser &&
        error.status === 401 &&
        !isPublicAuthRequest &&
        !isSessionProbe
      ) {
        authService.clearSession();
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};
