import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { NotificationService } from '../../services/notification.service';
import { Notification, NotificationResponse, notificationTargetRoute } from '../../model/notification.model';
import { AuthService } from '../../services/login.service';
import { isAdminUser, userHasRole } from '../../model/roles';

@Component({
  selector: 'app-notifications',
  imports: [FormsModule, CommonModule],
  templateUrl: './notifications.component.html',
  styleUrl: './notifications.component.scss'
})
export class NotificationsComponent implements OnInit {
  notifications: Notification[] = [];
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  
  currentUser: any = null;
  isAdmin = false;
  seesAssignmentResponses = false;

  // Pagination
  currentPage = 1;
  totalPages = 1;
  totalNotifications = 0;
  limit = 20;
  
  // Filters
  filterType: string = '';
  showOnlyUnread = false;
  
  // Selection
  selectedNotifications: string[] = [];
  selectAll = false;

  constructor(
    private notificationService: NotificationService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
        this.checkUserRole(); // Add this
    this.loadNotifications();
  }

  loadNotifications() {
    this.isLoading = true;
    this.errorMessage = '';
    
    this.notificationService.getAllNotifications(this.currentPage, this.limit, {
      type: this.filterType || undefined,
      unread: this.showOnlyUnread || undefined
    }).subscribe({
      next: (response: NotificationResponse) => {
        this.notifications = response.notifications;
        this.totalPages = response.totalPages;
        this.totalNotifications = response.total;
        this.currentPage = response.currentPage;
        this.isLoading = false;
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
        this.errorMessage = 'Greška pri učitavanju obavještenja.';
        this.isLoading = false;
      }
    });
  }

  checkUserRole() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.isAdmin = isAdminUser(user);
        this.seesAssignmentResponses =
          this.isAdmin ||
          userHasRole(user, 'Povjerenik za službene osobe');
      },
      error: (error) => {
        console.error('Error getting current user:', error);
        this.isAdmin = false;
        this.seesAssignmentResponses = false;
      }
    });
  }

  applyFilters(notifications: Notification[]): Notification[] {
    let filtered = [...notifications];
    
    // Filter by type
    if (this.filterType) {
      filtered = filtered.filter(n => n.type === this.filterType);
    }
    
    // Filter by read status
    if (this.showOnlyUnread) {
      filtered = filtered.filter(n => !n.isRead);
    }
    
    return filtered;
  }

  onFilterChange() {
    this.currentPage = 1;
    this.loadNotifications();
  }

  clearFilters() {
    this.filterType = '';
    this.showOnlyUnread = false;
    this.currentPage = 1;
    this.loadNotifications();
  }

  formatNotificationTime(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);
    
    if (diffInSeconds < 60) {
      return 'Prije nekoliko sekundi';
    } else if (diffInSeconds < 3600) {
      const minutes = Math.floor(diffInSeconds / 60);
      return `Prije ${minutes} min`;
    } else if (diffInSeconds < 86400) {
      const hours = Math.floor(diffInSeconds / 3600);
      return `Prije ${hours}h`;
    } else {
      const days = Math.floor(diffInSeconds / 86400);
      return `Prije ${days} dana`;
    }
  }

  getNotificationTypeLabel(type: string): string {
    switch (type) {
      case 'GAME_ASSIGNMENT':
        return 'Nominacija';
      case 'GAME_CREATED':
        return 'Nova utakmica';
      case 'ASSIGNMENT_RESPONSE':
        return 'Odgovor na nominaciju';
      case 'ASSIGNMENT_RELEASED':
        return 'Nominacija povučena';
      case 'GAME_SCHEDULE_CHANGED':
        return 'Promjena termina';
      case 'ASSIGNMENT_REMOVED':
        return 'Skinut s utakmice';
      case 'COLLEAGUE_REPLACED':
        return 'Zamjena kolege';
      case 'NOMINATION_EXPIRED':
        return 'Nominacija istekla';
      case 'EXPENSE_APPROVED':
        return 'Izvješće odobreno';
      case 'EXPENSE_REJECTED':
        return 'Izvješće odbijeno';
      default:
        return type;
    }
  }

  getNotificationIcon(type: string): string {
    switch (type) {
      case 'GAME_ASSIGNMENT':
        return 'fas fa-basketball-ball';
      case 'GAME_CREATED':
        return 'fas fa-calendar-plus';
      case 'ASSIGNMENT_RESPONSE':
        return 'fas fa-reply';
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

  markAsRead(notification: Notification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification._id).subscribe({
        next: () => {
          notification.isRead = true;
          this.showSuccess('Obavještenje je označeno kao pročitano.');
          this.openNotificationTarget(notification);
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
          this.showError('Greška pri označavanju obavještenja.');
        }
      });
    } else {
      this.openNotificationTarget(notification);
    }
  }

  private openNotificationTarget(notification: Notification): void {
    const route = notificationTargetRoute(notification);
    if (route) {
      this.router.navigate(route);
    }
  }

  markAllAsRead() {
    const unreadNotifications = this.notifications.filter(n => !n.isRead);
    
    if (unreadNotifications.length === 0) {
      this.showError('Nema nepročitanih obavještenja.');
      return;
    }

    this.notificationService.markAllAsRead().subscribe({
      next: (response) => {
        this.notifications.forEach(n => n.isRead = true);
        this.showSuccess(`${response.modified} obavještenja označena kao pročitana.`);
      },
      error: (error) => {
        console.error('Error marking all notifications as read:', error);
        this.showError('Greška pri označavanju obavještenja.');
      }
    });
  }

  toggleSelectAll() {
    this.selectAll = !this.selectAll;
    if (this.selectAll) {
      this.selectedNotifications = this.notifications.map(n => n._id);
    } else {
      this.selectedNotifications = [];
    }
  }

  toggleSelectNotification(notificationId: string) {
    const index = this.selectedNotifications.indexOf(notificationId);
    if (index > -1) {
      this.selectedNotifications.splice(index, 1);
    } else {
      this.selectedNotifications.push(notificationId);
    }
    
    this.selectAll = this.selectedNotifications.length === this.notifications.length;
  }

  isSelected(notificationId: string): boolean {
    return this.selectedNotifications.includes(notificationId);
  }

  markSelectedAsRead() {
    const unreadSelected = this.selectedNotifications.filter(id => {
      const notification = this.notifications.find(n => n._id === id);
      return notification && !notification.isRead;
    });

    if (unreadSelected.length === 0) {
      this.showError('Nema nepročitanih obavještenja u odabiru.');
      return;
    }

    this.notificationService.markMultipleAsRead(unreadSelected).subscribe({
      next: (response) => {
        unreadSelected.forEach(id => {
          const notification = this.notifications.find(n => n._id === id);
          if (notification) notification.isRead = true;
        });
        
        this.selectedNotifications = [];
        this.selectAll = false;
        this.showSuccess(`${response.modified} obavještenja označena kao pročitana.`);
      },
      error: (error) => {
        console.error('Error marking selected notifications as read:', error);
        this.showError('Greška pri označavanju obavještenja.');
      }
    });
  }

  deleteSelected() {
    if (this.selectedNotifications.length === 0) {
      this.showError('Nema odabranih obavještenja za brisanje.');
      return;
    }

    if (confirm(`Jeste li sigurni da želite obrisati ${this.selectedNotifications.length} obavještenja?`)) {
      // Note: You'll need to implement bulk delete in the backend and service
      this.showError('Brisanje obavještenja će biti implementirano u sljedećoj verziji.');
    }
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.loadNotifications();
    }
  }

  goToPreviousPage() {
    if (this.currentPage > 1) {
      this.goToPage(this.currentPage - 1);
    }
  }

  goToNextPage() {
    if (this.currentPage < this.totalPages) {
      this.goToPage(this.currentPage + 1);
    }
  }

  getPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.currentPage - 2);
    const end = Math.min(this.totalPages, this.currentPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    
    return pages;
  }

  private showSuccess(message: string): void {
    this.clearMessages();
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  private showError(message: string): void {
    this.clearMessages();
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 7000);
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }

  trackByNotificationId(_index: number, notification: Notification): string {
    return notification._id;
  }
}