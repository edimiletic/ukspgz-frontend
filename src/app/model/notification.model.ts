export type NotificationType =
  | 'GAME_ASSIGNMENT'
  | 'ASSIGNMENT_RESPONSE'
  | 'ASSIGNMENT_RELEASED'
  | 'GAME_SCHEDULE_CHANGED'
  | 'ASSIGNMENT_REMOVED'
  | 'COLLEAGUE_REPLACED'
  | 'NOMINATION_EXPIRED'
  | 'EXPENSE_APPROVED'
  | 'EXPENSE_REJECTED'
  | 'GAME_CREATED';

export interface Notification {
  _id: string;
  userId: string;
  type: NotificationType;
  message: string;
  gameId?: string;
  assignmentId?: string;
  travelExpenseId?: string;
  isRead: boolean;
  createdAt: string;
  updatedAt?: string;
}

export interface CreateNotificationRequest {
  userId: string;
  type: NotificationType;
  message: string;
  gameId?: string;
  assignmentId?: string;
  travelExpenseId?: string;
}

export function notificationTargetRoute(notification: Notification): string[] | null {
  const expenseId = extractRelatedId(notification.travelExpenseId);
  if (expenseId) {
    return ['/expenses', expenseId];
  }
  if (extractRelatedId(notification.gameId)) {
    return ['/assigned'];
  }
  return null;
}

function extractRelatedId(value: unknown): string {
  if (!value) {
    return '';
  }
  if (typeof value === 'string' || typeof value === 'number') {
    return String(value);
  }
  const nested = (value as { _id?: unknown; id?: unknown })._id
    || (value as { id?: unknown }).id;
  return nested ? String(nested) : '';
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


// Utility type for notification creation without system fields
export type NotificationCreateData = Omit<Notification, '_id' | 'isRead' | 'createdAt' | 'updatedAt'>;

// Utility type for notification updates
export type NotificationUpdateData = Partial<Pick<Notification, 'message' | 'isRead'>>;