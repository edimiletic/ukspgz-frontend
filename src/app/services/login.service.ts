import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { User } from '../model/user.model';
import { Router } from '@angular/router';
import { environment } from '../../enviroments/enviroment';
import { environment_prod } from '../../enviroments/enviroment.prod';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment_prod.apiUrl;
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
    console.log('🔗 Using API URL:', this.apiUrl);
    
    // Only try to restore user from token in browser
    if (this.isBrowser && this.isAuthenticated()) {
      console.log('🔧 Token found on service init, loading user data...');
      this.loadUserData();
    }
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });
    
    // Only access localStorage in browser
    if (this.isBrowser) {
      const token = localStorage.getItem('token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    return headers;
  }

  login(credentials: { username: string, password: string }): Observable<any> {
    console.log('🔑 Login attempt for:', credentials.username);
    console.log('🔗 Login URL:', `${this.apiUrl}/login`);
    
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      tap(response => {
        console.log('✅ Login successful:', response);
        if (response.token && this.isBrowser) {
          console.log('💾 Storing token in localStorage');
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

  register(userData: any): Observable<any> {
    console.log('📝 Register attempt for:', userData.username);
    console.log('🔗 Register URL:', `${this.apiUrl}/register`);
    
    return this.http.post<any>(`${this.apiUrl}/register`, userData, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      tap(response => {
        console.log('✅ Registration successful:', response);
        if (response.token && this.isBrowser) {
          console.log('💾 Storing token in localStorage');
          localStorage.setItem('token', response.token);
          if (response.user) {
            console.log('👤 Setting current user:', response.user);
            this.currentUserSubject.next(response.user);
          }
        }
      }),
      catchError(error => {
        console.error('❌ Registration error:', error);
        return throwError(() => error);
      })
    );
  }

  logout(): void {
    console.log('🚪 Logout called');
    if (this.isBrowser) {
      console.log('🗑️ Removing token from localStorage');
      localStorage.removeItem('token');
    }
    this.currentUserSubject.next(null);
    console.log('🧭 Redirecting to login');
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
    // Don't make HTTP calls during SSR
    if (!this.isBrowser) {
      console.log('🌐 Server-side rendering - returning null user');
      return of(null as any);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      console.log('🚫 No token found for getCurrentUser');
      return throwError(() => new Error('No token found'));
    }

    console.log('📡 Making /me request...');
    console.log('🔗 Me URL:', `${this.apiUrl}/me`);
    
    return this.http.get<User>(`${this.apiUrl}/me`, {
      headers: this.getAuthHeaders()
    }).pipe(
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

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  isReferee(): boolean {
    return this.hasRole('Referee');
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

  // Method to check if user owns a resource
  isOwner(resourceUserId: string): boolean {
    const currentUser = this.currentUserValue;
    if (!currentUser) return false;
    
    const isOwner = currentUser._id === resourceUserId;
    console.log(`🏠 Ownership check: ${isOwner} (current: ${currentUser._id}, resource: ${resourceUserId})`);
    return isOwner;
  }

  // Method to check if user can perform action (admin or owner)
  canPerformAction(resourceUserId?: string): boolean {
    if (this.isAdmin()) {
      console.log('👑 Admin can perform any action');
      return true;
    }
    
    if (resourceUserId && this.isOwner(resourceUserId)) {
      console.log('🏠 Owner can perform action on their resource');
      return true;
    }
    
    console.log('🚫 Cannot perform action - not admin or owner');
    return false;
  }

  // Method to refresh current user data
  refreshUser(): Observable<User> {
    console.log('🔄 Refreshing user data');
    return this.getCurrentUser();
  }

  // Method to get token (SSR-safe)
  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem('token');
  }

  // Method to check if user data is loaded
  isUserLoaded(): boolean {
    const loaded = !!this.currentUserValue;
    console.log('📊 User loaded check:', loaded);
    return loaded;
  }
}