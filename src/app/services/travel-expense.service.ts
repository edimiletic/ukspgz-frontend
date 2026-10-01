import { TravelExpenseFilters, TravelExpense, NewTravelExpense } from './../model/travel-expense.model';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../enviroments/enviroment';

export interface TravelExpenseCreateRequest extends NewTravelExpense {}
export interface TravelExpenseUpdateRequest extends TravelExpense {}

@Injectable({
  providedIn: 'root'
})
export class TravelExpenseService {
  private apiUrl = environment.apiUrl;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
          }

  // Create a new travel expense record
  createTravelExpense(expenseData: TravelExpenseCreateRequest): Observable<TravelExpense> {
    return this.http.post<TravelExpense>(`${this.apiUrl}/travel-expense`, expenseData);
  }

  // Get all travel expenses for the current user
  getCurrentUserTravelExpenses(): Observable<TravelExpense[]> {
      if (!isPlatformBrowser(this.platformId)) {
        return of ([]);
  }
    return this.http.get<TravelExpense[]>(`${this.apiUrl}/travel-expense/my`);
  }

  // Get all travel expenses (admin functionality)
  getAllTravelExpenses(): Observable<TravelExpense[]> {
    return this.http.get<TravelExpense[]>(`${this.apiUrl}/travel-expense`);
  }

  // Update an existing travel expense
  updateTravelExpense(expenseData: TravelExpenseUpdateRequest): Observable<TravelExpense> {
    return this.http.put<TravelExpense>(`${this.apiUrl}/travel-expense/${expenseData.id}`, expenseData);
  }

  // Delete a travel expense - SSR SAFE VERSION
  deleteTravelExpense(expenseId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/travel-expense/${expenseId}`);
  }

  // Get travel expense by ID
  getTravelExpenseById(expenseId: string): Observable<TravelExpense> {
    return this.http.get<TravelExpense>(`${this.apiUrl}/travel-expense/${expenseId}`);
  }

  // PATCH - Add expense item to a travel expense report
  addExpenseItem(reportId: string, expenseItem: any): Observable<TravelExpense> {
    return this.http.patch<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/expenses`, expenseItem);
  }

  // DELETE - Remove expense item from a travel expense report
  removeExpenseItem(reportId: string, expenseItemId: string): Observable<TravelExpense> {
    return this.http.delete<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/expenses/${expenseItemId}`);
  }

  // PATCH - Submit travel expense report
  submitTravelExpense(reportId: string): Observable<TravelExpense> {
    return this.http.patch<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/submit`, {});
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

  // Get travel expenses with filters
  getTravelExpensesWithFilters(filters: TravelExpenseFilters): Observable<TravelExpense[]> {
    let queryParams = new URLSearchParams();
    
    if (filters.id) queryParams.append('id', filters.id.toString());
    if (filters.type) queryParams.append('type', filters.type);
    if (filters.userName) queryParams.append('userName', filters.userName);
    if (filters.year) queryParams.append('year', filters.year.toString());
    if (filters.month) queryParams.append('month', filters.month);
    if (filters.state) queryParams.append('state', filters.state);

    const queryString = queryParams.toString();
    const url = queryString ? `${this.apiUrl}/travel-expense?${queryString}` : `${this.apiUrl}/travel-expense`;

    return this.http.get<TravelExpense[]>(url);
  }
}