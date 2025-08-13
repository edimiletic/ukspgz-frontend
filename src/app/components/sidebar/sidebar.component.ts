// sidebar.component.ts - Updated
import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../../services/login.service';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent implements OnInit {
  
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
}