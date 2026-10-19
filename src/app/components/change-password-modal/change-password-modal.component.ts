import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import { Component, EventEmitter, Input, Output, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { AuthService } from '../../services/login.service';
import { ModalPanelDirective } from '../../directives/modal-panel.directive';

@Component({
  selector: 'app-change-password-modal',
  imports: [CommonModule, ReactiveFormsModule, ModalPanelDirective],
  templateUrl: './change-password-modal.component.html',
  styleUrl: '../users/user-form-modal/user-form-modal.component.scss'
})
export class ChangePasswordModalComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();

  errorMessage = '';
  successMessage = '';
  isBusy = false;

  private readonly auth = inject(AuthService);
  private readonly fb = inject(FormBuilder);

  readonly form = this.fb.nonNullable.group({
    currentPassword: ['', Validators.required],
    newPassword: ['', [Validators.required, Validators.minLength(8)]],
    confirmPassword: ['', Validators.required]
  });

  onOverlayClick(event: MouseEvent): void {
    if ((event.target as HTMLElement).classList.contains('modal-overlay') && !this.isBusy) {
      this.close.emit();
    }
  }

  submit(): void {
    this.errorMessage = '';
    this.successMessage = '';
    this.form.markAllAsTouched();
    const { currentPassword, newPassword, confirmPassword } = this.form.getRawValue();
    if (!currentPassword || !newPassword) {
      this.errorMessage = 'Unesi trenutnu i novu lozinku.';
      return;
    }
    if (newPassword.length < 8) {
      this.errorMessage = 'Lozinka mora imati najmanje 8 znakova.';
      return;
    }
    if (newPassword !== confirmPassword) {
      this.errorMessage = 'Nove lozinke se ne podudaraju.';
      return;
    }

    this.isBusy = true;
    this.form.disable();
    this.auth.changePassword(currentPassword, newPassword).subscribe({
      next: (response) => {
        this.isBusy = false;
        this.form.enable();
        this.successMessage = response.message || 'Lozinka je promijenjena.';
        this.form.reset();
      },
      error: (error: HttpErrorResponse) => {
        this.isBusy = false;
        this.form.enable();
        this.errorMessage = error.error?.error || 'Promjena lozinke nije uspjela.';
      }
    });
  }
}
