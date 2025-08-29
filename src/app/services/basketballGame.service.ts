// src/app/services/basketball-game.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { GameFilters, RespondAssignmentRequest, AssignRefereeRequest, CreateGameRequest, RefereeAssignment, BasketballGame } from '../model/basketballGame.model';
import { environment } from '../../../enviroment.prod';
@Injectable({
  providedIn: 'root'
})
export class BasketballGameService {
private apiUrl = environment.apiUrl + '/basketball-games';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get games assigned to current user
  getMyAssignments(): Observable<BasketballGame[]> {
    return this.http.get<BasketballGame[]>(`${this.apiUrl}/my-assignments`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all games (Admin only) with optional filters
  getAllGames(filters?: GameFilters): Observable<{games: BasketballGame[], pagination: any}> {
    let queryParams = '';
    if (filters) {
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          params.append(key, value.toString());
        }
      });
      queryParams = params.toString() ? `?${params.toString()}` : '';
    }

    return this.http.get<{games: BasketballGame[], pagination: any}>(`${this.apiUrl}${queryParams}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get game by ID
  getGameById(gameId: string): Observable<BasketballGame> {
    return this.http.get<BasketballGame>(`${this.apiUrl}/${gameId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Create new game (Admin only)
  createGame(gameData: CreateGameRequest): Observable<BasketballGame> {
    return this.http.post<BasketballGame>(this.apiUrl, gameData, {
      headers: this.getAuthHeaders()
    });
  }

  // Update game (Admin only)
  updateGame(gameId: string, gameData: Partial<CreateGameRequest>): Observable<BasketballGame> {
    return this.http.put<BasketballGame>(`${this.apiUrl}/${gameId}`, gameData, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete game (Admin only)
  deleteGame(gameId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${gameId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Assign referee to game (Admin only)
  assignReferee(gameId: string, assignmentData: AssignRefereeRequest): Observable<BasketballGame> {
    return this.http.post<BasketballGame>(`${this.apiUrl}/${gameId}/assign-referee`, assignmentData, {
      headers: this.getAuthHeaders()
    });
  }

  // Remove referee assignment (Admin only)
  removeRefereeAssignment(gameId: string, assignmentId: string): Observable<BasketballGame> {
    return this.http.delete<BasketballGame>(`${this.apiUrl}/${gameId}/remove-referee/${assignmentId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Accept or reject assignment (Referee only)
  respondToAssignment(gameId: string, response: RespondAssignmentRequest): Observable<BasketballGame> {
    return this.http.patch<BasketballGame>(`${this.apiUrl}/${gameId}/respond-assignment`, response, {
      headers: this.getAuthHeaders()
    });
  }

  // Get available positions for a role (Admin only)
  getAvailablePositions(gameId: string, role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac'): Observable<{role: string, availablePositions: number[], currentAssignments: any}> {
    return this.http.get<{role: string, availablePositions: number[], currentAssignments: any}>(`${this.apiUrl}/${gameId}/available-positions/${role}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get referee assignment summary
  getRefereeAssignmentSummary(gameId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${gameId}/referee-summary`, {
      headers: this.getAuthHeaders()
    });
  }

// In basketball-game.service.ts - FIXED
getGamesByRefereeAndDate(refereeId: string, date: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/referee/${refereeId}/date/${date}`, {
    headers: this.getAuthHeaders() // ← Add this line
  });
}
}