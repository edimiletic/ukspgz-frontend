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
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { SidebarComponent } from "../sidebar/sidebar.component";


interface AbsenceWithUser extends Absence {
  userName?: string;
}

@Component({
  selector: 'app-time-absent',
  imports: [RouterModule, HeaderComponent, FooterComponent, TimeAbsentModalComponent, CommonModule, DeleteTimeAbsentModalComponent, EditTimeAbsentModalComponent, FormsModule, SidebarComponent],
  templateUrl: './time-absent.component.html',
  styleUrl: './time-absent.component.scss'
})
export class TimeAbsentComponent {
isModalOpen = false;
  absences: AbsenceWithUser[] = [];
  // Original data (unfiltered)
  allAbsences: AbsenceWithUser[] = [];
  allFutureAbsences: AbsenceWithUser[] = [];
  allOngoingAbsences: AbsenceWithUser[] = [];
  allPastAbsences: AbsenceWithUser[] = [];
  
  // Filtered data for display
  futureAbsences: AbsenceWithUser[] = [];
  ongoingAbsences: AbsenceWithUser[] = [];
  pastAbsences: AbsenceWithUser[] = [];
  
  isLoading = false;
  isDeleteModalOpen = false;
  isEditModalOpen = false;
  absenceToEdit: Absence | null = null;
  absenceToDelete: Absence | null = null;
  isAdmin = false;
  users: User[] = []; // Store users for name lookup

  // Filter properties
  filterValues = {
    id: '',
    userName: '',
    startDate: '',
    endDate: ''
  };
 
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
          this.allAbsences = absences;
          this.categorizeAbsences(absences);
          this.applyFilters(); // Apply any existing filters
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading admin absences:', error);
          this.showError('Greška pri učitavanju odsustva. Molimo pokušajte ponovo.');
          this.isLoading = false;
        }
      });
    } else {
      // Regular user: Load only their absences and categorize them too
      this.absenceService.getCurrentUserAbsences().subscribe({
        next: (absences: Absence[]) => {
          console.log('User absences loaded:', absences); // Debug log
          this.allAbsences = absences;
          this.categorizeAbsences(absences); // Also categorize user absences
          this.applyFilters(); // Apply any existing filters
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

  private categorizeAbsences(absences: AbsenceWithUser[]) {
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Reset time to start of day for accurate comparison

    this.allFutureAbsences = [];
    this.allOngoingAbsences = [];
    this.allPastAbsences = [];

    absences.forEach(absence => {
      const startDate = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);
      
      // Reset time for accurate date comparison
      startDate.setHours(0, 0, 0, 0);
      endDate.setHours(23, 59, 59, 999);

      if (startDate > today) {
        // Future absence
        this.allFutureAbsences.push(absence);
      } else if (startDate <= today && endDate >= today) {
        // Ongoing absence
        this.allOngoingAbsences.push(absence);
      } else {
        // Past absence
        this.allPastAbsences.push(absence);
      }
    });

    // Sort each category
    this.allFutureAbsences.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    this.allOngoingAbsences.sort((a, b) => new Date(a.startDate).getTime() - new Date(b.startDate).getTime());
    this.allPastAbsences.sort((a, b) => new Date(b.endDate).getTime() - new Date(a.endDate).getTime());
  }

  applyFilters() {
    // Filter each category for both admin and regular users
    this.futureAbsences = this.filterAbsences(this.allFutureAbsences);
    this.ongoingAbsences = this.filterAbsences(this.allOngoingAbsences);
    this.pastAbsences = this.filterAbsences(this.allPastAbsences);
    
    // Also maintain the single absences array for backward compatibility
    this.absences = this.filterAbsences(this.allAbsences);
  }

  private filterAbsences(absences: AbsenceWithUser[]): AbsenceWithUser[] {
    return absences.filter(absence => {
      // ID filter
      if (this.filterValues.id && !absence._id.toLowerCase().includes(this.filterValues.id.toLowerCase())) {
        return false;
      }

      // User name filter (admin only)
      if (this.isAdmin && this.filterValues.userName && absence.userName && 
          !absence.userName.toLowerCase().includes(this.filterValues.userName.toLowerCase())) {
        return false;
      }

      // Start date filter - EXACT match
      if (this.filterValues.startDate) {
        const filterStartDate = new Date(this.filterValues.startDate);
        const absenceStartDate = new Date(absence.startDate);
        
        // Compare only the date part (ignore time)
        filterStartDate.setHours(0, 0, 0, 0);
        absenceStartDate.setHours(0, 0, 0, 0);
        
        if (filterStartDate.getTime() !== absenceStartDate.getTime()) {
          return false;
        }
      }

      // End date filter - EXACT match
      if (this.filterValues.endDate) {
        const filterEndDate = new Date(this.filterValues.endDate);
        const absenceEndDate = new Date(absence.endDate);
        
        // Compare only the date part (ignore time)
        filterEndDate.setHours(0, 0, 0, 0);
        absenceEndDate.setHours(0, 0, 0, 0);
        
        if (filterEndDate.getTime() !== absenceEndDate.getTime()) {
          return false;
        }
      }

      return true;
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.filterValues = {
      id: '',
      userName: '',
      startDate: '',
      endDate: ''
    };
    this.applyFilters();
  }

  // Check if any filters are active
  get hasActiveFilters(): boolean {
    return !!(this.filterValues.id || this.filterValues.userName || 
              this.filterValues.startDate || this.filterValues.endDate);
  }

  // Get total count for display
  get totalFilteredCount(): number {
    return this.futureAbsences.length + this.ongoingAbsences.length + this.pastAbsences.length;
  }

  // private mapAbsencesWithUserNames(absences: Absence[]): AbsenceWithUser[] {
  //   return absences.map(absence => {
  //     const user = this.users.find(u => u.personalCode === absence.userPersonalCode);
  //     return {
  //       ...absence,
  //       userName: user ? `${user.name} ${user.surname}` : 'Nepoznato ime'
  //     };
  //   });
  // }

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