// src/app/services/basketball-game.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { EMPTY, Observable } from 'rxjs';
import { expand, map, reduce } from 'rxjs/operators';
import { GameFilters, RespondAssignmentRequest, AssignRefereeRequest, CreateGameRequest, RefereeAssignment, BasketballGame } from '../model/basketballGame.model';
import { environment } from '../../environments/environment';
@Injectable({
  providedIn: 'root'
})
export class BasketballGameService {
private apiUrl = environment.apiUrl + '/basketball-games';

  constructor(private http: HttpClient) {}

  // Get games assigned to current user
  getMyAssignments(): Observable<BasketballGame[]> {
    return this.http.get<BasketballGame[]>(`${this.apiUrl}/my-assignments`);
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

    return this.http.get<{games: BasketballGame[], pagination: any}>(`${this.apiUrl}${queryParams}`);
  }

  // The list endpoint defaults to 20 games per page. Callers that manage or
  // count the schedule need every page, not just the earliest ones.
  getAllGamesComplete(filters?: GameFilters): Observable<BasketballGame[]> {
    const limit = 100;
    const rest: GameFilters = { ...(filters || {}) };
    delete rest.page;
    delete rest.limit;

    const loadPage = (page: number) => this.getAllGames({ ...rest, page, limit });

    return loadPage(1).pipe(
      expand(response => {
        const pagination = response?.pagination;
        const currentPage = Number(pagination?.currentPage) || 1;
        if (!pagination?.hasNext || currentPage >= 200) {
          return EMPTY;
        }
        return loadPage(currentPage + 1);
      }),
      map(response => response?.games || []),
      reduce((all, games) => all.concat(games), [] as BasketballGame[])
    );
  }

  // Get game by ID
  getGameById(gameId: string): Observable<BasketballGame> {
    return this.http.get<BasketballGame>(`${this.apiUrl}/${gameId}`);
  }

  // Create new game (Admin only)
  createGame(gameData: CreateGameRequest): Observable<BasketballGame> {
    return this.http.post<BasketballGame>(this.apiUrl, gameData);
  }

  // Update game (Admin only)
  updateGame(gameId: string, gameData: Partial<CreateGameRequest>): Observable<BasketballGame> {
    return this.http.put<BasketballGame>(`${this.apiUrl}/${gameId}`, gameData);
  }

  // Delete game (Admin only)
  deleteGame(gameId: string): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${gameId}`);
  }

  // Assign referee to game (Admin only)
  assignReferee(gameId: string, assignmentData: AssignRefereeRequest): Observable<BasketballGame> {
    return this.http.post<BasketballGame>(`${this.apiUrl}/${gameId}/assign-referee`, assignmentData);
  }

  // Remove referee assignment (Admin only)
  removeRefereeAssignment(gameId: string, assignmentId: string): Observable<BasketballGame> {
    return this.http.delete<BasketballGame>(`${this.apiUrl}/${gameId}/remove-referee/${assignmentId}`);
  }

  updateRefereeAssignment(gameId: string, assignmentId: string, data: { position?: number }): Observable<BasketballGame> {
    return this.http.patch<BasketballGame>(`${this.apiUrl}/${gameId}/referee-assignment/${assignmentId}`, data);
  }

  notifyColleagueReplacement(gameId: string, payload: { removedUserIds: string[]; addedUserIds: string[] }): Observable<{ notified: number }> {
    return this.http.post<{ notified: number }>(`${this.apiUrl}/${gameId}/colleague-replacement`, payload);
  }

  // Accept or reject assignment (Referee only)
  respondToAssignment(gameId: string, response: RespondAssignmentRequest): Observable<BasketballGame> {
    return this.http.patch<BasketballGame>(`${this.apiUrl}/${gameId}/respond-assignment`, response);
  }

  // Get available positions for a role (Admin only)
  getAvailablePositions(gameId: string, role: 'Sudac' | 'Delegat' | 'Pomoćni Sudac'): Observable<{role: string, availablePositions: number[], currentAssignments: any}> {
    return this.http.get<{role: string, availablePositions: number[], currentAssignments: any}>(`${this.apiUrl}/${gameId}/available-positions/${role}`);
  }

  // Get referee assignment summary
  getRefereeAssignmentSummary(gameId: string): Observable<any> {
    return this.http.get<any>(`${this.apiUrl}/${gameId}/referee-summary`);
  }

// In basketball-game.service.ts - FIXED
getGamesByRefereeAndDate(refereeId: string, date: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/referee/${refereeId}/date/${date}`);
}

getGamesOnDate(date: string): Observable<any[]> {
  return this.http.get<any[]>(`${this.apiUrl}/schedule/${date}`);
}
}