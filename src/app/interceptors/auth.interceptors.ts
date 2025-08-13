// src/app/interceptors/auth.interceptor.ts - Fixed version
import { HttpInterceptorFn, HttpErrorResponse } from '@angular/common/http';
import { inject } from '@angular/core';
import { catchError, throwError } from 'rxjs';
import { Router } from '@angular/router';

export const authInterceptor: HttpInterceptorFn = (req, next) => {
  const router = inject(Router);

  // Don't intercept login or register requests, but DO intercept /me requests
  const isLoginRequest = req.url.includes('/login') || req.url.includes('/register');

  // Add token to ALL requests except login/register
  if (typeof window !== 'undefined' && !isLoginRequest) {
    const token = localStorage.getItem('token');
    if (token) {
      req = req.clone({
        setHeaders: {
          Authorization: `Bearer ${token}`
        }
      });
    }
  }

  return next(req).pipe(
    catchError((error: HttpErrorResponse) => {
      if (error.status === 401 && !isLoginRequest) {
        // Token expired or invalid - clear token and redirect
        localStorage.removeItem('token');
        router.navigate(['/login']);
      }
      return throwError(() => error);
    })
  );
};