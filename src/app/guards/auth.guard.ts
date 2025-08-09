// src/app/guards/auth.guard.ts - CLEAN ASYNC VERSION
import { Injectable } from '@angular/core';
import { CanActivate, Router } from '@angular/router';
import { Observable, of } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class AuthGuard implements CanActivate {
  constructor(private router: Router) {}

  canActivate(): Observable<boolean> {
    return new Observable<boolean>(observer => {
      // Ensure this runs after current call stack
      setTimeout(() => {
        if (typeof window !== 'undefined') {
          const token = localStorage.getItem('token');
          if (token) {
            observer.next(true);
            observer.complete();
          } else {
            this.router.navigate(['/login']);
            observer.next(false);
            observer.complete();
          }
        } else {
          this.router.navigate(['/login']);
          observer.next(false);
          observer.complete();
        }
      }, 0);
    });
  }
}