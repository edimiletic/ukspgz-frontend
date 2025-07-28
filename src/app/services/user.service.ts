// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../model/user.model';

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = 'http://localhost:3000/api/users';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get all referees (Admin only)
  getReferees(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/referees`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all users (Admin only)
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get user by ID (Admin only)
  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Create new user (Admin only)
  createUser(userData: Partial<User>): Observable<User> {
    return this.http.post<User>(this.apiUrl, userData, {
      headers: this.getAuthHeaders()
    });
  }

  // Update user (Admin only)
  updateUser(userId: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}`, userData, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete user (Admin only)
  deleteUser(userId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${userId}`, {
      headers: this.getAuthHeaders()
    });
  }
}