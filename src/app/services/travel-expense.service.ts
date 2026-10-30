import { TravelExpenseFilters, TravelExpense, EligibleTravelGame } from './../model/travel-expense.model';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { map } from 'rxjs/operators';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../environments/environment';

interface PaginatedTravelExpenses {
  expenses: TravelExpense[];
  totalPages: number;
  currentPage: number;
  total: number;
}

@Injectable({
  providedIn: 'root'
})
export class TravelExpenseService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: object
  ) {}

  downloadTemplate(): Observable<Blob> {
    return this.http.get(`${this.apiUrl}/travel-expense/template`, { responseType: 'blob' });
  }

  getEligibleGames(): Observable<EligibleTravelGame[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    return this.http.get<EligibleTravelGame[]>(`${this.apiUrl}/travel-expense/eligible-games`);
  }

  submitTravelOrder(formData: FormData): Observable<TravelExpense> {
    return this.http.post<TravelExpense>(`${this.apiUrl}/travel-expense`, formData);
  }

  getCurrentUserTravelExpenses(page = 1, limit = 100): Observable<TravelExpense[]> {
    if (!isPlatformBrowser(this.platformId)) {
      return of([]);
    }
    return this.http
      .get<PaginatedTravelExpenses>(`${this.apiUrl}/travel-expense/my`, {
        params: this.pageParams(page, limit)
      })
      .pipe(map((body) => this.unwrapExpenses(body)));
  }

  getAllTravelExpenses(page = 1, limit = 100): Observable<TravelExpense[]> {
    return this.http
      .get<PaginatedTravelExpenses>(`${this.apiUrl}/travel-expense`, {
        params: this.pageParams(page, limit)
      })
      .pipe(map((body) => this.unwrapExpenses(body)));
  }

  getTravelExpenseById(expenseId: string): Observable<TravelExpense> {
    return this.http.get<TravelExpense>(`${this.apiUrl}/travel-expense/${expenseId}`);
  }

  deleteTravelExpense(expenseId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/travel-expense/${expenseId}`);
  }

  reviewTravelExpense(
    reportId: string,
    action: 'approve' | 'reject',
    reviewComments?: string
  ): Observable<TravelExpense> {
    return this.http.patch<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/review`, {
      action,
      reviewComments
    });
  }

  fileUrl(expenseId: string, kind: 'nalog' | 'fuel' | 'toll'): string {
    return `${this.apiUrl}/travel-expense/${expenseId}/files/${kind}`;
  }

  downloadFile(expenseId: string, kind: 'nalog' | 'fuel' | 'toll'): Observable<Blob> {
    return this.http.get(this.fileUrl(expenseId, kind), { responseType: 'blob' });
  }

  getTravelExpensesWithFilters(filters: TravelExpenseFilters): Observable<TravelExpense[]> {
    const queryParams = new URLSearchParams();
    if (filters.id) queryParams.append('id', filters.id.toString());
    if (filters.assignmentRole) queryParams.append('assignmentRole', filters.assignmentRole);
    if (filters.userName) queryParams.append('userName', filters.userName);
    if (filters.state) queryParams.append('state', filters.state);
    const queryString = queryParams.toString();
    const url = queryString ? `${this.apiUrl}/travel-expense?${queryString}` : `${this.apiUrl}/travel-expense`;
    return this.http.get<PaginatedTravelExpenses | TravelExpense[]>(url).pipe(map((body) => this.unwrapExpenses(body)));
  }

  private pageParams(page: number, limit: number): HttpParams {
    return new HttpParams().set('page', String(page)).set('limit', String(limit));
  }

  private unwrapExpenses(body: PaginatedTravelExpenses | TravelExpense[] | null | undefined): TravelExpense[] {
    if (Array.isArray(body)) {
      return body;
    }
    return body?.expenses || [];
  }
}
