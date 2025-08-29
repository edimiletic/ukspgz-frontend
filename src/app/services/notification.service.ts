import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import {
  Notification,
  CreateNotificationRequest,
  NotificationResponse,
  UnreadCountResponse,
  MarkMultipleAsReadRequest,
  MarkMultipleAsReadResponse
} from '../model/notification.model';
import { environment } from '../../../enviroment.prod';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = environment.apiUrl + '/notifications';
  private isBrowser: boolean;

  constructor(
    private http: HttpClient,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
    console.log('NotificationService constructor called, isBrowser:', this.isBrowser);
  }

  private getAuthHeaders(): HttpHeaders {
    if (!this.isBrowser) {
      // Return empty headers on server-side
      return new HttpHeaders({
        'Content-Type': 'application/json'
      });
    }

    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get notifications for current user
  getNotifications(): Observable<Notification[]> {
    if (!this.isBrowser) {
      // Return empty array on server-side
      return of([]);
    }

    return this.http.get<Notification[]>(`${this.apiUrl}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get unread notification count
  getUnreadCount(): Observable<UnreadCountResponse> {
    if (!this.isBrowser) {
      // Return zero count on server-side
      return of({ count: 0 });
    }

    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread-count`, {
      headers: this.getAuthHeaders()
    });
  }

  // Mark notification as read
  markAsRead(notificationId: string): Observable<Notification> {
    if (!this.isBrowser) {
      // Return dummy notification on server-side
      return of({} as Notification);
    }

    return this.http.patch<Notification>(`${this.apiUrl}/${notificationId}/read`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Mark multiple notifications as read
  markMultipleAsRead(notificationIds: string[]): Observable<MarkMultipleAsReadResponse> {
    if (!this.isBrowser) {
      // Return dummy response on server-side - FIXED: using 'modified' instead of 'modifiedCount'
      return of({ modified: 0 });
    }

    return this.http.patch<MarkMultipleAsReadResponse>(`${this.apiUrl}/mark-multiple-read`,
      { notificationIds } as MarkMultipleAsReadRequest,
      { headers: this.getAuthHeaders() }
    );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<MarkMultipleAsReadResponse> {
    if (!this.isBrowser) {
      // Return dummy response on server-side - FIXED: using 'modified' instead of 'modifiedCount'
      return of({ modified: 0 });
    }

    return this.http.patch<MarkMultipleAsReadResponse>(`${this.apiUrl}/mark-all-read`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Create notification (Admin use - for game assignments)
  createNotification(notification: CreateNotificationRequest): Observable<Notification> {
    if (!this.isBrowser) {
      // Return dummy notification on server-side
      return of({} as Notification);
    }

    return this.http.post<Notification>(this.apiUrl, notification, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete notification
  deleteNotification(notificationId: string): Observable<void> {
    if (!this.isBrowser) {
      // Return empty observable on server-side
      return of(void 0);
    }

    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all notifications with pagination (for dedicated notifications page)
  getAllNotifications(page = 1, limit = 20): Observable<NotificationResponse> {
    if (!this.isBrowser) {
      // Return empty response on server-side matching NotificationResponse interface
      return of({
        notifications: [],
        total: 0,
        currentPage: 1,
        totalPages: 0
      });
    }

    return this.http.get<NotificationResponse>(`${this.apiUrl}/all?page=${page}&limit=${limit}`, {
      headers: this.getAuthHeaders()
    });
  }
}