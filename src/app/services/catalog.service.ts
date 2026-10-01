import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../enviroments/enviroment';
import { CatalogTeam, CatalogVenue } from '../model/catalog.model';

@Injectable({
  providedIn: 'root'
})
export class CatalogService {
  private apiUrl = environment.apiUrl + '/catalog';

  constructor(private http: HttpClient) {}

  getTeams(): Observable<CatalogTeam[]> {
    return this.http.get<CatalogTeam[]>(`${this.apiUrl}/teams`);
  }

  getVenues(): Observable<CatalogVenue[]> {
    return this.http.get<CatalogVenue[]>(`${this.apiUrl}/venues`);
  }
}
