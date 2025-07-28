import { Component, EventEmitter, Input, OnChanges, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationData {
  title: string;
  message: string;
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  iconClass?: string;
  data?: any; // Additional data to pass back when confirmed
}

@Component({
  selector: 'app-delete-game-modal',
  imports: [CommonModule],
  templateUrl: './delete-game-modal.component.html',
  styleUrl: './delete-game-modal.component.scss'
})
export class DeleteGameModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() confirmationData: ConfirmationData = {
    title: 'Potvrda',
    message: 'Jeste li sigurni?',
    confirmText: 'Potvrdi',
    cancelText: 'Odustani',
    confirmButtonClass: 'btn-danger',
    iconClass: 'fa-exclamation-triangle'
  };
  
  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<any>();

  // Loading state for async operations
  isLoading = false;

  closeModal() {
    if (!this.isLoading) {
      this.isLoading = false; // Reset loading state
      this.close.emit();
    }
  }

  confirmAction() {
    this.isLoading = true;
    this.confirm.emit(this.confirmationData.data);
  }

  // Method to reset loading state (call this from parent after operation completes)
  resetLoadingState() {
    this.isLoading = false;
  }

  // Reset loading state when modal opens
  ngOnChanges() {
    if (this.isOpen) {
      this.isLoading = false; // Reset loading state when modal opens
    }
  }

  // Stop propagation on modal content click
  onModalContentClick(event: Event) {
    event.stopPropagation();
  }
}