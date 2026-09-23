import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { User } from '../model/user.model';
import { Router } from '@angular/router';
import { environment } from '../../enviroments/enviroment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);

    if (this.isBrowser && this.isAuthenticated()) {
      this.loadUserData();
    }
  }

  private normalizeUser(user: any): User | null {
    if (!user) {
      return null;
    }
    const id = String(user._id || user.id || '');
    return {
      ...user,
      _id: id,
      id
    };
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders({
      'Content-Type': 'application/json'
    });

    if (this.isBrowser) {
      const token = localStorage.getItem('token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }

    return headers;
  }

  login(credentials: { username: string, password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      tap(response => {
        if (response.token && this.isBrowser) {
          localStorage.setItem('token', response.token);
          const user = this.normalizeUser(response.user);
          if (user) {
            this.currentUserSubject.next(user);
          }
        }
      }),
      catchError(error => throwError(() => error))
    );
  }

  logout(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
    }
    this.currentUserSubject.next(null);
    this.router.navigate(['/login']);
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) return false;

    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const parts = token.split('.');
      if (parts.length !== 3) {
        localStorage.removeItem('token');
        return false;
      }

      const payload = JSON.parse(atob(parts[1]));
      const isExpired = payload.exp * 1000 < Date.now();

      if (isExpired) {
        localStorage.removeItem('token');
        this.currentUserSubject.next(null);
        return false;
      }

      return true;
    } catch {
      localStorage.removeItem('token');
      return false;
    }
  }

  getCurrentUser(): Observable<User> {
    if (!this.isBrowser) {
      return of(null as any);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    return this.http.get<User>(`${this.apiUrl}/me`, {
      headers: this.getAuthHeaders()
    }).pipe(
      map(user => this.normalizeUser(user) as User),
      tap(user => this.currentUserSubject.next(user)),
      catchError(error => {
        if (error.status === 401 && this.isBrowser) {
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

  getCurrentUserId(): string {
    const user = this.currentUserValue as User | any;
    return user?._id || user?.id || '';
  }

  hasRole(role: string): boolean {
    const user = this.currentUserValue;
    return user ? user.role === role : false;
  }

  isAdmin(): boolean {
    return this.hasRole('Admin');
  }

  isReferee(): boolean {
    const role = this.currentUserValue?.role;
    return role === 'Sudac' || role === 'Delegat' || role === 'Pomoćni Sudac';
  }

  loadUserData(): void {
    if (this.isBrowser && this.isAuthenticated() && !this.currentUserValue) {
      this.getCurrentUser().subscribe({
        next: (user) => this.currentUserSubject.next(user),
        error: () => {
          if (this.isBrowser) {
            localStorage.removeItem('token');
          }
          this.currentUserSubject.next(null);
        }
      });
    }
  }

  isOwner(resourceUserId: string): boolean {
    if (!resourceUserId) return false;
    return this.getCurrentUserId() === String(resourceUserId);
  }

  canPerformAction(resourceUserId?: string): boolean {
    if (this.isAdmin()) {
      return true;
    }
    return !!resourceUserId && this.isOwner(resourceUserId);
  }

  refreshUser(): Observable<User> {
    return this.getCurrentUser();
  }

  getToken(): string | null {
    if (!this.isBrowser) {
      return null;
    }
    return localStorage.getItem('token');
  }

  isUserLoaded(): boolean {
    return !!this.currentUserValue;
  }
}
