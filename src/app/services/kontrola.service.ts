import { Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Observable, of, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';
import { KontrolaData, ViewKontrolaData } from '../model/kontrola.model';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root'
})
export class KontrolaService {
  private apiUrl = environment.apiUrl;

  constructor(private http: HttpClient) {}

  private handleError(error: HttpErrorResponse) {
    let errorMessage = 'Došlo je do greške';

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
    return this.http.post(`${this.apiUrl}/kontrola`, kontrolaData)
      .pipe(catchError(this.handleError.bind(this)));
  }

  getMyKontrola(gameId: string): Observable<ViewKontrolaData> {
    return this.http.get<ViewKontrolaData>(`${this.apiUrl}/kontrola/referee/${gameId}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  getFullKontrola(gameId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/kontrola/game/${gameId}/all`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  hasKontrola(gameId: string): Observable<{exists: boolean}> {
    return this.http.get<{exists: boolean}>(`${this.apiUrl}/kontrola/exists/${gameId}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  updateKontrola(gameId: string, kontrolaData: KontrolaData): Observable<any> {
    return this.http.put(`${this.apiUrl}/kontrola/${gameId}`, kontrolaData)
      .pipe(catchError(this.handleError.bind(this)));
  }

  getKontrolaForEdit(gameId: string): Observable<any> {
    return this.http.get(`${this.apiUrl}/kontrola/edit/${gameId}`)
      .pipe(catchError(this.handleError.bind(this)));
  }

  getAllKontrolaData(): Observable<any[]> {
    return this.http.get<any[]>(`${this.apiUrl}/kontrola/statistics/all`)
      .pipe(catchError(() => of([])));
  }

  getAllKontrolaForStatistics(filters?: any): Observable<any[]> {
    const params = new URLSearchParams();
    if (filters) {
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.competition) params.append('competition', filters.competition);
      if (filters.role) params.append('role', filters.role);
    }
    const queryString = params.toString();
    const url = `${this.apiUrl}/kontrola/statistics${queryString ? '?' + queryString : ''}`;
    return this.http.get<any[]>(url)
      .pipe(catchError(this.handleError.bind(this)));
  }
}
