import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-sidebar',
  imports: [CommonModule],
  templateUrl: './sidebar.component.html',
  styleUrl: './sidebar.component.scss'
})
export class SidebarComponent {
  
  constructor(private router: Router) {}

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

  // Get current route to show active state
  isActiveRoute(route: string): boolean {
    return this.router.url === route;
  }
}
