// src/app/services/app-init.service.ts
import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AppInitService {
  private isInitializedSubject = new BehaviorSubject<boolean>(false);
  public isInitialized$ = this.isInitializedSubject.asObservable();

  private isAuthenticatedSubject = new BehaviorSubject<boolean>(false);
  public isAuthenticated$ = this.isAuthenticatedSubject.asObservable();

  constructor() {
    this.checkInitialAuth();
  }

  private checkInitialAuth(): void {
    // Small delay to prevent flash
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        this.isAuthenticatedSubject.next(!!token);
      }
      this.isInitializedSubject.next(true);
    }, 100); // 100ms delay to prevent flash
  }

  get isInitialized(): boolean {
    return this.isInitializedSubject.value;
  }

  get isAuthenticated(): boolean {
    return this.isAuthenticatedSubject.value;
  }

  setAuthStatus(status: boolean): void {
    this.isAuthenticatedSubject.next(status);
  }
}