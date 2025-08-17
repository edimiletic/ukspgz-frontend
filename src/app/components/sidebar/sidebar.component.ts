// sidebar.component.ts - Updated with responsive functionality
import { CommonModule } from '@angular/common';
import { Component, OnInit, HostListener } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/login.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  isSidebarOpen = false;
  
  constructor(private router: Router, private authService: AuthService) {}

  ngOnInit() {
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
      if (window.innerWidth <= 768) {
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
    return this.authService.hasRole('Admin');
  }

  // Toggle sidebar (hamburger menu)
  toggleSidebar() {
    this.isSidebarOpen = !this.isSidebarOpen;
  }

  // Close sidebar
  closeSidebar() {
    this.isSidebarOpen = false;
  }

  // Open sidebar
  openSidebar() {
    this.isSidebarOpen = true;
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
    if (event.target.innerWidth > 768 && this.isSidebarOpen) {
      this.closeSidebar();
    }
  }

  // Prevent body scroll when sidebar is open on mobile
  @HostListener('document:touchmove', ['$event'])
  onTouchMove(event: TouchEvent) {
    if (this.isSidebarOpen && window.innerWidth <= 768) {
      // Allow scrolling only within the sidebar content
      const target = event.target as Element;
      const sidebarContent = document.querySelector('.sidebar-content');
      
      if (sidebarContent && !sidebarContent.contains(target)) {
        event.preventDefault();
      }
    }
  }

  // Handle swipe gestures on mobile
  private touchStartX = 0;
  private touchEndX = 0;

  @HostListener('document:touchstart', ['$event'])
  onTouchStart(event: TouchEvent) {
    if (window.innerWidth <= 768) {
      this.touchStartX = event.changedTouches[0].screenX;
    }
  }

  @HostListener('document:touchend', ['$event'])
  onTouchEnd(event: TouchEvent) {
    if (window.innerWidth <= 768) {
      this.touchEndX = event.changedTouches[0].screenX;
      this.handleSwipeGesture();
    }
  }

  private handleSwipeGesture() {
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

  // Prevent scroll when sidebar is open on mobile
  private toggleBodyScroll(disable: boolean) {
    if (window.innerWidth <= 768) {
      if (disable) {
        document.body.style.overflow = 'hidden';
        document.body.style.position = 'fixed';
        document.body.style.width = '100%';
      } else {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.width = '';
      }
    }
  }

  // Watch for sidebar state changes to handle body scroll
  ngOnChanges() {
    this.toggleBodyScroll(this.isSidebarOpen);
  }

  // Clean up when component is destroyed
  ngOnDestroy() {
    this.toggleBodyScroll(false);
  }
}