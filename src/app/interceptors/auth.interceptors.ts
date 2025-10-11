import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { catchError, throwError, tap } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);
  const platformId = inject(PLATFORM_ID);
  const isBrowser = isPlatformBrowser(platformId);

  // console.log('🔄 Interceptor called for:', req.url, 'isBrowser:', isBrowser);

  // Don't intercept login or register requests
  const isLoginRequest = req.url.includes('/login') || req.url.includes('/register');

  // Add token to ALL requests except login/register, only in browser
  if (isBrowser && !isLoginRequest) {
    const token = localStorage.getItem('token');
    if (token) {
      // console.log('🔑 Adding token to request');
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    } else {
      // console.log('⚠️ No token found for request');
    }
  } else if (!isBrowser) {
    console.log('🌐 Server-side rendering - not adding token');
  }

  return next(req).pipe(
    tap({
      next: (response) => {
        if (isBrowser) {
          // console.log('✅ HTTP Success Response for:', req.url);
          // console.log('📦 Response:', response);
        }
      },
      error: (error) => {
        if (isBrowser) {
          console.error('❌ HTTP Error in tap for:', req.url, error);
        }
      }
    }),
    catchError((error: HttpErrorResponse) => {
      if (isBrowser) {
        // console.error('🚨 HTTP Error in catchError:', error.status, 'for URL:', req.url);
        // console.error('🔍 Full error object:', error);
        
        if (error.status === 401 && !isLoginRequest) {
          console.log('🔐 401 error in interceptor, clearing token and redirecting');
          localStorage.removeItem('token');
          router.navigate(['/login']);
        }
      }
      return throwError(() => error);
    })
  );
};