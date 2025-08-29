// src/app/services/kontrola.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse, HttpHeaders } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError, tap } from 'rxjs/operators';
import { KontrolaData, ViewKontrolaData } from '../model/kontrola.model';
import { environment } from '../../../enviroment.prod';

@Injectable({
  providedIn: 'root'
})
export class KontrolaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {
    console.log('KontrolaService constructor called');
  }

  // ← Add this helper method to get auth headers
  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    console.log('KontrolaService: Getting auth headers, token exists:', !!token);
    
    if (token) {
      return new HttpHeaders({
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      });
    }
    
    return new HttpHeaders({
      'Content-Type': 'application/json'
    });
  }

// src/app/services/kontrola.service.ts
// Update the handleError method

private handleError(error: HttpErrorResponse) {
  let errorMessage = 'Došlo je do greške';
  
  console.log('KontrolaService Error:', error);
  console.log('Error status:', error.status);
  console.log('Error body:', error.error);
  
  if (error.status === 401) {
    errorMessage = 'Nemate dozvolu za pristup. Molimo prijavite se ponovo.';
  } else if (error.status === 403) {
    errorMessage = 'Nemate dozvolu za ovu akciju.';
  } else if (error.status === 404) {
    errorMessage = 'Traženi resurs nije pronađen.';
  } else if (error.status === 400 && error.error?.error) {
    errorMessage = error.error.error;
  } else if (error.error?.error) {
    errorMessage = error.error.error;
  } else if (error.status === 0) {
    errorMessage = 'Greška u komunikaciji sa serverom. Provjerite mrežnu vezu.';
  }
  
  return throwError(() => new Error(errorMessage));
}

saveKontrola(kontrolaData: KontrolaData): Observable<any> {
  console.log('KontrolaService: Saving kontrola', kontrolaData);
  
  const headers = this.getAuthHeaders();
  console.log('KontrolaService: Request headers:', headers);
  
  return this.http.post(`${this.apiUrl}/kontrola`, kontrolaData, { headers })
    .pipe(
      tap((response) => console.log('KontrolaService: Save response:', response)),
      catchError(this.handleError.bind(this))
    );
}

  getMyKontrola(gameId: string): Observable<ViewKontrolaData> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<ViewKontrolaData>(`${this.apiUrl}/kontrola/referee/${gameId}`, { headers })
      .pipe(catchError(this.handleError.bind(this)));
  }

  hasKontrola(gameId: string): Observable<{exists: boolean}> {
    const headers = this.getAuthHeaders();
    
    return this.http.get<{exists: boolean}>(`${this.apiUrl}/kontrola/exists/${gameId}`, { headers })
      .pipe(catchError(this.handleError.bind(this)));
  }


updateKontrola(gameId: string, kontrolaData: KontrolaData): Observable<any> {
  console.log('KontrolaService: Updating kontrola for game:', gameId);
  
  const headers = this.getAuthHeaders();
  
  return this.http.put(`${this.apiUrl}/kontrola/${gameId}`, kontrolaData, { headers })
    .pipe(
      tap((response) => console.log('KontrolaService: Update response:', response)),
      catchError(this.handleError.bind(this))
    );
}

getKontrolaForEdit(gameId: string): Observable<any> {
  console.log('KontrolaService: Getting kontrola for edit, gameId:', gameId);
  
  const headers = this.getAuthHeaders();
  
  return this.http.get(`${this.apiUrl}/kontrola/edit/${gameId}`, { headers })
    .pipe(
      tap((response) => console.log('KontrolaService: Edit data response:', response)),
      catchError(this.handleError.bind(this))
    );
}


getAllKontrolaData(): Observable<any[]> {
  console.log('KontrolaService: Getting all kontrola data for statistics');
  
  const headers = this.getAuthHeaders();
  
  return this.http.get<any[]>(`${this.apiUrl}/kontrola/statistics/all`, { headers })
    .pipe(
      catchError((error) => {
        console.log('Kontrola statistics endpoint not available, returning empty array');
        return of([]); // Return empty array if endpoint doesn't exist
      })
    );
}

getAllKontrolaForStatistics(filters?: any): Observable<any[]> {
  console.log('KontrolaService: Getting all kontrola data for statistics with filters:', filters);
  
  const headers = this.getAuthHeaders();
  
  // Build query parameters
  let params = new URLSearchParams();
  if (filters) {
    if (filters.startDate) params.append('startDate', filters.startDate);
    if (filters.endDate) params.append('endDate', filters.endDate);
    if (filters.competition) params.append('competition', filters.competition);
    if (filters.role) params.append('role', filters.role);
  }
  
  const queryString = params.toString();
  const url = `${this.apiUrl}/kontrola/statistics${queryString ? '?' + queryString : ''}`;
  
  console.log('Making request to:', url); // Debug log
  
  return this.http.get<any[]>(url, { headers })
    .pipe(
      tap((response) => console.log('KontrolaService: Statistics response:', response.length, 'records')),
      catchError(this.handleError.bind(this))
    );
}
}