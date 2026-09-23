import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reject-expense-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './reject-expense-modal.component.html',
  styleUrl: './reject-expense-modal.component.scss'
})
export class RejectExpenseModalComponent {
  @Input() isOpen = false;
  @Input() isSubmitting = false;
  @Output() close = new EventEmitter<void>();
  @Output() rejectConfirmed = new EventEmitter<string>();

  notes = '';
  errorMessage = '';

  closeModal() {
    if (this.isSubmitting) {
      return;
    }
    this.notes = '';
    this.errorMessage = '';
    this.close.emit();
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  confirmReject() {
    const notes = this.notes.trim();
    if (!notes) {
      this.errorMessage = 'Unesite napomenu što korisnik treba ispraviti.';
      return;
    }
    this.rejectConfirmed.emit(notes);
  }
}
