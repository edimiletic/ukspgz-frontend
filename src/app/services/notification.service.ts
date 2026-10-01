import { Injectable, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { Observable, of } from 'rxjs';
import {
  Notification,
  CreateNotificationRequest,
  NotificationResponse,
  UnreadCountResponse,
  MarkMultipleAsReadRequest,
  MarkMultipleAsReadResponse
} from '../model/notification.model';
import { environment } from '../../enviroments/enviroment';

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
      }

  // Get notifications for current user
  getNotifications(): Observable<Notification[]> {
    if (!this.isBrowser) {
      // Return empty array on server-side
      return of([]);
    }

    return this.http.get<Notification[]>(`${this.apiUrl}`);
  }

  // Get unread notification count
  getUnreadCount(): Observable<UnreadCountResponse> {
    if (!this.isBrowser) {
      // Return zero count on server-side
      return of({ count: 0 });
    }

    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread-count`);
  }

  // Mark notification as read
  markAsRead(notificationId: string): Observable<Notification> {
    if (!this.isBrowser) {
      // Return dummy notification on server-side
      return of({} as Notification);
    }

    return this.http.patch<Notification>(`${this.apiUrl}/${notificationId}/read`, {});
  }

  // Mark multiple notifications as read
  markMultipleAsRead(notificationIds: string[]): Observable<MarkMultipleAsReadResponse> {
    if (!this.isBrowser) {
      // Return dummy response on server-side - FIXED: using 'modified' instead of 'modifiedCount'
      return of({ modified: 0 });
    }

    return this.http.patch<MarkMultipleAsReadResponse>(`${this.apiUrl}/mark-multiple-read`,
      { notificationIds } as MarkMultipleAsReadRequest,
      
    );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<MarkMultipleAsReadResponse> {
    if (!this.isBrowser) {
      // Return dummy response on server-side - FIXED: using 'modified' instead of 'modifiedCount'
      return of({ modified: 0 });
    }

    return this.http.patch<MarkMultipleAsReadResponse>(`${this.apiUrl}/mark-all-read`, {});
  }

  // Create notification (Admin use - for game assignments)
  createNotification(notification: CreateNotificationRequest): Observable<Notification> {
    if (!this.isBrowser) {
      // Return dummy notification on server-side
      return of({} as Notification);
    }

    return this.http.post<Notification>(this.apiUrl, notification);
  }

  // Delete notification
  deleteNotification(notificationId: string): Observable<void> {
    if (!this.isBrowser) {
      // Return empty observable on server-side
      return of(void 0);
    }

    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`);
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

    return this.http.get<NotificationResponse>(`${this.apiUrl}/all?page=${page}&limit=${limit}`);
  }
}