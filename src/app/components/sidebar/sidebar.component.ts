import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { Router } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/login.service';
import { SidebarNavService } from '../../services/sidebar-nav.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit, OnDestroy {
  isSidebarOpen = false;
  private isBrowser: boolean;
  private touchStartX = 0;
  private touchEndX = 0;
  private openSubscription?: Subscription;
  
  constructor(
    private router: Router, 
    private authService: AuthService,
    private sidebarNav: SidebarNavService,
    @Inject(PLATFORM_ID) platformId: Object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.sidebarNav.register();
    this.openSubscription = this.sidebarNav.isOpen$.subscribe(open => this.isSidebarOpen = open);

    // Load user data if not available
    if (this.authService.isAuthenticated() && !this.authService.currentUserValue) {
      this.authService.loadUserData();
    }
  }

  navigateToPage(route: string) {
    // Check auth before navigating
    if (this.authService.isAuthenticated()) {
      this.router.navigate([route]);
      // Close sidebar on mobile after navigation
      if (this.isBrowser && window.innerWidth <= 768) {
        this.closeSidebar();
      }
    } else {
      this.router.navigate(['/login']);
    }
  }

  // Get current route to show active state
  isActiveRoute(route: string): boolean {
    return this.router.url === route;
  }

  // Check if user is admin
  isAdmin(): boolean {
    return this.authService.isAdmin();
  }

  canViewEligibleOfficials(): boolean {
    return this.authService.canViewEligibleOfficials();
  }

  canViewStatistics(): boolean {
    return this.authService.canViewStatistics();
  }

  // Toggle sidebar (hamburger menu)
  toggleSidebar() {
    this.sidebarNav.toggle();
  }

  // Close sidebar
  closeSidebar() {
    this.sidebarNav.close();
  }

  // Open sidebar
  openSidebar() {
    this.sidebarNav.open();
  }

  // Close sidebar when clicking outside or pressing escape
  @HostListener('document:keydown.escape', ['$event'])
  onEscapeKey(event: KeyboardEvent) {
    if (this.isSidebarOpen) {
      this.closeSidebar();
    }
  }

  // Close sidebar when window is resized to desktop
  @HostListener('window:resize', ['$event'])
  onResize(event: any) {
    if (this.isBrowser && event.target.innerWidth > 768 && this.isSidebarOpen) {
      this.closeSidebar();
    }
  }

  // Prevent body scroll when sidebar is open on mobile
  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (!this.isBrowser) return;

    if (this.isSidebarOpen && window.innerWidth <= 768) {
      // Allow scrolling only within the sidebar content
      const target = event.target as Element;
      const sidebarContent = document.querySelector('.sidebar-content');
      
      if (sidebarContent && !sidebarContent.contains(target)) {
        event.preventDefault();
      }
    }
  }

  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (this.isBrowser && window.innerWidth <= 768) {
      this.touchStartX = event.changedTouches[0].screenX;
    }
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (this.isBrowser && window.innerWidth <= 768) {
      this.touchEndX = event.changedTouches[0].screenX;
      this.handleSwipeGesture();
    }
  }

  private handleSwipeGesture() {
    if (!this.isBrowser) return;

    const swipeThreshold = 50;
    const swipeDistance = this.touchEndX - this.touchStartX;

    // Swipe right from left edge to open sidebar
    if (this.touchStartX < 30 && swipeDistance > swipeThreshold && !this.isSidebarOpen) {
      this.openSidebar();
    }
    
    // Swipe left to close sidebar
    if (swipeDistance < -swipeThreshold && this.isSidebarOpen) {
      this.closeSidebar();
    }
  }

  // Clean up when component is destroyed
  ngOnDestroy() {
    this.openSubscription?.unsubscribe();
    this.sidebarNav.unregister();
  }
}