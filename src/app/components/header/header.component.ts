import { Component } from '@angular/core';
import { AuthService } from '../../services/login.service';
import { Router } from '@angular/router';
@Component({
  selector: 'app-header',
  imports: [],
  templateUrl: './header.component.html',
  styleUrl: './header.component.scss'
})
export class HeaderComponent {

constructor( private authService: AuthService, private router: Router){}

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
    console.log("Logged out")
  }
  
}
