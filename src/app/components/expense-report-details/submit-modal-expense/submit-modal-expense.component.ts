import { Component, EventEmitter, Input, Output } from '@angular/core';
import { TravelExpense } from '../../../model/travel-expense.model';
import { TravelExpenseService } from '../../../services/travel-expense.service';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-submit-modal-expense',
  imports: [CommonModule],
  templateUrl: './submit-modal-expense.component.html',
  styleUrl: './submit-modal-expense.component.scss'
})
export class SubmitModalExpenseComponent {
@Input() isOpen = false;
  @Input() report: TravelExpense | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() submitConfirmed = new EventEmitter<TravelExpense>();
  @Output() error = new EventEmitter<string>();

  isSubmitting = false;

  constructor(private travelExpenseService: TravelExpenseService) {}

  closeModal() {
    if (!this.isSubmitting) {
      this.close.emit();
    }
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  confirmSubmit() {
    if (!this.report || this.isSubmitting) {
      return;
    }

    // Validate that report can be submitted
    if (this.report.state !== 'Skica') {
      this.error.emit('Samo skice mogu biti predane.');
      return;
    }

    // Validate that report has expenses
    if (!this.report.expenses || this.report.expenses.length === 0) {
      this.error.emit('Ne možete predati izvješće bez stavki troškova.');
      return;
    }

    this.isSubmitting = true;

    // Call the service to submit the report (change state from 'Skica' to 'Predano')
    this.travelExpenseService.submitTravelExpense(this.report.id).subscribe({
      next: (updatedReport) => {
        console.log('Report submitted successfully:', updatedReport);
        this.isSubmitting = false;
        this.submitConfirmed.emit(updatedReport);
        this.closeModal();
      },
      error: (error) => {
        console.error('Error submitting report:', error);
        this.isSubmitting = false;
        this.error.emit(this.getSubmitErrorMessage(error));
      }
    });
  }

  private getSubmitErrorMessage(error: any): string {
    if (error.error?.error) {
      const backendError = error.error.error;
      
      if (backendError.includes('Cannot submit approved')) {
        return 'Ne možete predati odobreno izvješće.';
      } else if (backendError.includes('Cannot submit submitted')) {
        return 'Izvješće je već predano.';
      } else if (backendError.includes('Access denied')) {
        return 'Nemate dozvolu za predaju izvješća.';
      } else if (backendError.includes('not found')) {
        return 'Izvješće nije pronađeno.';
      } else if (backendError.includes('no expenses')) {
        return 'Ne možete predati izvješće bez stavki troškova.';
      } else if (backendError.includes('validation')) {
        return 'Neispravni podaci. Molimo provjerite izvješće.';
      } else {
        return backendError;
      }
    }
    
    return 'Greška pri predaji izvješća. Molimo pokušajte ponovo.';
  }
}
