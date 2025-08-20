import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
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
  private isBrowser: boolean;

  constructor(
    private http: HttpClient, 
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('🔧 AuthService constructor called, isBrowser:', this.isBrowser);
    
    // Only try to restore user from token in browser
    if (this.isBrowser && this.isAuthenticated()) {
      console.log('🔧 Token found on service init, loading user data...');
      this.loadUserData();
    }
  }

  login(credentials: { username: string, password: string }): Observable<any> {
    console.log('🔑 Login attempt for:', credentials.username);
    return this.http.post<any>(`${this.apiUrl}/login`, credentials).pipe(
      tap(response => {
        console.log('✅ Login successful:', response);
        if (response.token && this.isBrowser) {
          localStorage.setItem('token', response.token);
          if (response.user) {
            console.log('👤 Setting current user:', response.user);
            this.currentUserSubject.next(response.user);
          }
        }
      }),
      catchError(error => {
        console.error('❌ Login error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    console.log('🚪 Logout called');
    if (this.isBrowser) {
      localStorage.removeItem('token');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) {
      console.log('🌐 Server-side rendering - not authenticated');
      return false;
    }
    
    const token = localStorage.getItem('token');
    console.log('🔍 Checking authentication, token exists:', !!token);
    
    if (!token) {
      console.log('❌ No token found');
      return false;
    }

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = payload.exp * 1000 < Date.now();
      console.log('⏰ Token expiry check:', {
        expires: new Date(payload.exp * 1000),
        now: new Date(),
        isExpired
      });
      
      if (isExpired) {
        console.log('⚠️ Token expired, removing...');
        localStorage.removeItem('token');
        this.currentUserSubject.next(null);
        return false;
      }
      
      console.log('✅ Token is valid');
      return true;
    } catch (error) {
      console.error('❌ Token parsing error:', error);
      localStorage.removeItem('token');
      this.currentUserSubject.next(null);
      return false;
    }
  }

  getCurrentUser(): Observable<User> {
    console.log('📡 Making /me request...');
    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      tap(user => {
        console.log('✅ User data received:', user);
        this.currentUserSubject.next(user);
      }),
      catchError(error => {
        console.error('❌ Get current user error:', error);
        if (error.status === 401 && this.isBrowser) {
          console.log('🔐 401 error, clearing auth...');
          localStorage.removeItem('token');
          this.currentUserSubject.next(null);
        }
        return throwError(() => error);
      })
    );
  }

  get currentUserValue(): User | null {
    const user = this.currentUserSubject.value;
    console.log('👤 Current user value:', user);
    return user;
  }

  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    const hasRole = user ? user.role === role : false;
    console.log(`🎭 Role check for ${role}:`, hasRole);
    return hasRole;
  }

  loadUserData(): void {
    console.log('🔄 LoadUserData called');
    if (this.isBrowser && this.isAuthenticated() && !this.currentUserValue) {
      const token = localStorage.getItem('token');
      console.log('📤 Loading user data with token:', token ? 'Token exists' : 'No token');
     
      this.getCurrentUser().subscribe({
        next: (user) => {
          console.log('✅ User loaded successfully:', user);
          this.currentUserSubject.next(user);
        },
        error: (error) => {
          console.error('❌ Failed to load user data:', error);
          console.log('🔍 Token in localStorage:', localStorage.getItem('token'));
          if (this.isBrowser) {
            localStorage.removeItem('token');
          }
          this.currentUserSubject.next(null);
        }
      });
    } else {
      console.log('⚠️ LoadUserData skipped:', {
        isBrowser: this.isBrowser,
        isAuthenticated: this.isAuthenticated(),
        hasCurrentUser: !!this.currentUserValue
      });
    }
  }
}