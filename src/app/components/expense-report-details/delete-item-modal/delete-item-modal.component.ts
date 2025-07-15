import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';

@Component({
  selector: 'app-delete-item-modal',
  imports: [CommonModule],
  templateUrl: './delete-item-modal.component.html',
  styleUrl: './delete-item-modal.component.scss'
})
export class DeleteItemModalComponent {
@Input() isOpen = false;
  @Input() expenseItemId: string = '';
  @Output() close = new EventEmitter<void>();
  @Output() deleteConfirmed = new EventEmitter<string>();

  isDeleting = false;

  closeModal() {
    if (!this.isDeleting) {
      this.close.emit();
    }
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  confirmDelete() {
    if (!this.isDeleting && this.expenseItemId) {
      this.isDeleting = true;
      this.deleteConfirmed.emit(this.expenseItemId);
    }
  }

  // Reset the deleting state when modal closes
  ngOnChanges() {
    if (!this.isOpen) {
      this.isDeleting = false;
    }
  }

}
