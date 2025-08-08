// src/app/services/notification.service.ts
import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable } from 'rxjs';
import { 
  Notification, 
  CreateNotificationRequest, 
  NotificationResponse, 
  UnreadCountResponse,
  MarkMultipleAsReadRequest,
  MarkMultipleAsReadResponse 
} from '../model/notification.model';

@Injectable({
  providedIn: 'root'
})
export class NotificationService {
  private apiUrl = 'http://localhost:3000/api/notifications';

  constructor(private http: HttpClient) {}

  private getAuthHeaders(): HttpHeaders {
    const token = localStorage.getItem('token');
    return new HttpHeaders({
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    });
  }

  // Get notifications for current user
  getNotifications(): Observable<Notification[]> {
    return this.http.get<Notification[]>(`${this.apiUrl}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get unread notification count
  getUnreadCount(): Observable<UnreadCountResponse> {
    return this.http.get<UnreadCountResponse>(`${this.apiUrl}/unread-count`, {
      headers: this.getAuthHeaders()
    });
  }

  // Mark notification as read
  markAsRead(notificationId: string): Observable<Notification> {
    return this.http.patch<Notification>(`${this.apiUrl}/${notificationId}/read`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Mark multiple notifications as read
  markMultipleAsRead(notificationIds: string[]): Observable<MarkMultipleAsReadResponse> {
    return this.http.patch<MarkMultipleAsReadResponse>(`${this.apiUrl}/mark-multiple-read`, 
      { notificationIds } as MarkMultipleAsReadRequest, 
      { headers: this.getAuthHeaders() }
    );
  }

  // Mark all notifications as read
  markAllAsRead(): Observable<MarkMultipleAsReadResponse> {
    return this.http.patch<MarkMultipleAsReadResponse>(`${this.apiUrl}/mark-all-read`, {}, {
      headers: this.getAuthHeaders()
    });
  }

  // Create notification (Admin use - for game assignments)
  createNotification(notification: CreateNotificationRequest): Observable<Notification> {
    return this.http.post<Notification>(this.apiUrl, notification, {
      headers: this.getAuthHeaders()
    });
  }

  // Delete notification
  deleteNotification(notificationId: string): Observable<void> {
    return this.http.delete<void>(`${this.apiUrl}/${notificationId}`, {
      headers: this.getAuthHeaders()
    });
  }

  // Get all notifications with pagination (for dedicated notifications page)
  getAllNotifications(page = 1, limit = 20): Observable<NotificationResponse> {
    return this.http.get<NotificationResponse>(`${this.apiUrl}/all?page=${page}&limit=${limit}`, {
      headers: this.getAuthHeaders()
    });
  }
}