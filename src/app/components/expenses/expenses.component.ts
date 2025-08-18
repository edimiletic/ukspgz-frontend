import { Component, HostListener, OnInit } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ExpensesModalComponent } from './expenses-modal/expenses-modal.component';
import {
  NewTravelExpense,
  TravelExpense,
} from '../../model/travel-expense.model';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { AuthService } from '../../services/login.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeleteExpensesModalComponent } from './delete-expenses-modal/delete-expenses-modal.component';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SidebarComponent } from "../sidebar/sidebar.component";

@Component({
  selector: 'app-expenses',
  imports: [
    RouterModule,
    HeaderComponent,
    FooterComponent,
    ExpensesModalComponent,
    FormsModule,
    CommonModule,
    DeleteExpensesModalComponent,
    SidebarComponent
],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
})
export class ExpensesComponent implements OnInit {
  isModalOpen = false;
  isDeleteModalOpen = false;
  travelExpenses: TravelExpense[] = [];
  // Original data (unfiltered)
  allTravelExpenses: TravelExpense[] = [];
  allSubmittedExpenses: TravelExpense[] = [];
  allApprovedExpenses: TravelExpense[] = [];
  allRejectedExpenses: TravelExpense[] = [];

  // Admin-specific tables (filtered)
  submittedExpenses: TravelExpense[] = []; // Predano
  approvedExpenses: TravelExpense[] = []; // Potvrđeno
  rejectedExpenses: TravelExpense[] = []; // Odbijeno

  // ADD PAGINATION PROPERTIES
  // Pagination for Submitted Expenses
  submittedPage = 1;
  submittedLimit = 10;
  submittedTotalPages = 1;
  submittedDisplayedExpenses: TravelExpense[] = [];
  
  // Pagination for Approved Expenses
  approvedPage = 1;
  approvedLimit = 10;
  approvedTotalPages = 1;
  approvedDisplayedExpenses: TravelExpense[] = [];
  
  // Pagination for Rejected Expenses
  rejectedPage = 1;
  rejectedLimit = 10;
  rejectedTotalPages = 1;
  rejectedDisplayedExpenses: TravelExpense[] = [];

  // Pagination for User View
  userPage = 1;
  userLimit = 10;
  userTotalPages = 1;
  userDisplayedExpenses: TravelExpense[] = [];


  successMessage = '';
  errorMessage = '';
  expenseToDelete: TravelExpense | null = null;
  isAdmin = false;
  currentUser: any = null;

isMobileFiltersOpen: boolean = false;

  // Filter properties
  filterValues = {
    id: '',
    type: '',
    userName: '',
    userSurname: '',
    submitDate: '',
    year: '',
    month: '',
    state: '',
  };

  constructor(
    private travelExpenseService: TravelExpenseService,
    private authService: AuthService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkUserRole();
    this.checkForSuccessMessage();
  }

  private checkUserRole() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.isAdmin = user.role === 'Admin';
        console.log('User role:', user.role, 'Is Admin:', this.isAdmin);
        // Load expenses AFTER we know the user role
        this.loadTravelExpenses();
      },
      error: (error) => {
        console.error('Error getting current user:', error);
        this.isAdmin = false;
        // Still try to load expenses for regular users
        this.loadTravelExpenses();
      },
    });
  }

  private checkForSuccessMessage() {
    this.route.queryParams.subscribe((params) => {
      if (params['message'] === 'deleted') {
        this.successMessage = 'Izvješće je uspješno obrisano!';
        console.log(
          'Success message set from query params:',
          this.successMessage
        );

        // Clear success message after 4 seconds
        setTimeout(() => this.clearMessages(), 4000);
      }
    });
  }

  openModal() {
    this.isModalOpen = true;
    this.clearMessages();
  }

  closeModal() {
    this.isModalOpen = false;
  }

  openDeleteModal(expense: TravelExpense) {
    this.expenseToDelete = expense;
    this.isDeleteModalOpen = true;
    this.clearMessages();
  }

  editTravelExpense(expense: TravelExpense) {
    this.router.navigate(['/expenses', expense.id]);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.expenseToDelete = null;
  }

  onReportCreated(event: { reportData: NewTravelExpense; reportId: string }) {
    console.log('Setting success message');
    this.successMessage = 'Izvješće je uspješno kreirano!';
    console.log('Success message set to:', this.successMessage);
    this.closeModal();
    this.loadTravelExpenses(); // Refresh the tables

    // Clear success message after 4 seconds
    setTimeout(() => this.clearMessages(), 4000);
  }

  onDeleteConfirmed(expenseId: string) {
    this.travelExpenseService.deleteTravelExpense(expenseId).subscribe({
      next: () => {
        console.log('Setting delete success message');
        this.successMessage = 'Izvješće je uspješno obrisano!';
        console.log('Success message set to:', this.successMessage);
        this.closeDeleteModal();
        this.loadTravelExpenses(); // Refresh the tables
        setTimeout(() => this.clearMessages(), 4000);
      },
      error: (error) => {
        console.error('Error deleting travel expense:', error);
        console.log('Setting error message');
        this.errorMessage = this.getDeleteErrorMessage(error);
        console.log('Error message set to:', this.errorMessage);
        this.closeDeleteModal();
        setTimeout(() => this.clearMessages(), 6000);
      },
    });
  }

  loadTravelExpenses() {
    if (this.isAdmin) {
      // Load all expenses for admin and categorize them
      this.travelExpenseService.getAllTravelExpenses().subscribe({
        next: (expenses) => {
          console.log('Loaded all travel expenses for admin:', expenses);
          this.allTravelExpenses = expenses;
          this.categorizeExpenses(expenses);
          this.applyFilters(); // Apply any existing filters
        },
        error: (error) => {
          console.error('Error loading all travel expenses:', error);
          this.errorMessage = 'Greška pri učitavanju izvješća.';
        },
      });
    } else {
      // Load only current user's expenses for regular users
      this.travelExpenseService.getCurrentUserTravelExpenses().subscribe({
        next: (expenses) => {
          this.allTravelExpenses = expenses;
          this.travelExpenses = expenses;
          this.applyFilters(); // Apply any existing filters
          console.log('Loaded current user travel expenses:', expenses);
        },
        error: (error) => {
          console.error('Error loading travel expenses:', error);
          this.errorMessage = 'Greška pri učitavanju izvješća.';
        },
      });
    }
  }

  private categorizeExpenses(expenses: TravelExpense[]) {
    this.allSubmittedExpenses = expenses.filter(
      (expense) => expense.state === 'Predano'
    );
    this.allApprovedExpenses = expenses.filter(
      (expense) => expense.state === 'Potvrđeno'
    );
    this.allRejectedExpenses = expenses.filter(
      (expense) => expense.state === 'Odbijeno'
    );

    console.log('Categorized expenses:');
    console.log('Submitted (Predano):', this.allSubmittedExpenses.length);
    console.log('Approved (Potvrđeno):', this.allApprovedExpenses.length);
    console.log('Rejected (Odbijeno):', this.allRejectedExpenses.length);
  }

applyFilters() {
  if (this.isAdmin) {
    // Filter each category for admin
    this.submittedExpenses = this.filterExpenses(this.allSubmittedExpenses);
    this.approvedExpenses = this.filterExpenses(this.allApprovedExpenses);
    this.rejectedExpenses = this.filterExpenses(this.allRejectedExpenses);
  } else {
    // Filter for regular users
    this.travelExpenses = this.filterExpenses(this.allTravelExpenses);
  }
  
  // ADD THIS LINE - Update pagination after filtering
  this.updatePagination();
}

  updatePagination() {
    if (this.isAdmin) {
     
      // Update pagination for each admin table
      this.updateSubmittedPagination();
      this.updateApprovedPagination();
      this.updateRejectedPagination();
    } else {
      // Reset page for user view
      this.userPage = 1;
      this.updateUserPagination();
    }
  }

 updateSubmittedPagination() {
  this.submittedTotalPages = Math.ceil(this.submittedExpenses.length / this.submittedLimit);
  
  // Smart page handling - if current page is beyond available pages, go to last page
  if (this.submittedPage > this.submittedTotalPages && this.submittedTotalPages > 0) {
    this.submittedPage = this.submittedTotalPages;
  }else if (this.submittedTotalPages === 0) {
    this.submittedPage = 1;
  }
  
  const startIndex = (this.submittedPage - 1) * this.submittedLimit;
  const endIndex = startIndex + this.submittedLimit;
  this.submittedDisplayedExpenses = this.submittedExpenses.slice(startIndex, endIndex);
}

updateApprovedPagination() {
  this.approvedTotalPages = Math.ceil(this.approvedExpenses.length / this.approvedLimit);
  
  // Smart page handling
  if (this.approvedPage > this.approvedTotalPages && this.approvedTotalPages > 0) {
    this.approvedPage = this.approvedTotalPages;
  }else if (this.approvedTotalPages === 0) {
    this.approvedPage = 1;
  }
  
  const startIndex = (this.approvedPage - 1) * this.approvedLimit;
  const endIndex = startIndex + this.approvedLimit;
  this.approvedDisplayedExpenses = this.approvedExpenses.slice(startIndex, endIndex);
}

updateRejectedPagination() {
  this.rejectedTotalPages = Math.ceil(this.rejectedExpenses.length / this.rejectedLimit);
  
  // Smart page handling
  if (this.rejectedPage > this.rejectedTotalPages && this.rejectedTotalPages > 0) {
    this.rejectedPage = this.rejectedTotalPages;
  }else if (this.rejectedTotalPages === 0) {
    this.rejectedPage = 1;
  }
  
  const startIndex = (this.rejectedPage - 1) * this.rejectedLimit;
  const endIndex = startIndex + this.rejectedLimit;
  this.rejectedDisplayedExpenses = this.rejectedExpenses.slice(startIndex, endIndex);
}

updateUserPagination() {
  this.userTotalPages = Math.ceil(this.travelExpenses.length / this.userLimit);
  
  // Smart page handling
  if (this.userPage > this.userTotalPages && this.userTotalPages > 0) {
    this.userPage = this.userTotalPages;
  }else if (this.userTotalPages === 0) {
    this.userPage = 1;
  }
  
  const startIndex = (this.userPage - 1) * this.userLimit;
  const endIndex = startIndex + this.userLimit;
  this.userDisplayedExpenses = this.travelExpenses.slice(startIndex, endIndex);
}

// Navigation methods
goToSubmittedPage(page: number) {
  if (page >= 1 && page <= this.submittedTotalPages && page !== this.submittedPage) {
    this.submittedPage = page;
    this.updateSubmittedPagination();
  }
}

getSubmittedPages(): number[] {
  const pages = [];
  const start = Math.max(1, this.submittedPage - 2);
  const end = Math.min(this.submittedTotalPages, this.submittedPage + 2);
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

goToApprovedPage(page: number) {
  if (page >= 1 && page <= this.approvedTotalPages && page !== this.approvedPage) {
    this.approvedPage = page;
    this.updateApprovedPagination();
  }
}

getApprovedPages(): number[] {
  const pages = [];
  const start = Math.max(1, this.approvedPage - 2);
  const end = Math.min(this.approvedTotalPages, this.approvedPage + 2);
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

goToRejectedPage(page: number) {
  if (page >= 1 && page <= this.rejectedTotalPages && page !== this.rejectedPage) {
    this.rejectedPage = page;
    this.updateRejectedPagination();
  }
}

getRejectedPages(): number[] {
  const pages = [];
  const start = Math.max(1, this.rejectedPage - 2);
  const end = Math.min(this.rejectedTotalPages, this.rejectedPage + 2);
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

goToUserPage(page: number) {
  if (page >= 1 && page <= this.userTotalPages && page !== this.userPage) {
    this.userPage = page;
    this.updateUserPagination();
  }
}

getUserPages(): number[] {
  const pages = [];
  const start = Math.max(1, this.userPage - 2);
  const end = Math.min(this.userTotalPages, this.userPage + 2);
  
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}
  
  private filterExpenses(expenses: TravelExpense[]): TravelExpense[] {
    return expenses.filter((expense) => {
      // ID filter
      if (
        this.filterValues.id &&
        !expense.id.toLowerCase().includes(this.filterValues.id.toLowerCase())
      ) {
        return false;
      }

      // Type filter
      if (
        this.filterValues.type &&
        !expense.type
          .toLowerCase()
          .includes(this.filterValues.type.toLowerCase())
      ) {
        return false;
      }

      // User name filter (admin only)
      if (
        this.isAdmin &&
        this.filterValues.userName &&
        expense.userName &&
        expense.userSurname
      ) {
        const fullName =
          `${expense.userName} ${expense.userSurname}`.toLowerCase();
        if (!fullName.includes(this.filterValues.userName.toLowerCase())) {
          return false;
        }
      }

      // Year filter - exact match
      if (
        this.filterValues.year &&
        expense.year.toString() !== this.filterValues.year
      ) {
        return false;
      }

      // Month filter - exact match
      if (
        this.filterValues.month &&
        expense.month !== this.filterValues.month
      ) {
        return false;
      }

      // State filter - exact match
      if (
        this.filterValues.state &&
        expense.state !== this.filterValues.state
      ) {
        return false;
      }

      // Submit date filter (Datum Predavanja) - EXACT match
if (this.filterValues.submitDate && expense.submittedAt) {
  const filterSubmitDate = new Date(this.filterValues.submitDate);
  const expenseSubmitDate = new Date(expense.submittedAt);
  
  // Compare only the date part (ignore time)
  filterSubmitDate.setHours(0, 0, 0, 0);
  expenseSubmitDate.setHours(0, 0, 0, 0);
  
  if (filterSubmitDate.getTime() !== expenseSubmitDate.getTime()) {
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
      type: '',
      userName: '',
      userSurname: '',
      submitDate: '',
      year: '',
      month: '',
      state: '',
    };

  // Reset to page 1 only when clearing filters
  if (this.isAdmin) {
    this.submittedPage = 1;
    this.approvedPage = 1;
    this.rejectedPage = 1;
  } else {
    this.userPage = 1;
  }

  if (window.innerWidth <= 693) {
  this.isMobileFiltersOpen = false;
}

    this.applyFilters();
  }

  // Check if any filters are active
  get hasActiveFilters(): boolean {
    return !!(
      this.filterValues.id ||
      this.filterValues.type ||
      this.filterValues.userName ||
      this.filterValues.year ||
      this.filterValues.month ||
      this.filterValues.state
    );
  }

  // Get total count for display
  get totalFilteredCount(): number {
    if (this.isAdmin) {
      return (
        this.submittedExpenses.length +
        this.approvedExpenses.length +
        this.rejectedExpenses.length
      );
    } else {
      return this.travelExpenses.length;
    }
  }

  // Admin action methods
  approveExpense(expense: TravelExpense) {
    if (!this.isAdmin) return;

    const updatedExpense = { ...expense, state: 'Potvrđeno' };
    this.travelExpenseService.updateTravelExpense(updatedExpense).subscribe({
      next: (updated) => {
        this.successMessage = 'Izvješće je uspješno odobreno!';
        this.loadTravelExpenses(); // Refresh tables
        setTimeout(() => this.clearMessages(), 4000);
      },
      error: (error) => {
        console.error('Error approving expense:', error);
        this.errorMessage = 'Greška pri odobravanju izvješća.';
        setTimeout(() => this.clearMessages(), 6000);
      },
    });
  }

  rejectExpense(expense: TravelExpense) {
    if (!this.isAdmin) return;

    const updatedExpense = { ...expense, state: 'Odbijeno' };
    this.travelExpenseService.updateTravelExpense(updatedExpense).subscribe({
      next: (updated) => {
        this.successMessage = 'Izvješće je uspješno odbijeno!';
        this.loadTravelExpenses(); // Refresh tables
        setTimeout(() => this.clearMessages(), 4000);
      },
      error: (error) => {
        console.error('Error rejecting expense:', error);
        this.errorMessage = 'Greška pri odbijanju izvješća.';
        setTimeout(() => this.clearMessages(), 6000);
      },
    });
  }

  resetToSubmitted(expense: TravelExpense) {
    if (!this.isAdmin) return;

    const updatedExpense = { ...expense, state: 'Predano' };
    this.travelExpenseService.updateTravelExpense(updatedExpense).subscribe({
      next: (updated) => {
        this.successMessage = 'Izvješće je vraćeno u status "Predano"!';
        this.loadTravelExpenses(); // Refresh tables
        setTimeout(() => this.clearMessages(), 4000);
      },
      error: (error) => {
        console.error('Error resetting expense status:', error);
        this.errorMessage = 'Greška pri mijenjanju statusa izvješća.';
        setTimeout(() => this.clearMessages(), 6000);
      },
    });
  }

  // Deprecated: Use openDeleteModal instead
  deleteTravelExpense(expenseId: string) {
    if (confirm('Jeste li sigurni da želite obrisati ovo izvješće?')) {
      this.travelExpenseService.deleteTravelExpense(expenseId).subscribe({
        next: () => {
          console.log('Setting delete success message');
          this.successMessage = 'Izvješće je uspješno obrisano!';
          console.log('Success message set to:', this.successMessage);
          this.loadTravelExpenses(); // Refresh the tables
          setTimeout(() => this.clearMessages(), 4000);
        },
        error: (error) => {
          console.error('Error deleting travel expense:', error);
          console.log('Setting error message');
          this.errorMessage = this.getDeleteErrorMessage(error);
          console.log('Error message set to:', this.errorMessage);
          setTimeout(() => this.clearMessages(), 6000);
        },
      });
    }
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

    return 'Greška pri brisanju izvješća. Molimo pokušajte ponovo.';
  }

  // Public method to clear messages (called from template)
  clearMessages() {
    this.errorMessage = '';
    this.successMessage = '';
  }

  // TrackBy function for better performance in ngFor
  trackByExpenseId(index: number, expense: TravelExpense): string {
    return expense.id;
  }

  // Helper methods for formatting
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR');
  }

  formatAmount(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      return '0.00 €';
    }
    return `${amount.toFixed(2)} €`;
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
