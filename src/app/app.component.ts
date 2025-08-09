import { Component, OnInit } from '@angular/core';
import { AuthComponent } from "./components/auth/auth.component";
import { Router, RouterModule } from '@angular/router';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-root',
  imports: [ RouterModule, CommonModule],
  templateUrl: './app.component.html',
  styleUrl: './app.component.scss'
})
export class AppComponent implements OnInit {

    title = 'uhks';

  isInitialized = false;

  constructor(private router: Router) {}

  ngOnInit() {
    // Quick initialization check
    setTimeout(() => {
      if (typeof window !== 'undefined') {
        const token = localStorage.getItem('token');
        if (!token) {
          this.router.navigate(['/login']);
        }
      }
      this.isInitialized = true;
    }, 50); // Very brief delay to prevent flash
  }
}