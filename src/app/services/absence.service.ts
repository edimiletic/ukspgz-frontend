import { Absence, AbsenceCreateRequest, AbsenceUpdateRequest } from './../model/absence.model';
// src/app/services/absence.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable, defer } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
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

  // Get all absences (admin functionality) - Updated to handle pagination
  getAllAbsences(page = 1, limit = 100): Observable<Absence[]> {
    return this.http.get<PaginatedAbsenceResponse>(`${this.apiUrl}/absence?page=${page}&limit=${limit}`).pipe(
      map(response => response.absences) // Extract just the absences array
    );
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

  // Server default page size is 10. Callers that decide availability or totals
  // must read every page or later absences silently disappear.
  getEveryAbsence(): Observable<Absence[]> {
    const limit = 200;
    const maxPages = 100;
    const fetchPage = (page: number) => this.getAllAbsencesPaginated(page, limit);

    return defer(() => {
      let page = 1;
      return fetchPage(page).pipe(
        expand((response) => {
          const totalPages = Number(response?.totalPages) || 1;
          const batch = response?.absences || [];
          if (batch.length === 0 || page >= totalPages || page >= maxPages) {
            return EMPTY;
          }
          page += 1;
          return fetchPage(page);
        }),
        map(response => response?.absences || []),
        reduce((all, absences) => all.concat(absences), [] as Absence[])
      );
    });
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