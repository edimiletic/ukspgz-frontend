import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
import { tap, catchError, map, finalize } from 'rxjs/operators';
import { canManageCalendar, canNominateOfficials, canSeeAllGames, canViewEligibleOfficials, canViewStatistics, GAME_ASSIGNMENT_ROLES, getRoleNames, isAdminUser, normalizeRoleAssignments, pickPrimaryRole, userHasRole } from '../model/roles';
import { User } from '../model/user.model';
import { Router } from '@angular/router';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl;
  private currentUserSubject = new BehaviorSubject<User | null>(null);
  public currentUser$ = this.currentUserSubject.asObservable();
  private csrfTokenValue = '';
  private isBrowser: boolean;

  get csrfToken(): string {
    return this.csrfTokenValue;
  }

  setCsrfToken(token: string | null | undefined): void {
    if (token) {
      this.csrfTokenValue = token;
    }
  }

  constructor(
    private http: HttpClient,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    this.discardLegacyToken();
  }

  private discardLegacyToken(): void {
    if (this.isBrowser) {
      localStorage.removeItem('token');
    }
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
      role: pickPrimaryRole(assignments)
    };
  }

  resetPassword(token: string, password: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/reset-password`, { token, password });
  }

  changePassword(currentPassword: string, newPassword: string): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/change-password`, {
      currentPassword,
      newPassword
    });
  }

  login(credentials: { username: string, password: string }): Observable<any> {
    return this.http.post<any>(`${this.apiUrl}/login`, credentials, {
      headers: { 'Content-Type': 'application/json' }
    }).pipe(
      tap(response => {
        this.discardLegacyToken();
        const user = this.normalizeUser(response.user);
        if (user) {
          this.currentUserSubject.next(user);
        }
      }),
      catchError(error => throwError(() => error))
    );
  }

  logout(): void {
    const finish = () => {
      this.clearSession();
      this.router.navigate(['/login']);
    };

    if (!this.isBrowser) {
      finish();
      return;
    }

    this.http.post(`${this.apiUrl}/logout`, {}).pipe(
      finalize(finish)
    ).subscribe({ error: () => undefined });
  }

  clearSession(): void {
    this.discardLegacyToken();
    this.csrfTokenValue = '';
    this.currentUserSubject.next(null);
  }

  isAuthenticated(): boolean {
    return !!this.currentUserValue;
  }

  getCurrentUser(): Observable<User> {
    if (this.currentUserValue) {
      return of(this.currentUserValue);
    }

    if (!this.isBrowser) {
      return of(null as any);
    }

    return this.http.get<User>(`${this.apiUrl}/me`).pipe(
      map(user => this.normalizeUser(user) as User),
      tap(user => this.currentUserSubject.next(user)),
      catchError(error => {
        if (error.status === 401 || error.status === 403) {
          this.clearSession();
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
    if (this.isBrowser && !this.currentUserValue) {
      this.getCurrentUser().subscribe({
        next: (user) => this.currentUserSubject.next(user),
        error: () => this.clearSession()
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

  isUserLoaded(): boolean {
    return !!this.currentUserValue;
  }
}
