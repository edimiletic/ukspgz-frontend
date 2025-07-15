import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TravelExpense } from '../../../model/travel-expense.model';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-delete-expenses-modal',
  imports: [CommonModule],
  templateUrl: './delete-expenses-modal.component.html',
  styleUrl: './delete-expenses-modal.component.scss'
})
export class DeleteExpensesModalComponent {
  @Input() isOpen = false;
  @Input() expenseToDelete: TravelExpense | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() deleteConfirmed = new EventEmitter<string>();

  isDeleting = false;

  constructor() {}

  onOverlayClick(event: Event) {
    // Close modal only if clicking on the overlay itself, not the content
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  closeModal() {
    if (!this.isDeleting) {
      this.resetState();
      this.close.emit();
    }
  }

  confirmDelete() {
    if (this.expenseToDelete && !this.isDeleting) {
      this.isDeleting = true;
      
      // Emit the expense ID to the parent component
      this.deleteConfirmed.emit(this.expenseToDelete.id);
      
      // Reset state after a short delay to allow for the deletion process
      setTimeout(() => {
        this.resetState();
      }, 500);
    }
  }

  private resetState() {
    this.isDeleting = false;
    this.expenseToDelete = null;
  }

  // Helper method to get expense type display text
  getExpenseTypeDisplay(): string {
    if (!this.expenseToDelete) return '';
    
    return this.expenseToDelete.type;
  }

  // Helper method to get expense period display text
  getExpensePeriodDisplay(): string {
    if (!this.expenseToDelete) return '';
    
    return `${this.expenseToDelete.month} ${this.expenseToDelete.year}`;
  }

  // Helper method to get expense state display text
  getExpenseStateDisplay(): string {
    if (!this.expenseToDelete) return '';
    
    return this.expenseToDelete.state;
  }
}