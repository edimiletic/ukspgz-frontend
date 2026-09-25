import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/enviroment';
import { CatalogTeam, CatalogVenue } from '../model/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private apiUrl = environment.apiUrl + '/catalog';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  getTeams(): Observable<CatalogTeam[]> {
    return this.http.get<CatalogTeam[]>(`${this.apiUrl}/teams`, {
      headers: this.getAuthHeaders()
    });
  }

  getVenues(): Observable<CatalogVenue[]> {
    return this.http.get<CatalogVenue[]>(`${this.apiUrl}/venues`, {
      headers: this.getAuthHeaders()
    });
  }
}
