import { Absence } from './../../../model/absence.model';
import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { AbsenceService } from '../../../services/absence.service';

@Component({
  selector: 'app-delete-time-absent-modal',
  imports: [CommonModule],
  templateUrl: './delete-time-absent-modal.component.html',
  styleUrl: './delete-time-absent-modal.component.scss'
})
export class DeleteTimeAbsentModalComponent {
  @Input() isOpen = false;
  @Input() absenceToDelete: Absence | null = null;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() absenceDeleted = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>(); // Add error event emitter

  isDeleting = false;

  constructor(private absenceService: AbsenceService) {}

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  confirmDelete() {
    if (!this.absenceToDelete || this.isDeleting) return;

    this.isDeleting = true;

    this.absenceService.deleteAbsence(this.absenceToDelete._id).subscribe({
      next: () => {
        console.log('Absence deleted successfully');
        this.absenceDeleted.emit();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error deleting absence:', error);
        this.isDeleting = false;
        this.error.emit(this.getDeleteErrorMessage(error));
      }
    });
  }

  private getDeleteErrorMessage(error: any): string {
    if (error.error?.error) {
      const backendError = error.error.error;
      
      if (backendError.includes('cannot delete active')) {
        return 'Ne možete obrisati aktivno odsustvo.';
      } else if (backendError.includes('cannot delete past')) {
        return 'Ne možete obrisati završeno odsustvo.';
      } else if (backendError.includes('Access denied')) {
        return 'Nemate dozvolu za brisanje odsustva.';
      } else if (backendError.includes('not found')) {
        return 'Odsustvo nije pronađeno.';
      } else {
        return backendError;
      }
    }
    
    if (error.status === 400) {
      return 'Ne možete obrisati ovo odsustvo.';
    } else if (error.status === 403) {
      return 'Nemate dozvolu za brisanje odsustva.';
    } else if (error.status === 404) {
      return 'Odsustvo nije pronađeno.';
    }
    
    return 'Greška pri brisanju odsustva. Molimo pokušajte ponovo.';
  }

  closeModal() {
    this.isDeleting = false;
    this.closeModalEvent.emit();
  }

  onOverlayClick(event: Event) {
    this.closeModal();
  }
}