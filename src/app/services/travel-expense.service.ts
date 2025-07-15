import { TravelExpenseFilters,  TravelExpense, NewTravelExpense } from './../model/travel-expense.model';
// src/app/services/travel-expense.service.ts
import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TravelExpenseCreateRequest extends NewTravelExpense {}

export interface TravelExpenseUpdateRequest extends TravelExpense {}

@Injectable({
  providedIn: 'root'
})
export class TravelExpenseService {
  private apiUrl = 'http://localhost:3000/api';

  constructor(private http: HttpClient) {}

  // Create a new travel expense record
  createTravelExpense(expenseData: TravelExpenseCreateRequest): Observable<TravelExpense> {
    return this.http.post<TravelExpense>(`${this.apiUrl}/travel-expense`, expenseData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Get all travel expenses for the current user
  getCurrentUserTravelExpenses(): Observable<TravelExpense[]> {
    return this.http.get<TravelExpense[]>(`${this.apiUrl}/travel-expense/my`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Get all travel expenses (admin functionality)
  getAllTravelExpenses(): Observable<TravelExpense[]> {
    return this.http.get<TravelExpense[]>(`${this.apiUrl}/travel-expense`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Update an existing travel expense
  updateTravelExpense(expenseData: TravelExpenseUpdateRequest): Observable<TravelExpense> {
    return this.http.put<TravelExpense>(`${this.apiUrl}/travel-expense/${expenseData.id}`, expenseData, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Delete a travel expense
  deleteTravelExpense(expenseId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/travel-expense/${expenseId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // Get travel expense by ID
  getTravelExpenseById(expenseId: string): Observable<TravelExpense> {
    return this.http.get<TravelExpense>(`${this.apiUrl}/travel-expense/${expenseId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // PATCH - Add expense item to a travel expense report
  addExpenseItem(reportId: string, expenseItem: any): Observable<TravelExpense> {
    return this.http.patch<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/expenses`, expenseItem, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // DELETE - Remove expense item from a travel expense report
  removeExpenseItem(reportId: string, expenseItemId: string): Observable<TravelExpense> {
    return this.http.delete<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/expenses/${expenseItemId}`, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }

  // PATCH - Submit travel expense report (change state from 'Skica' to 'Predano')
  submitTravelExpense(reportId: string): Observable<TravelExpense> {
    return this.http.patch<TravelExpense>(`${this.apiUrl}/travel-expense/${reportId}/submit`, {}, {
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
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
      headers: {
        Authorization: `Bearer ${localStorage.getItem('token')}`
      }
    });
  }
}