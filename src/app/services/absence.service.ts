import { Absence, AbsenceCreateRequest, AbsenceUpdateRequest } from './../model/absence.model';
// src/app/services/absence.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AbsenceService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Create a new absence record
  createAbsence(absenceData: AbsenceCreateRequest): Observable<Absence> {
    return this.http.post<Absence>(`${this.apiUrl}/absence`, absenceData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Get all absences for the current user
  getCurrentUserAbsences(): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/absence/my`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Get all absences (admin functionality)
  getAllAbsences(): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/absence`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Update an existing absence
  updateAbsence(absenceData: AbsenceUpdateRequest): Observable<Absence> {
    return this.http.put<Absence>(`${this.apiUrl}/absence/${absenceData.id}`, absenceData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Delete an absence
  deleteAbsence(absenceId: number): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/absence/${absenceId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Get absence by ID
  getAbsenceById(absenceId: number): Observable<Absence> {
    return this.http.get<Absence>(`${this.apiUrl}/absence/${absenceId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }
}