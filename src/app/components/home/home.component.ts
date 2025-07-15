import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";
import { AuthService } from '../../services/login.service';
import { User } from '../../model/user.model';

@Component({
  selector: 'app-home',
  imports: [HeaderComponent, FooterComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {

  user: User | null = null;

  constructor(private router: Router, private authService: AuthService){}

  ngOnInit(): void {
    this.authService.getCurrentUser().subscribe({
      next: (data: User) => {
        this.user = data;
      },
      error: (err) => {
        console.error('Failed to load user:', err);
      }
    });
  }

}
