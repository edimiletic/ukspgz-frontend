// src/app/model/notification.model.ts

export interface Notification {
  _id: string;
  userId: string;
  type: 'GAME_ASSIGNMENT' | 'ASSIGNMENT_RESPONSE';
  message: string;
  gameId?: string;
  assignmentId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: 'GAME_ASSIGNMENT' | 'ASSIGNMENT_RESPONSE';
  message: string;
  gameId?: string;
  assignmentId?: string;
}

export interface NotificationResponse {
  notifications: Notification[];
  totalPages: number;
  currentPage: number;
  total: number;
}

export interface UnreadCountResponse {
  count: number;
}

export interface MarkMultipleAsReadRequest {
  notificationIds: string[];
}

export interface MarkMultipleAsReadResponse {
  modified: number;
}

export type NotificationType = 'GAME_ASSIGNMENT' | 'ASSIGNMENT_RESPONSE';

// Utility type for notification creation without system fields
export type NotificationCreateData = Omit<Notification, '_id' | 'isRead' | 'createdAt' | 'updatedAt'>;

// Utility type for notification updates
export type NotificationUpdateData = Partial<Pick<Notification, 'message' | 'isRead'>>;