import { Component, OnInit, OnDestroy, AfterViewInit, Inject, PLATFORM_ID, ViewChild, ElementRef, HostListener } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/login.service';
import { NotificationService } from '../../services/notification.service';
import { SidebarNavService } from '../../services/sidebar-nav.service';
import { Notification } from '../../model/notification.model';
import { Router } from '@angular/router';
import { Subscription, interval, forkJoin } from 'rxjs';

@Component({
  selector: 'app-header',
  imports: [CommonModule],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent implements OnInit, AfterViewInit, OnDestroy {
  @ViewChild('appHeader') appHeader?: ElementRef<HTMLElement>;
  notifications: Notification[] = [];
  unreadCount = 0;
  hasUnreadNotifications = false;
  showMenuButton = false;
  isMenuOpen = false;
  isNotificationsOpen = false;
  isUserMenuOpen = false;
  private notificationSubscription?: Subscription;
  private pollSubscription?: Subscription;
  private sidebarSubscriptions: Subscription[] = [];
  private isBrowser: boolean;

  constructor(
    private authService: AuthService,
    private notificationService: NotificationService,
    private sidebarNav: SidebarNavService,
    private router: Router,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.sidebarSubscriptions.push(
      this.sidebarNav.isPresent$.subscribe(present => {
        this.showMenuButton = present;
        queueMicrotask(() => this.updateHeaderHeight());
      }),
      this.sidebarNav.isOpen$.subscribe(open => this.isMenuOpen = open)
    );

    // Only load notifications in browser
    if (this.isBrowser) {
      this.loadNotifications();
      this.startNotificationPolling();
    }
  }

  ngAfterViewInit() {
    this.updateHeaderHeight();
  }

  @HostListener('window:resize')
  onWindowResize() {
    this.updateHeaderHeight();
  }

  private updateHeaderHeight(): void {
    if (!this.isBrowser) {
      return;
    }

    const height = this.appHeader?.nativeElement.offsetHeight;
    if (height) {
      document.documentElement.style.setProperty('--header-height', `${height}px`);
    }
  }

  toggleMenu(): void {
    this.sidebarNav.toggle();
  }

  toggleNotifications(event: Event): void {
    event.stopPropagation();
    this.isNotificationsOpen = !this.isNotificationsOpen;
    this.isUserMenuOpen = false;
  }

  toggleUserMenu(event: Event): void {
    event.stopPropagation();
    this.isUserMenuOpen = !this.isUserMenuOpen;
    this.isNotificationsOpen = false;
  }

  @HostListener('document:click')
  closeHeaderMenus(): void {
    this.isNotificationsOpen = false;
    this.isUserMenuOpen = false;
  }

  navigateToPage(route: string) {
    // Check auth before navigating to prevent login flash
    if (this.isBrowser) {
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
    this.sidebarSubscriptions.forEach(sub => sub.unsubscribe());
  }

  loadNotifications() {
    if (!this.isBrowser) {
      return;
    }

    this.notificationSubscription?.unsubscribe();
    this.notificationSubscription = forkJoin({
      notifications: this.notificationService.getNotifications(),
      unread: this.notificationService.getUnreadCount()
    }).subscribe({
      next: ({ notifications, unread }) => {
        this.notifications = notifications.slice(0, 5);
        this.unreadCount = unread.count;
        this.hasUnreadNotifications = this.unreadCount > 0;
      },
      error: () => {
        this.unreadCount = this.notifications.filter(n => !n.isRead).length;
        this.hasUnreadNotifications = this.unreadCount > 0;
      }
    });
  }

  private startNotificationPolling() {
    if (!this.isBrowser) {
      return;
    }

    // Poll for new notifications every 30 seconds
    this.pollSubscription = interval(30000).subscribe(() => {
      this.loadNotifications();
    });
  }

  markAsRead(notification: Notification) {
    if (!this.isBrowser) {
      return;
    }

    if (!notification.isRead) {
      this.notificationService.markAsRead(notification._id).subscribe({
        next: () => {
          this.loadNotifications();
          
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
    if (!this.isBrowser) {
      return;
    }

    this.notificationService.markAllAsRead().subscribe({
      next: () => {
        this.notifications.forEach(n => n.isRead = true);
        this.loadNotifications();
      },
      error: () => {}
    });
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
  }

  trackByNotificationId(_index: number, notification: Notification): string {
    return notification._id;
  }
}