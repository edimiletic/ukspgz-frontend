import {Component, inject} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { HttpClientModule ,HttpClient } from '@angular/common/http';
@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule, HttpClientModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
username: string='';
password: string='';

constructor(private router: Router, private http: HttpClient){}

onSubmit(){
  console.log('Login podaci:', this.username, this.password)
}

login(){
  const credentials = {username:this.username, password:this.password};

  this.http.post<any>('http://localhost:3000/api/login', credentials).subscribe({
    next: (response) => {
      localStorage.setItem('token', response.token);
      this.router.navigate(['/home']);
    },
    error:(error) => {
      console.error('Login error:', error);
      alert(error.error?.error || 'Login failed');
    }
  })
}

}
