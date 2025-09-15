import { TravelExpenseFilters, TravelExpense, NewTravelExpense } from './../model/travel-expense.model';
import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import { isPlatformBrowser } from '@angular/common';
import { environment } from '../../enviroments/enviroment';
import { environment_prod } from '../../enviroments/enviroment.prod';

export interface TravelExpenseCreateRequest extends NewTravelExpense {}
export interface TravelExpenseUpdateRequest extends TravelExpense {}

@Injectable({
  providedIn: 'root'
})
export class TravelExpenseService {
  private apiUrl = environment_prod.apiUrl;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) private platformId: Object
  ) {
    console.log('🏗️ TravelExpenseService initialized with apiUrl:', this.apiUrl);
    console.log('🌍 Platform is browser:', isPlatformBrowser(this.platformId));
  }

  private getAuthHeaders(): HttpHeaders {
    let headers = new HttpHeaders();
    
    // Only access localStorage in browser
    if (isPlatformBrowser(this.platformId)) {
      const token = localStorage.getItem('token');
      if (token) {
        headers = headers.set('Authorization', `Bearer ${token}`);
      }
    }
    
    return headers;
  }

  // Create a new travel expense record
  createTravelExpense(expenseData: TravelExpenseCreateRequest): Observable<TravelExpense> {
    return this.http.post<TravelExpense>(`${this.apiUrl}/travel-expense`, expenseData, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all travel expenses for the current user
  getCurrentUserTravelExpenses(): Observable<TravelExpense[]> {
      if (!isPlatformBrowser(this.platformId)) {
    console.log('🌐 Server-side rendering - skipping travel expenses call');
    return of ([]);
  }
    return this.http.get<TravelExpense[]>(`${this.apiUrl}/travel-expense/my`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all travel expenses (admin functionality)
  getAllTravelExpenses(): Observable<TravelExpense[]> {
    return this.http.get<TravelExpense[]>(`${this.apiUrl}/travel-expense`, {
      headers: this.getAuthHeaders()
    });
  }

  // Update an existing travel expense
  updateTravelExpense(expenseData: TravelExpenseUpdateRequest): Observable<TravelExpense> {
    return this.http.put<TravelExpense>(`${this.apiUrl}/travel-expense/${expenseData.id}`, expenseData, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete a travel expense - SSR SAFE VERSION
  deleteTravelExpense(expenseId: string): Observable<void> {
    const url = `${this.apiUrl}/travel-expense/${expenseId}`;
    console.log('🗑️ Delete URL:', url);
    console.log('🌍 Is browser:', isPlatformBrowser(this.platformId));
    
    if (isPlatformBrowser(this.platformId)) {
      console.log('🎫 Token from localStorage:', localStorage.getItem('token') ? 'Present' : 'Missing');
    }

    return this.http.delete<void>(url, {
      headers: this.getAuthHeaders()
    });
  }

  // Get travel expense by ID
  getTravelExpenseById(expenseId: string): Observable<TravelExpense> {
    return this.http.get<TravelExpense>(`${this.apiUrl}/travel-expense/${expenseId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // PATCH - Add expense item to a travel expense report
  addExpenseItem(reportId: string, expenseItem: any): Observable<TravelExpense> {
    return this.http.patch<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/expenses`, expenseItem, {
      headers: this.getAuthHeaders()
    });
  }

  // DELETE - Remove expense item from a travel expense report
  removeExpenseItem(reportId: string, expenseItemId: string): Observable<TravelExpense> {
    return this.http.delete<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/expenses/${expenseItemId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // PATCH - Submit travel expense report
  submitTravelExpense(reportId: string): Observable<TravelExpense> {
    return this.http.patch<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/submit`, {}, {
      headers: this.getAuthHeaders()
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

    return this.http.get<TravelExpense[]>(url, {
      headers: this.getAuthHeaders()
    });
  }
}