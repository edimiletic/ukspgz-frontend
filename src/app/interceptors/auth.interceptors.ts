import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  console.log('🔄 Interceptor called for:', req.url, 'isBrowser:', isBrowser);

  // Don't intercept login or register requests
  const isLoginRequest = req.url.includes('/login') || req.url.includes('/register');

  // Add token to ALL requests except login/register, only in browser
  if (isBrowser && !isLoginRequest) {
    const token = localStorage.getItem('token');
    if (token) {
      console.log('🔑 Adding token to request');
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    } else {
      console.log('⚠️ No token found for request');
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      console.error('🚨 HTTP Error:', error.status, 'for URL:', req.url);
      if (error.status === 401 && !isLoginRequest && isBrowser) {
        console.log('🔐 401 error in interceptor, clearing token and redirecting');
        localStorage.removeItem('token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};