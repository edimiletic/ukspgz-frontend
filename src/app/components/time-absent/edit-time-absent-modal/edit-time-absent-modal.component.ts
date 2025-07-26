import { Component, EventEmitter, Input, Output, OnChanges, SimpleChanges } from '@angular/core';
import { Absence, AbsenceUpdateRequest } from '../../../model/absence.model';
import { AbsenceService } from '../../../services/absence.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-edit-time-absent-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './edit-time-absent-modal.component.html',
  styleUrl: './edit-time-absent-modal.component.scss'
})
export class EditTimeAbsentModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() absenceToEdit: Absence | null = null;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() absenceUpdated = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>(); // Add error event emitter

  editForm = {
    startDate: '',
    endDate: '',
    reason: ''
  };

  todayDate: string;
  minEndDate: string = '';
  isSubmitting = false;

  constructor(private absenceService: AbsenceService) {
    // Set today's date in YYYY-MM-DD format
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['absenceToEdit'] && this.absenceToEdit) {
      this.populateForm();
    }
  }

  populateForm() {
    if (!this.absenceToEdit) return;

    this.editForm.startDate = this.formatDateForInput(this.absenceToEdit.startDate);
    this.editForm.endDate = this.formatDateForInput(this.absenceToEdit.endDate);
    this.editForm.reason = this.absenceToEdit.reason || '';
    
    // Set minimum end date
    this.updateMinEndDate();
  }

  formatDateForInput(dateString: string): string {
    const date = new Date(dateString);
    return date.toISOString().split('T')[0];
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  isAbsenceFinished(): boolean {
    if (!this.absenceToEdit) return false;
    const today = new Date();
    const endDate = new Date(this.absenceToEdit.endDate);
    return endDate < today;
  }

  onStartDateChange() {
    this.updateMinEndDate();
    
    // Reset end date if it's before the new start date
    if (this.editForm.endDate && this.editForm.endDate <= this.editForm.startDate) {
      this.editForm.endDate = '';
    }
  }

  updateMinEndDate() {
    if (this.editForm.startDate) {
      const startDateObj = new Date(this.editForm.startDate);
      startDateObj.setDate(startDateObj.getDate() + 1);
      this.minEndDate = startDateObj.toISOString().split('T')[0];
    } else {
      this.minEndDate = '';
    }
  }

  isFormValid(): boolean {
    if (!this.absenceToEdit) return false;

    // If absence is finished, only allow editing reason
    if (this.isAbsenceFinished()) {
      return true; // Always valid for finished absences (can edit reason)
    }

    // For ongoing/future absences, validate dates
    return !!(this.editForm.startDate && this.editForm.endDate && this.editForm.startDate < this.editForm.endDate);
  }

  saveChanges() {
    if (!this.isFormValid() || !this.absenceToEdit || this.isSubmitting) return;

    this.isSubmitting = true;

    const updateData: AbsenceUpdateRequest = {
      id: this.absenceToEdit.id,
      reason: this.editForm.reason.trim() || undefined
    };

    // Only include date changes if absence hasn't finished
    if (!this.isAbsenceFinished()) {
      updateData.startDate = this.editForm.startDate;
      updateData.endDate = this.editForm.endDate;
    }

    this.absenceService.updateAbsence(updateData).subscribe({
      next: (response) => {
        console.log('Absence updated successfully:', response);
        this.absenceUpdated.emit();
        this.closeModal();
      },
      error: (error) => {
        console.error('Error updating absence:', error);
        this.isSubmitting = false;
        this.error.emit(this.getUpdateErrorMessage(error));
      }
    });
  }

  private getUpdateErrorMessage(error: any): string {
    if (error.error?.error) {
      const backendError = error.error.error;
      
      if (backendError.includes('already exists') || backendError.includes('overlaps')) {
        return 'Odabrani vremenski period se preklapa s postojećim odsusnim.';
      } else if (backendError.includes('invalid date')) {
        return 'Neispravni datumi. Molimo provjerite unos.';
      } else if (backendError.includes('past date')) {
        return 'Ne možete ažurirati odsustvo za prošli datum.';
      } else if (backendError.includes('validation')) {
        return 'Neispravni podaci. Molimo provjerite sve unose.';
      } else if (backendError.includes('Access denied')) {
        return 'Nemate dozvolu za ažuriranje odsustva.';
      } else if (backendError.includes('not found')) {
        return 'Odsustvo nije pronađeno.';
      } else {
        return backendError;
      }
    }
    
    if (error.status === 409) {
      return 'Odabrani vremenski period se preklapa s postojećim odsusnim.';
    } else if (error.status === 400) {
      return 'Neispravni podaci. Molimo provjerite unos.';
    } else if (error.status === 403) {
      return 'Nemate dozvolu za ažuriranje odsustva.';
    } else if (error.status === 404) {
      return 'Odsustvo nije pronađeno.';
    }
    
    return 'Greška pri ažuriranju odsustva. Molimo pokušajte ponovo.';
  }

  closeModal() {
    this.isSubmitting = false;
    this.editForm = { startDate: '', endDate: '', reason: '' };
    this.minEndDate = '';
    this.closeModalEvent.emit();
  }

  onOverlayClick(event: Event) {
    this.closeModal();
  }
}