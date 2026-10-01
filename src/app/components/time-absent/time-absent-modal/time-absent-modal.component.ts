import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { AbsenceService } from '../../../services/absence.service';
import { AuthService } from '../../../services/login.service';
import { User } from '../../../model/user.model';
import { Absence, AbsenceCreateRequest, AbsenceUpdateRequest } from '../../../model/absence.model';

@Component({
  selector: 'app-time-absent-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './time-absent-modal.component.html',
  styleUrl: './time-absent-modal.component.scss'
})
export class TimeAbsentModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() absence: Absence | null = null;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() absenceSaved = new EventEmitter<void>();
  @Output() absenceUpdated = new EventEmitter<void>();
  @Output() error = new EventEmitter<string>();

  startDate = '';
  endDate = '';
  reason = '';
  todayDate: string;
  minEndDate = '';
  isSubmitting = false;
  currentUser: User | null = null;

  constructor(
    private absenceService: AbsenceService,
    private authService: AuthService
  ) {
    this.todayDate = new Date().toISOString().split('T')[0];
    this.getCurrentUser();
  }

  get isCreateMode(): boolean {
    return !this.absence;
  }

  get datesLocked(): boolean {
    return !this.isCreateMode && this.isAbsenceFinished();
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.isOpen) {
      return;
    }
    if (this.absence) {
      this.populateForm();
    } else if (changes['isOpen'] || changes['absence']) {
      this.resetFormFields();
    }
  }

  getCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user: User) => {
        this.currentUser = user;
      },
      error: () => {
        this.error.emit('Greška pri dohvaćanju korisničkih podataka.');
      }
    });
  }

  populateForm(): void {
    if (!this.absence) return;
    this.startDate = this.formatDateForInput(this.absence.startDate);
    this.endDate = this.formatDateForInput(this.absence.endDate);
    this.reason = this.absence.reason || '';
    this.updateMinEndDate();
  }

  onStartDateChange(): void {
    if (this.endDate && this.endDate < this.startDate) {
      this.endDate = '';
    }
    this.updateMinEndDate();
  }

  updateMinEndDate(): void {
    this.minEndDate = this.startDate || '';
  }

  isAbsenceFinished(): boolean {
    if (!this.absence) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const endDate = new Date(this.absence.endDate);
    endDate.setHours(0, 0, 0, 0);
    return endDate < today;
  }

  formatDateForInput(dateString: string): string {
    return new Date(dateString).toISOString().split('T')[0];
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  isFormValid(): boolean {
    if (this.datesLocked) {
      return true;
    }
    const datesOk = !!(this.startDate && this.endDate && this.startDate <= this.endDate);
    return this.isCreateMode ? datesOk && !!this.currentUser : datesOk;
  }

  save(): void {
    if (!this.isFormValid() || this.isSubmitting) return;
    if (this.isCreateMode) {
      this.createAbsence();
    } else {
      this.updateAbsence();
    }
  }

  private createAbsence(): void {
    if (!this.currentUser) return;
    this.isSubmitting = true;
    const absenceData: AbsenceCreateRequest = {
      startDate: this.startDate,
      endDate: this.endDate,
      userPersonalCode: this.currentUser.personalCode,
      reason: this.reason.trim() || undefined
    };

    this.absenceService.createAbsence(absenceData).subscribe({
      next: () => {
        this.absenceSaved.emit();
        this.closeModal();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.error.emit(this.getCreateErrorMessage(error));
      }
    });
  }

  private updateAbsence(): void {
    if (!this.absence) return;
    this.isSubmitting = true;
    const updateData: AbsenceUpdateRequest = {
      _id: this.absence._id,
      reason: this.reason.trim() || undefined
    };
    if (!this.datesLocked) {
      updateData.startDate = this.startDate;
      updateData.endDate = this.endDate;
    }

    this.absenceService.updateAbsence(updateData).subscribe({
      next: () => {
        this.absenceUpdated.emit();
        this.closeModal();
      },
      error: (error) => {
        this.isSubmitting = false;
        this.error.emit(this.getUpdateErrorMessage(error));
      }
    });
  }

  private getCreateErrorMessage(error: any): string {
    const backendError = error.error?.error;
    if (backendError) {
      if (backendError.includes('already exists') || backendError.includes('overlaps')) {
        return 'Već postoji odsustvo za odabrani vremenski period.';
      }
      if (backendError.includes('invalid date')) {
        return 'Neispravni datumi. Molimo provjerite unos.';
      }
      if (backendError.includes('past date')) {
        return 'Ne možete kreirati odsustvo za prošli datum.';
      }
      if (backendError.includes('Access denied')) {
        return 'Nemate dozvolu za kreiranje odsustva.';
      }
      return backendError;
    }
    if (error.status === 409) return 'Već postoji odsustvo za odabrani vremenski period.';
    if (error.status === 400) return 'Neispravni podaci. Molimo provjerite unos.';
    if (error.status === 403) return 'Nemate dozvolu za kreiranje odsustva.';
    return 'Greška pri kreiranju odsustva. Molimo pokušajte ponovo.';
  }

  private getUpdateErrorMessage(error: any): string {
    const backendError = error.error?.error;
    if (backendError) {
      if (backendError.includes('already exists') || backendError.includes('overlaps')) {
        return 'Odabrani vremenski period se preklapa s postojećim odsustvom.';
      }
      if (backendError.includes('invalid date')) {
        return 'Neispravni datumi. Molimo provjerite unos.';
      }
      if (backendError.includes('past date')) {
        return 'Ne možete ažurirati odsustvo za prošli datum.';
      }
      if (backendError.includes('Access denied')) {
        return 'Nemate dozvolu za ažuriranje odsustva.';
      }
      if (backendError.includes('not found')) {
        return 'Odsustvo nije pronađeno.';
      }
      return backendError;
    }
    if (error.status === 409) return 'Odabrani vremenski period se preklapa s postojećim odsustvom.';
    if (error.status === 400) return 'Neispravni podaci. Molimo provjerite unos.';
    if (error.status === 403) return 'Nemate dozvolu za ažuriranje odsustva.';
    if (error.status === 404) return 'Odsustvo nije pronađeno.';
    return 'Greška pri ažuriranju odsustva. Molimo pokušajte ponovo.';
  }

  closeModal(): void {
    this.resetFormFields();
    this.closeModalEvent.emit();
  }

  private resetFormFields(): void {
    this.startDate = '';
    this.endDate = '';
    this.reason = '';
    this.minEndDate = '';
    this.isSubmitting = false;
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget && !this.isSubmitting) {
      this.closeModal();
    }
  }
}
