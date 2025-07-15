import { CommonModule } from '@angular/common';
import { Component,EventEmitter, Input, Output} from '@angular/core';
import { FormsModule  } from '@angular/forms';
import { AbsenceService } from '../../../services/absence.service';
import { AuthService } from '../../../services/login.service';
import { User } from '../../../model/user.model';
import { AbsenceCreateRequest } from '../../../model/absence.model';

export interface AbsenceData {
  id?: number;
  startDate: string;
  endDate: string;
  referee: string;
  reason?: string;
}

@Component({
  selector: 'app-time-absent-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './time-absent-modal.component.html',
  styleUrl: './time-absent-modal.component.scss'
})
export class TimeAbsentModalComponent {
  @Input() isOpen = false;
  @Output() closeModalEvent = new EventEmitter<void>();
  @Output() absenceSaved = new EventEmitter<void>();

  startDate: string = '';
  endDate: string = '';
  reason: string = '';
  todayDate: string;
  minEndDate: string = '';
  isSubmitting: boolean = false;
  currentUser: User | null = null;

  constructor(
    private absenceService: AbsenceService,
    private authService: AuthService
  ) {

  console.log('Browser locale:', navigator.language);
  console.log('All locales:', navigator.languages);

    // Set today's date in YYYY-MM-DD format
    const today = new Date();
    this.todayDate = today.toISOString().split('T')[0];
    
    // Get current user when component initializes
    this.getCurrentUser();
  }

  getCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user: User) => {
        this.currentUser = user;
      },
      error: (error) => {
        console.error('Error fetching current user:', error);
      }
    });
  }

  onStartDateChange() {
    // Reset end date if it's before the new start date
    if (this.endDate && this.endDate <= this.startDate) {
      this.endDate = '';
    }
    
    // Set minimum end date to be the day after start date
    if (this.startDate) {
      const startDateObj = new Date(this.startDate);
      startDateObj.setDate(startDateObj.getDate() + 1);
      this.minEndDate = startDateObj.toISOString().split('T')[0];
    } else {
      this.minEndDate = '';
    }
  }

  isFormValid(): boolean {
    return !!(this.startDate && this.endDate && this.startDate < this.endDate && this.currentUser);
  }

  saveAbsence(): void {
    if (!this.isFormValid() || this.isSubmitting) return;

    this.isSubmitting = true;

    const absenceData: AbsenceCreateRequest = {
      startDate: this.startDate,
      endDate: this.endDate,
      userPersonalCode: this.currentUser!.personalCode,
      reason: this.reason.trim() || undefined
    };

    this.absenceService.createAbsence(absenceData).subscribe({
      next: (response) => {
        console.log('Absence created successfully:', response);
        this.absenceSaved.emit(); // Emit event to notify parent component
        this.closeModal();
      },
      error: (error) => {
        console.error('Error creating absence:', error);
        // You might want to show an error message to the user here
        this.isSubmitting = false;
      }
    });
  }

  closeModal() {
    // Reset form when closing
    this.startDate = '';
    this.endDate = '';
    this.reason = '';
    this.minEndDate = '';
    this.isSubmitting = false;
    this.closeModalEvent.emit();
  }

  onOverlayClick(event: Event) {
    // Close modal when clicking on overlay
    this.closeModal();
  }
}
