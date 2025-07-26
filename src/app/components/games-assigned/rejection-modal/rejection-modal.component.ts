import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-rejection-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './rejection-modal.component.html',
  styleUrl: './rejection-modal.component.scss'
})
export class RejectionModalComponent {
 @Input() isOpen = false;
  @Input() gameInfo: any = null;
  @Output() close = new EventEmitter<void>();
  @Output() reject = new EventEmitter<string>();

  rejectionReason = '';
  isSubmitting = false;
  errorMessage = '';

  closeModal() {
    if (!this.isSubmitting) {
      this.resetForm();
      this.close.emit();
    }
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget && !this.isSubmitting) {
      this.closeModal();
    }
  }

  confirmRejection() {
    if (!this.isFormValid() || this.isSubmitting) {
      return;
    }

    this.isSubmitting = true;
    this.errorMessage = '';

    // Emit the rejection reason
    this.reject.emit(this.rejectionReason.trim());
    
    // Note: The parent component will handle the actual API call
    // and call closeModal() on success, or set error on failure
  }

  isFormValid(): boolean {
    const reason = this.rejectionReason.trim();
    return reason.length >= 10 && reason.length <= 500;
  }

  private resetForm() {
    this.rejectionReason = '';
    this.isSubmitting = false;
    this.errorMessage = '';
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  // Method for parent component to handle submission results
  onRejectionComplete() {
    this.isSubmitting = false;
    this.closeModal();
  }

  onRejectionError(errorMessage: string) {
    this.isSubmitting = false;
    this.errorMessage = errorMessage;
  }
}
