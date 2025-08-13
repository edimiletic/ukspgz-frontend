// auth.service.ts - Final version without circular dependency
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { User } from '../model/user.model';
import { Router } from '@angular/router';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = 'http://localhost:3000/api';
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();

  constructor(private http: HttpClient, private router: Router) {}

  login(credentials: { username: string, password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        if (response.token) {
          localStorage.setItem('token', response.token);
          if (response.user) {
            this.currentUserSubject.next(response.user);
          }
        }
      }),
      catchError(error => {
        console.error('Login error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    localStorage.removeItem('token');
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    if (typeof window === 'undefined') return false;
    const token = localStorage.getItem('token');
    if (!token) return false;
    
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      if (isExpired) {
        localStorage.removeItem('token');
        this.currentUserSubject.next(null);
        return false;
      }
      return true;
    } catch {
      localStorage.removeItem('token');
      this.currentUserSubject.next(null);
      return false;
    }
  }

  getCurrentUser(): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => this.currentUserSubject.next(user)),
      catchError(error => {
        if (error.status === 401) {
          localStorage.removeItem('token');
          this.currentUserSubject.next(null);
        }
        return throwError(() => error);
      })
    );
  }

  get currentUserValue(): User | null {
    return this.currentUserSubject.value;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user ? user.role === role : false;
  }

// auth.service.ts - Add debugging
loadUserData(): void {
  if (this.isAuthenticated() && !this.currentUserValue) {
    const token = localStorage.getItem('token');
    console.log('Loading user data with token:', token ? 'Token exists' : 'No token');
    
    this.getCurrentUser().subscribe({
      next: (user) => {
        console.log('User loaded successfully:', user);
        this.currentUserSubject.next(user);
      },
      error: (error) => {
        console.error('Failed to load user data:', error);
        console.log('Token in localStorage:', localStorage.getItem('token'));
        localStorage.removeItem('token');
        this.currentUserSubject.next(null);
      }
    });
  }
}
}