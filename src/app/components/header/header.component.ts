// src/app/components/header/header.component.ts
import { Component, OnInit, OnDestroy } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/login.service';
import { NotificationService } from '../../services/notification.service';
import { Notification } from '../../model/notification.model';
import { Router } from '@angular/router';
import { Subscription, interval } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, OnDestroy {
  notifications: Notification[] = [];
  unreadCount = 0;
  hasUnreadNotifications = false;
  private notificationSubscription?: Subscription;
  private pollSubscription?: Subscription;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadNotifications();
    this.startNotificationPolling();
  }

  navigateToPage(route: string) {
    // Check auth before navigating to prevent login flash
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem('token');
      if (token) {
        this.router.navigate([route]);
      } else {
        this.router.navigate(['/login']);
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  ngOnDestroy() {
    if (this.notificationSubscription) {
      this.notificationSubscription.unsubscribe();
    }
    if (this.pollSubscription) {
      this.pollSubscription.unsubscribe();
    }
  }

  loadNotifications() {
    this.notificationSubscription = this.notificationService.getNotifications().subscribe({
      next: (notifications) => {
        this.notifications = notifications.slice(0, 5); // Show only recent 5
        this.updateNotificationCounts();
      },
      error: (error) => {
        console.error('Error loading notifications:', error);
      }
    });
  }

  private updateNotificationCounts() {
    this.unreadCount = this.notifications.filter(n => !n.isRead).length;
    this.hasUnreadNotifications = this.unreadCount > 0;
  }

  private startNotificationPolling() {
    // Poll for new notifications every 30 seconds
    this.pollSubscription = interval(30000).subscribe(() => {
      this.loadNotifications();
    });
  }

  markAsRead(notification: Notification) {
    if (!notification.isRead) {
      this.notificationService.markAsRead(notification._id).subscribe({
        next: () => {
          notification.isRead = true;
          this.updateNotificationCounts();
          
          // Navigate to relevant page if notification has gameId
          if (notification.gameId) {
            this.router.navigate(['/assigned']);
          }
        },
        error: (error) => {
          console.error('Error marking notification as read:', error);
        }
      });
    } else if (notification.gameId) {
      // If already read, just navigate
      this.router.navigate(['/assigned']);
    }
  }

  markAllAsRead() {
    const unreadIds = this.notifications
      .filter(n => !n.isRead)
      .map(n => n._id);

    if (unreadIds.length > 0) {
      this.notificationService.markMultipleAsRead(unreadIds).subscribe({
        next: () => {
          this.notifications.forEach(n => n.isRead = true);
          this.updateNotificationCounts();
        },
        error: (error) => {
          console.error('Error marking all notifications as read:', error);
        }
      });
    }
  }

viewAllNotifications() {
  this.router.navigate(['/notifications']);
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

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    console.log("Logged out");
  }
}