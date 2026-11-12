import { Absence, AbsenceCreateRequest, AbsenceUpdateRequest } from './../model/absence.model';
// src/app/services/absence.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map, switchMap } from 'rxjs/operators';
import { environment } from '../../environments/environment';


// Interface for the paginated response from backend
interface PaginatedAbsenceResponse {
  absences: Absence[];
  totalPages: number;
  currentPage: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class AbsenceService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  // Create a new absence record
  createAbsence(absenceData: AbsenceCreateRequest): Observable<Absence> {
    return this.http.post<Absence>(`${this.apiUrl}/absence`, absenceData);
  }

  // Get all absences for the current user
  getCurrentUserAbsences(): Observable<Absence[]> {
    return this.http.get<Absence[]>(`${this.apiUrl}/absence/my`);
  }

  // One page of absences. Callers that need the full set must use getEveryAbsence.
  getAllAbsences(page = 1, limit = 100): Observable<Absence[]> {
    return this.fetchAbsencePage(page, limit).pipe(
      map(response => response.absences || [])
    );
  }

  // The list endpoint is paginated. Availability, statistics, and the absence
  // overview all need every record; stopping after the default page hides
  // later absences and lets those officials be nominated while they are away.
  getEveryAbsence(pageSize = 100): Observable<Absence[]> {
    const maxPages = 200;
    const collect = (page: number): Observable<Absence[]> =>
      this.fetchAbsencePage(page, pageSize).pipe(
        switchMap(response => {
          const absences = response?.absences || [];
          const totalPages = Math.max(1, Number(response?.totalPages) || 1);
          if (page >= totalPages || absences.length === 0 || page >= maxPages) {
            return of(absences);
          }
          return collect(page + 1).pipe(
            map(rest => absences.concat(rest))
          );
        })
      );

    return collect(1);
  }

  private fetchAbsencePage(page: number, limit: number): Observable<PaginatedAbsenceResponse> {
    return this.http.get<PaginatedAbsenceResponse>(`${this.apiUrl}/absence?page=${page}&limit=${limit}`);
  }

  // Get all absences with pagination info (for future use)
  getAllAbsencesPaginated(page = 1, limit = 10, filters?: any): Observable<PaginatedAbsenceResponse> {
    let queryParams = `page=${page}&limit=${limit}`;
    
    if (filters) {
      if (filters.userPersonalCode) queryParams += `&userPersonalCode=${filters.userPersonalCode}`;
      if (filters.startDate) queryParams += `&startDate=${filters.startDate}`;
      if (filters.endDate) queryParams += `&endDate=${filters.endDate}`;
    }

    return this.http.get<PaginatedAbsenceResponse>(`${this.apiUrl}/absence?${queryParams}`);
  }

  // Update an existing absence
  updateAbsence(absenceData: AbsenceUpdateRequest): Observable<Absence> {
    return this.http.put<Absence>(`${this.apiUrl}/absence/${absenceData._id}`, absenceData);
  }

  // Delete an absence
  deleteAbsence(absenceId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/absence/${absenceId}`);
  }

  // Get absence by ID
  getAbsenceById(absenceId: string): Observable<Absence> {
    return this.http.get<Absence>(`${this.apiUrl}/absence/${absenceId}`);
  }
}