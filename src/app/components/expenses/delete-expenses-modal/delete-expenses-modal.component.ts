import { TravelExpenseService } from './../../../services/travel-expense.service';
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
  @Output() expenseDeleted = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();
  isDeleting = false;

  constructor(private travelExpenseService: TravelExpenseService) {}

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
  if (!this.expenseToDelete || this.isDeleting) return;

  console.log('🚀 Starting delete process for expense:', this.expenseToDelete.id);
  this.isDeleting = true;

  console.log('📞 Calling travelExpenseService.deleteTravelExpense...');
  console.log('🔗 Service URL should be:', 'Check your service apiUrl');
  
  this.travelExpenseService.deleteTravelExpense(this.expenseToDelete.id).subscribe({
    next: (response) => {
      console.log('✅ Delete SUCCESS:', response);
      console.log('🔄 Emitting expenseDeleted event');
      this.expenseDeleted.emit();
      this.closeModal();
    },
    error: (error) => {
      console.error('❌ Delete ERROR:', error);
      console.error('🔍 Error details:', {
        status: error.status,
        message: error.message,
        error: error.error,
        url: error.url
      });
      this.isDeleting = false;
      this.error.emit(this.getDeleteErrorMessage(error));
    },
    complete: () => {
      console.log('🏁 Delete request completed');
    }
  });
}

  private getDeleteErrorMessage(error: any): string {
    if (error.error?.error) {
      const backendError = error.error.error;
      
      if (backendError.includes('Cannot delete submitted')) {
        return 'Ne možete obrisati podneseno izvješće.';
      } else if (backendError.includes('Access denied')) {
        return 'Nemate dozvolu za brisanje ovog izvješća.';
      } else if (backendError.includes('not found')) {
        return 'Izvješće nije pronađeno.';
      } else {
        return backendError;
      }
    }
    
    if (error.status === 400) {
      return 'Ne možete obrisati ovo izvješće.';
    } else if (error.status === 403) {
      return 'Nemate dozvolu za brisanje izvješća.';
    } else if (error.status === 404) {
      return 'Izvješće nije pronađeno.';
    }
    
    return 'Greška pri brisanju izvješća. Molimo pokušajte ponovo.';
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