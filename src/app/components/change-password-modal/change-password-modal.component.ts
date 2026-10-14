import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AuthService } from '../../services/login.service';

@Component({
  selector: 'app-change-password-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './change-password-modal.component.html',
  styleUrl: '../users/user-form-modal/user-form-modal.component.scss'
})
export class ChangePasswordModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  currentPassword = '';
  newPassword = '';
  confirmPassword = '';
  errorMessage = '';
  successMessage = '';
  isBusy = false;

  private readonly auth = inject(AuthService);

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay') && !this.isBusy) {
      this.close.emit();
    }
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    if (!this.currentPassword || !this.newPassword) {
      this.errorMessage = 'Unesi trenutnu i novu lozinku.';
      return;
    }
    if (this.newPassword.length < 8) {
      this.errorMessage = 'Lozinka mora imati najmanje 8 znakova.';
      return;
    }
    if (this.newPassword !== this.confirmPassword) {
      this.errorMessage = 'Nove lozinke se ne podudaraju.';
      return;
    }

    this.isBusy = true;
    this.auth.changePassword(this.currentPassword, this.newPassword).subscribe({
      next: (response) => {
        this.isBusy = false;
        this.successMessage = response.message || 'Lozinka je promijenjena.';
        this.currentPassword = '';
        this.newPassword = '';
        this.confirmPassword = '';
      },
      error: (error: HttpErrorResponse) => {
        this.isBusy = false;
        this.errorMessage = error.error?.error || 'Promjena lozinke nije uspjela.';
      }
    });
  }
}
