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

    this.absenceService.deleteAbsence(this.absenceToDelete.id).subscribe({
      next: () => {
        console.log('Absence deleted successfully');
        this.absenceDeleted.emit();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error deleting absence:', error);
        this.isDeleting = false;
        // You might want to show an error message to the user here
      }
    });
  }

  closeModal() {
    this.isDeleting = false;
    this.closeModalEvent.emit();
  }

  onOverlayClick(event: Event) {
    this.closeModal();
  }
}
