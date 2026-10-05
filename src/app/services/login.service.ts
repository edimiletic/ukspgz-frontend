import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map } from 'rxjs/operators';
import { canManageCalendar, canNominateAssistants, canNominateOfficials, canSeeAllGames, canViewEligibleOfficials, canViewStatistics, GAME_ASSIGNMENT_ROLES, getRoleNames, isAdminUser, normalizeRoleAssignments, pickPrimaryRole, userHasRole } from '../model/roles';
import { User } from '../model/user.model';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

function decodeJwtPayload(token: string): { exp?: number } {
  const parts = token.split('.');
  if (parts.length !== 3) {
    throw new Error('Invalid token');
  }
  const normalized = parts[1].replace(/-/g, '+').replace(/_/g, '/');
  const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
  return JSON.parse(atob(padded));
}

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
  }

  private normalizeUser(user: any): User | null {
    if (!user) {
      return null;
    }
    const assignments = normalizeRoleAssignments(user);
    const id = String(user._id || user.id || '');
    return {
      ...user,
      _id: id,
      id,
      roles: assignments,
      role: user.role || pickPrimaryRole(assignments)
    };
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
    this.clearSession();
    this.router.navigate(['/login']);
  }

  clearSession(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
    }
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    if (!this.isBrowser) return false;

    const token = localStorage.getItem('token');
    if (!token) return false;

    try {
      const payload = decodeJwtPayload(token);
      const isExpired = typeof payload.exp === 'number' && payload.exp * 1000 < Date.now();

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
    if (this.currentUserValue) {
      return of(this.currentUserValue);
    }

    if (!this.isBrowser) {
      return of(null as any);
    }

    const token = localStorage.getItem('token');
    if (!token) {
      return throwError(() => new Error('No token found'));
    }

    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
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
    return userHasRole(this.currentUserValue, role);
  }

  isAdmin(): boolean {
    return isAdminUser(this.currentUserValue);
  }

  isReferee(): boolean {
    return getRoleNames(this.currentUserValue).some(role => GAME_ASSIGNMENT_ROLES.includes(role as any));
  }

  canManageCalendar(competition?: string): boolean {
    return canManageCalendar(this.currentUserValue, competition);
  }

  canNominateOfficials(competition?: string): boolean {
    return canNominateOfficials(this.currentUserValue, competition);
  }

  canNominateAssistants(competition?: string): boolean {
    return canNominateAssistants(this.currentUserValue, competition);
  }

  canSeeAllGames(): boolean {
    return canSeeAllGames(this.currentUserValue);
  }

  canViewEligibleOfficials(): boolean {
    return canViewEligibleOfficials(this.currentUserValue);
  }

  canViewStatistics(): boolean {
    return canViewStatistics(this.currentUserValue);
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
    this.currentUserSubject.next(null);
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
