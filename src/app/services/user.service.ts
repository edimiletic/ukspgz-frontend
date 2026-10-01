// src/app/services/user.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { User } from '../model/user.model';
import { environment } from '../../enviroments/enviroment';

export interface EligibleOfficialsGroup {
  competition: string;
  officials: Array<{
    _id: string;
    name: string;
    surname: string;
    email?: string;
    roles: string[];
    rang?: string;
    najvisaLiga?: string;
  }>;
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private apiUrl = environment.apiUrl + '/users';

  constructor(private http: HttpClient) {}

  // Get all referees (Admin only)
  getReferees(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}/referees`);
  }

  getEligibleOfficials(): Observable<{ competitions: EligibleOfficialsGroup[] }> {
    return this.http.get<{ competitions: EligibleOfficialsGroup[] }>(`${this.apiUrl}/eligible-officials`);
  }

  // Get all users (Admin only)
  getAllUsers(): Observable<User[]> {
    return this.http.get<User[]>(`${this.apiUrl}`);
  }

  // Get user by ID (Admin only)
  getUserById(userId: string): Observable<User> {
    return this.http.get<User>(`${this.apiUrl}/${userId}`);
  }

  // Create new user (Admin only)
  createUser(userData: Partial<User>): Observable<User> {
    return this.http.post<User>(this.apiUrl, userData);
  }

  // Update user (Admin only)
  updateUser(userId: string, userData: Partial<User>): Observable<User> {
    return this.http.put<User>(`${this.apiUrl}/${userId}`, userData);
  }

  // Delete user (Admin only)
  deleteUser(userId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${userId}`);
  }
}