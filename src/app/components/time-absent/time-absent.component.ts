import { AbsenceService } from './../../services/absence.service';
import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, HostBinding, HostListener } from '@angular/core';
import { TimeAbsentModalComponent } from './time-absent-modal/time-absent-modal.component';
import { Absence } from '../../model/absence.model';
import { ConfirmationData, ConfirmationModalComponent } from "../shared/confirmation-modal/confirmation-modal.component";
import { User } from '../../model/user.model';
import { AuthService } from '../../services/login.service';
import { UserService } from '../../services/user.service';
import { FormsModule } from '@angular/forms';
import { RouterModule } from '@angular/router';
import { GAME_ASSIGNMENT_ROLES, canSeeAllGames, isAdminUser, userHasRole } from '../../model/roles';


interface AbsenceWithUser extends Absence {
  userName?: string;
}

@Component({
  selector: 'app-time-absent',
  imports: [RouterModule, TimeAbsentModalComponent, CommonModule, ConfirmationModalComponent, FormsModule],
  templateUrl: './time-absent.component.html',
  styleUrl: './time-absent.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class TimeAbsentComponent {
  isAbsenceFormOpen = false;
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
  
  futurePage = 1;
  futureLimit = 10;
  futureTotalPages = 1;
  futureDisplayedAbsences: AbsenceWithUser[] = [];

  // Pagination for Ongoing Absences
  ongoingPage = 1;
  ongoingLimit = 10;
  ongoingTotalPages = 1;
  ongoingDisplayedAbsences: AbsenceWithUser[] = [];
  
  // Pagination for Past Absences
  pastPage = 1;
  pastLimit = 10;
  pastTotalPages = 1;
  pastDisplayedAbsences: AbsenceWithUser[] = [];

  isLoading = false;
  isDeleteModalOpen = false;
  isConfirmBusy = false;
  confirmationData: ConfirmationData = {
    title: 'Potvrdi brisanje',
    message: 'Jeste li sigurni da želite obrisati ovo odsustvo?'
  };
  absenceToEdit: Absence | null = null;
  absenceToDelete: Absence | null = null;
  isAdmin = false;
  seesSupervisedAbsences = false;
  currentUser: User | null = null;
  users: User[] = []; // Store users for name lookup

isMobileFiltersOpen: boolean = false;

  get roleFilterOptions(): string[] {
    return GAME_ASSIGNMENT_ROLES;
  }

  get canChangeRoleFilter(): boolean {
    return this.showNamedOverview;
  }

  get defaultRoleFilter(): string {
    return 'Sudac';
  }

  get defaultRoleHint(): string {
    return 'suci';
  }

  // Filter properties
  filterValues = {
    id: '',
    userName: '',
    role: 'Sudac',
    startDate: '',
    endDate: ''
  };
 
  // Toast notification properties
  errorMessage = '';
  successMessage = '';

  constructor(
    private absenceService: AbsenceService,
    private authService: AuthService,
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  private refreshView(): void {
    this.cdr.markForCheck();
  }

  ngOnInit() {
    this.checkUserRole();
  }

 checkUserRole() {
  this.authService.getCurrentUser().subscribe({
    next: (user: User | null) => {
      this.currentUser = user;
      this.isAdmin = isAdminUser(user);
      this.seesSupervisedAbsences = !this.isAdmin && canSeeAllGames(user);
      this.filterValues.role = (this.isAdmin || this.seesSupervisedAbsences) ? this.defaultRoleFilter : '';
      this.refreshView();
      this.loadAbsences();
    },
    error: (error) => {
      console.error('Error getting current user:', error);
      this.currentUser = null;
      this.isAdmin = false;
      this.seesSupervisedAbsences = false;
      this.showError('Greška pri provjeri korisničke uloge.');
      this.loadAbsences();
    }
  });
}

  get showNamedOverview(): boolean {
    return this.isAdmin || this.seesSupervisedAbsences;
  }

  get canCreateOwnAbsence(): boolean {
    return !this.isAdmin;
  }

  isOwnAbsence(absence: AbsenceWithUser): boolean {
    return !!this.currentUser?.personalCode && absence.userPersonalCode === this.currentUser.personalCode;
  }

  isPastAbsence(absence: Absence): boolean {
    const end = new Date(absence.endDate);
    end.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return end < today;
  }

  canEditAbsence(absence: Absence): boolean {
    return this.isOwnAbsence(absence) && !this.isPastAbsence(absence);
  }

  canDeleteAbsence(absence: Absence): boolean {
    return this.isOwnAbsence(absence) && !this.isPastAbsence(absence);
  }

  loadAbsences() {
    this.isLoading = true;

    if (this.isAdmin || this.seesSupervisedAbsences) {
      // Admin: Load all absences (backend now includes user names)
      this.absenceService.getAllAbsences(1, 1000).subscribe({
        next: (absences: AbsenceWithUser[]) => {
           // Debug log
          this.allAbsences = absences;
          this.categorizeAbsences(absences);
          this.applyFilters(); // Apply any existing filters
          this.isLoading = false;
          this.refreshView();
        },
        error: (error) => {
          console.error('Error loading admin absences:', error);
          this.showError('Greška pri učitavanju odsustva. Molimo pokušajte ponovo.');
          this.isLoading = false;
          this.refreshView();
        }
      });
    } else {
      // Regular user: Load only their absences and categorize them too
      this.absenceService.getCurrentUserAbsences().subscribe({
        next: (absences: Absence[]) => {
           // Debug log
          this.allAbsences = absences;
          this.categorizeAbsences(absences); // Also categorize user absences
          this.applyFilters(); // Apply any existing filters
          this.isLoading = false;
          this.refreshView();
        },
        error: (error) => {
          console.error('Error loading user absences:', error);
          this.showError('Greška pri učitavanju odsustva. Molimo pokušajte ponovo.');
          this.isLoading = false;
          this.refreshView();
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
  
      this.updatePagination();
  }

   updatePagination() {
    // Reset pages when filters change
    this.futurePage = 1;
    this.ongoingPage = 1;
    this.pastPage = 1;
    
    // Update pagination for each table
    this.updateFuturePagination();
    this.updateOngoingPagination();
    this.updatePastPagination();
  }

  updateFuturePagination() {
    this.futureTotalPages = Math.max(1, Math.ceil(this.futureAbsences.length / this.futureLimit));
    
    // Ensure current page is within bounds
    if (this.futurePage > this.futureTotalPages) {
      this.futurePage = this.futureTotalPages;
    }
    
    const startIndex = (this.futurePage - 1) * this.futureLimit;
    const endIndex = startIndex + this.futureLimit;
    this.futureDisplayedAbsences = this.futureAbsences.slice(startIndex, endIndex);
    
      }

  updateOngoingPagination() {
    this.ongoingTotalPages = Math.max(1, Math.ceil(this.ongoingAbsences.length / this.ongoingLimit));
    
    if (this.ongoingPage > this.ongoingTotalPages) {
      this.ongoingPage = this.ongoingTotalPages;
    }
    
    const startIndex = (this.ongoingPage - 1) * this.ongoingLimit;
    const endIndex = startIndex + this.ongoingLimit;
    this.ongoingDisplayedAbsences = this.ongoingAbsences.slice(startIndex, endIndex);
  }

  updatePastPagination() {
    this.pastTotalPages = Math.max(1, Math.ceil(this.pastAbsences.length / this.pastLimit));
    
    if (this.pastPage > this.pastTotalPages) {
      this.pastPage = this.pastTotalPages;
    }
    
    const startIndex = (this.pastPage - 1) * this.pastLimit;
    const endIndex = startIndex + this.pastLimit;
    this.pastDisplayedAbsences = this.pastAbsences.slice(startIndex, endIndex);
  }

  goToFuturePage(page: number) {
    if (page >= 1 && page <= this.futureTotalPages && page !== this.futurePage) {
      this.futurePage = page;
      this.updateFuturePagination();
    }
  }

  getFuturePages(): number[] {
    const pages = [];
    const start = Math.max(1, this.futurePage - 2);
    const end = Math.min(this.futureTotalPages, this.futurePage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Ongoing table pagination methods
  goToOngoingPage(page: number) {
    if (page >= 1 && page <= this.ongoingTotalPages && page !== this.ongoingPage) {
      this.ongoingPage = page;
      this.updateOngoingPagination();
    }
  }

  getOngoingPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.ongoingPage - 2);
    const end = Math.min(this.ongoingTotalPages, this.ongoingPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Past table pagination methods
  goToPastPage(page: number) {
    if (page >= 1 && page <= this.pastTotalPages && page !== this.pastPage) {
      this.pastPage = page;
      this.updatePastPagination();
    }
  }

  getPastPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.pastPage - 2);
    const end = Math.min(this.pastTotalPages, this.pastPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  private filterAbsences(absences: AbsenceWithUser[]): AbsenceWithUser[] {
    return absences.filter(absence => {
      // ID filter
      const displayId = absence.displayId != null ? String(absence.displayId) : '';
      if (this.filterValues.id && !displayId.includes(this.filterValues.id.trim())) {
        return false;
      }

      // User name filter (admin only)
      if (this.showNamedOverview && this.filterValues.userName && absence.userName && 
          !absence.userName.toLowerCase().includes(this.filterValues.userName.toLowerCase())) {
        return false;
      }

      if (this.showNamedOverview && this.filterValues.role && !this.isOwnAbsence(absence)) {
        const roles = (absence.userRole || '')
          .split(',')
          .map((role) => role.trim())
          .filter(Boolean);
        if (!roles.includes(this.filterValues.role)) {
          return false;
        }
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
      role: this.showNamedOverview ? this.defaultRoleFilter : '',
      startDate: '',
      endDate: ''
    };
if (window.innerWidth <= 693) {
  this.isMobileFiltersOpen = false;
}

    this.applyFilters();
  }

  // Check if any filters are active
  get hasActiveFilters(): boolean {
    const roleChanged = this.showNamedOverview && this.filterValues.role !== this.defaultRoleFilter;
    return !!(this.filterValues.id || this.filterValues.userName ||
              this.filterValues.startDate || this.filterValues.endDate || roleChanged);
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
    this.absenceToEdit = null;
    this.isAbsenceFormOpen = true;
  }

  closeModal() {
    this.isAbsenceFormOpen = false;
    this.absenceToEdit = null;
  }

  openEditModal(absence: Absence) {
    if (!this.canEditAbsence(absence)) return;
    this.absenceToEdit = absence;
    this.isAbsenceFormOpen = true;
  }

  openDeleteModal(absence: Absence) {
    if (!this.canDeleteAbsence(absence)) return;
    this.absenceToDelete = absence;
    this.confirmationData = {
      title: 'Potvrdi brisanje',
      message: 'Jeste li sigurni da želite obrisati ovo odsustvo?',
      details: [
        `${this.formatDate(absence.startDate)} – ${this.formatDate(absence.endDate)}`,
        'Ova akcija se ne može poništiti.'
      ],
      confirmText: 'Obriši',
      loadingText: 'Brisanje...',
      data: absence
    };
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.isConfirmBusy = false;
    this.absenceToDelete = null;
  }

  onDeleteConfirmed(payload: unknown): void {
    const absence = payload as Absence | undefined;
    if (!absence?._id || this.isConfirmBusy) return;

    this.isConfirmBusy = true;
    this.absenceService.deleteAbsence(absence._id).subscribe({
      next: () => {
        this.onAbsenceDeleted();
        this.closeDeleteModal();
        this.refreshView();
      },
      error: (error) => {
        this.isConfirmBusy = false;
        this.refreshView();
        this.onModalError(this.getDeleteErrorMessage(error));
      }
    });
  }

  private getDeleteErrorMessage(error: any): string {
    const backendError = error.error?.error;
    if (backendError) {
      if (backendError.includes('cannot delete active')) {
        return 'Ne možete obrisati aktivno odsustvo.';
      }
      if (backendError.includes('cannot delete past')) {
        return 'Ne možete obrisati završeno odsustvo.';
      }
      if (backendError.includes('Access denied')) {
        return 'Nemate dozvolu za brisanje odsustva.';
      }
      if (backendError.includes('not found')) {
        return 'Odsustvo nije pronađeno.';
      }
      return backendError;
    }
    if (error.status === 400) return 'Ne možete obrisati ovo odsustvo.';
    if (error.status === 403) return 'Nemate dozvolu za brisanje odsustva.';
    if (error.status === 404) return 'Odsustvo nije pronađeno.';
    return 'Greška pri brisanju odsustva. Molimo pokušajte ponovo.';
  }

  onAbsenceSaved() {
        this.loadAbsences();
    this.showSuccess('Odsustvo je uspješno kreirano!');
  }

  onAbsenceUpdated() {
        this.loadAbsences();
    this.showSuccess('Odsustvo je uspješno ažurirano!');
  }

  onAbsenceDeleted() {
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
    this.refreshView();
    setTimeout(() => {
      this.successMessage = '';
      this.refreshView();
    }, 5000);
  }

  private showError(message: string): void {
    this.clearMessages();
    this.errorMessage = message;
    this.refreshView();
    setTimeout(() => {
      this.errorMessage = '';
      this.refreshView();
    }, 7000);
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView();
  }

  trackByAbsenceId(_index: number, absence: Absence): string {
    return absence._id;
  }

  toggleMobileFilters(): void {
  this.isMobileFiltersOpen = !this.isMobileFiltersOpen;
}

@HostListener('window:resize', ['$event'])
onResize(event: any): void {
  if (event.target.innerWidth > 693) {
    this.isMobileFiltersOpen = false;
  }
}
}