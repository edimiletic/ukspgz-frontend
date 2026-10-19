import { CommonModule } from '@angular/common';
import { Component, OnInit, OnDestroy, HostListener, Inject, PLATFORM_ID } from '@angular/core';
import { isPlatformBrowser } from '@angular/common';
import { RouterLink, RouterLinkActive } from '@angular/router';
import { Subscription } from 'rxjs';
import { AuthService } from '../../services/login.service';
import { SidebarNavService } from '../../services/sidebar-nav.service';

interface NavLink {
  path: string;
  label: string;
  icon: string;
  exact: boolean;
}

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule, RouterLink, RouterLinkActive],
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
    private authService: AuthService,
    private sidebarNav: SidebarNavService,
    @Inject(PLATFORM_ID) platformId: object
  ) {
    this.isBrowser = isPlatformBrowser(platformId);
  }

  ngOnInit() {
    this.sidebarNav.register();
    this.openSubscription = this.sidebarNav.isOpen$.subscribe(open => this.isSidebarOpen = open);

    // Load user data if not available
    if (!this.authService.currentUserValue) {
      this.authService.loadUserData();
    }
  }

  get navLinks(): NavLink[] {
    const links: NavLink[] = [
      { path: '/home', label: 'Početna stranica', icon: 'fas fa-home', exact: true },
      { path: '/assigned', label: 'Moje utakmice', icon: 'fas fa-basketball-ball', exact: false },
      { path: '/absence', label: 'Odsustvo', icon: 'fas fa-calendar-times', exact: false },
      { path: '/expenses', label: 'Putni troškovi', icon: 'fas fa-money-bill-wave', exact: false },
      { path: '/documents', label: 'Dokumenti', icon: 'fas fa-file-alt', exact: false },
      { path: '/exams', label: 'Ispiti', icon: 'fas fa-graduation-cap', exact: false }
    ];
    if (this.isAdmin()) {
      links.push({ path: '/users', label: 'Korisnici', icon: 'fas fa-user-cog', exact: false });
    }
    if (this.canViewEligibleOfficials()) {
      links.push({
        path: '/eligible-officials',
        label: 'Osobe za nominaciju',
        icon: 'fas fa-users',
        exact: false
      });
    }
    if (this.canViewStatistics()) {
      links.push({ path: '/statistics', label: 'Statistika', icon: 'fas fa-chart-bar', exact: false });
    }
    return links;
  }

  onNavClick(): void {
    if (this.isBrowser && window.innerWidth <= 768) {
      this.closeSidebar();
    }
  }

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
  onEscapeKey(_event: KeyboardEvent) {
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