import {Component, inject} from '@angular/core';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
@Component({
  selector: 'app-auth',
  imports: [CommonModule, FormsModule],
  templateUrl: './auth.component.html',
  styleUrl: './auth.component.scss'
})
export class AuthComponent {
username: string='';
password: string='';

constructor(private router: Router){}

onSubmit(){
  console.log('Login podaci:', this.username, this.password)
}

login(){
  this.router.navigate(['/home'])
}
}
