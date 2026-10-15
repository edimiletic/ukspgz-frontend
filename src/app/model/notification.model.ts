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

const EMOJI_RE = /[\u{1F300}-\u{1FAFF}\u{2600}-\u{27BF}]/gu;

export function displayNotificationMessage(message: string | undefined): string {
  return String(message || '')
    .replace(EMOJI_RE, '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function notificationResponseKind(
  message: string | undefined
): 'accepted' | 'rejected' | null {
  const text = displayNotificationMessage(message).toLowerCase();
  if (text.includes('odbio')) {
    return 'rejected';
  }
  if (text.includes('prihvatio')) {
    return 'accepted';
  }
  return null;
}

export function notificationIconClass(type: string, message?: string): string {
  switch (type) {
    case 'GAME_ASSIGNMENT':
      return 'fas fa-basketball-ball';
    case 'GAME_CREATED':
      return 'fas fa-calendar-plus';
    case 'ASSIGNMENT_RESPONSE': {
      const kind = notificationResponseKind(message);
      if (kind === 'accepted') {
        return 'fas fa-check';
      }
      if (kind === 'rejected') {
        return 'fas fa-times';
      }
      return 'fas fa-reply';
    }
    case 'ASSIGNMENT_RELEASED':
      return 'fas fa-undo';
    case 'GAME_SCHEDULE_CHANGED':
      return 'fas fa-clock';
    case 'ASSIGNMENT_REMOVED':
      return 'fas fa-user-minus';
    case 'COLLEAGUE_REPLACED':
      return 'fas fa-exchange-alt';
    case 'NOMINATION_EXPIRED':
      return 'fas fa-hourglass-end';
    case 'EXPENSE_APPROVED':
      return 'fas fa-check-circle';
    case 'EXPENSE_REJECTED':
      return 'fas fa-times-circle';
    default:
      return 'fas fa-bell';
  }
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