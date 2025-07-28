import { AbsenceService } from './../../services/absence.service';
import { CommonModule } from '@angular/common';
import { Component } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";
import { AbsenceData, TimeAbsentModalComponent } from './time-absent-modal/time-absent-modal.component';
import { Absence } from '../../model/absence.model';
import { DeleteTimeAbsentModalComponent } from "./delete-time-absent-modal/delete-time-absent-modal.component";
import { EditTimeAbsentModalComponent } from "./edit-time-absent-modal/edit-time-absent-modal.component";
import { User } from '../../model/user.model';
import { AuthService } from '../../services/login.service';
import { UserService } from '../../services/user.service';
import { forkJoin } from 'rxjs';


interface AbsenceWithUser extends Absence {
  userName?: string;
}

@Component({
  selector: 'app-time-absent',
  imports: [HeaderComponent, FooterComponent, TimeAbsentModalComponent, CommonModule, DeleteTimeAbsentModalComponent, EditTimeAbsentModalComponent],
  templateUrl: './time-absent.component.html',
  styleUrl: './time-absent.component.scss'
})
export class TimeAbsentComponent {
 isModalOpen = false;
  absences: AbsenceWithUser[] = [];
  isLoading = false;
  isDeleteModalOpen = false;
  isEditModalOpen = false;
  absenceToEdit: Absence | null = null;
  absenceToDelete: Absence | null = null;
  isAdmin = false;
  users: User[] = []; // Store users for name lookup
 
  // Toast notification properties
  errorMessage = '';
  successMessage = '';

  constructor(
    private absenceService: AbsenceService,
    private authService: AuthService,
    private userService: UserService
  ) {}

  ngOnInit() {
    this.checkUserRole();
  }

  checkUserRole() {
    this.authService.getCurrentUser().subscribe({
      next: (user: User) => {
        console.log('Current user:', user); // Debug log
        this.isAdmin = user.role === 'Admin';
        console.log('Is admin:', this.isAdmin); // Debug log
        this.loadAbsences();
      },
      error: (error) => {
        console.error('Error getting current user:', error);
        this.showError('Greška pri provjeri korisničke uloge.');
        this.loadAbsences(); // Load anyway, backend will handle permissions
      }
    });
  }

  loadAbsences() {
    this.isLoading = true;

    if (this.isAdmin) {
      // Admin: Load all absences (backend now includes user names)
      this.absenceService.getAllAbsences().subscribe({
        next: (absences: AbsenceWithUser[]) => {
          console.log('Admin absences loaded:', absences); // Debug log
          this.absences = absences;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading admin absences:', error);
          this.showError('Greška pri učitavanju odsustva. Molimo pokušajte ponovo.');
          this.isLoading = false;
        }
      });
    } else {
      // Regular user: Load only their absences
      this.absenceService.getCurrentUserAbsences().subscribe({
        next: (absences: Absence[]) => {
          console.log('User absences loaded:', absences); // Debug log
          this.absences = absences;
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading user absences:', error);
          this.showError('Greška pri učitavanju odsustva. Molimo pokušajte ponovo.');
          this.isLoading = false;
        }
      });
    }
  }

  private mapAbsencesWithUserNames(absences: Absence[]): AbsenceWithUser[] {
    return absences.map(absence => {
      const user = this.users.find(u => u.personalCode === absence.userPersonalCode);
      return {
        ...absence,
        userName: user ? `${user.name} ${user.surname}` : 'Nepoznato ime'
      };
    });
  }

  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  openEditModal(absence: Absence) {
    this.absenceToEdit = absence;
    this.isEditModalOpen = true;
  }

  closeEditModal() {
    this.isEditModalOpen = false;
    this.absenceToEdit = null;
  }

  openDeleteModal(absence: Absence) {
    this.absenceToDelete = absence;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.absenceToDelete = null;
  }

  onAbsenceSaved() {
    console.log('Absence saved successfully!');
    this.loadAbsences();
    this.showSuccess('Odsustvo je uspješno kreirano!');
  }

  onAbsenceUpdated() {
    console.log('Absence updated successfully!');
    this.loadAbsences();
    this.showSuccess('Odsustvo je uspješno ažurirano!');
  }

  onAbsenceDeleted() {
    console.log('Absence deleted successfully!');
    this.loadAbsences();
    this.showSuccess('Odsustvo je uspješno obrisano!');
  }

  // Handle modal errors
  onModalError(errorMessage: string) {
    this.showError(errorMessage);
  }

  // Toast notification methods
  private showSuccess(message: string): void {
    this.clearMessages();
    this.successMessage = message;
    // Auto-hide after 5 seconds
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  private showError(message: string): void {
    this.clearMessages();
    this.errorMessage = message;
    // Auto-hide after 7 seconds
    setTimeout(() => {
      this.errorMessage = '';
    }, 7000);
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }
}