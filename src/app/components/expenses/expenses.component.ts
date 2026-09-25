// src/app/components/expenses/expenses.component.ts
// SIMPLIFIED VERSION - Single view for admin

import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { ExpensesModalComponent } from './expenses-modal/expenses-modal.component';
import { NewTravelExpense, TravelExpense } from '../../model/travel-expense.model';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { AuthService } from '../../services/login.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeleteExpensesModalComponent } from './delete-expenses-modal/delete-expenses-modal.component';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';

type ExpenseSectionKey = 'pending' | 'rejected' | 'approved';

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

    private platformId = inject(PLATFORM_ID);

  
  allTravelExpenses: TravelExpense[] = [];
  travelExpenses: TravelExpense[] = [];
  pendingExpenses: TravelExpense[] = [];
  rejectedExpenses: TravelExpense[] = [];
  approvedExpenses: TravelExpense[] = [];

  readonly itemsPerPage = 10;
  sectionPages: Record<ExpenseSectionKey, number> = {
    pending: 1,
    rejected: 1,
    approved: 1
  };

  // Filter properties
  filterValues = {
    id: '',
    type: '',
    userName: '',
    year: '',
    month: '',
    state: ''
  };

  isMobileFiltersOpen = false;
  successMessage = '';
  errorMessage = '';
  expenseToDelete: TravelExpense | null = null;
  isAdmin = false;
  currentUser: any = null;

  constructor(
    private travelExpenseService: TravelExpenseService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) {}

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCurrentUser();
    }
        this.checkQueryParams();
  }

  private loadCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
         if (!user) {
        console.log('No user found (likely SSR)');
        return; // Stop execution on server-side
      }
        this.currentUser = user;
        this.isAdmin = user.role === 'Admin';
        this.loadTravelExpenses();
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.errorMessage = 'Greška pri učitavanju korisničkih podataka.';
      }
    });
  }

  loadTravelExpenses() {
    const request = this.isAdmin
      ? this.travelExpenseService.getAllTravelExpenses()
      : this.travelExpenseService.getCurrentUserTravelExpenses();

    request.subscribe({
      next: (expenses) => {
        this.allTravelExpenses = expenses;
        this.applyFilters(false);
      },
      error: (error) => {
        console.error('Error loading travel expenses:', error);
        this.errorMessage = 'Greška pri učitavanju izvješća.';
      }
    });
  }

  applyFilters(resetPages = true) {
    this.travelExpenses = this.filterExpenses(this.allTravelExpenses);
    this.pendingExpenses = this.sortByNewest(
      this.travelExpenses.filter(e => e.state === 'Skica' || e.state === 'Predano')
    );
    this.rejectedExpenses = this.sortByNewest(
      this.travelExpenses.filter(e => e.state === 'Odbijeno')
    );
    this.approvedExpenses = this.sortByNewest(
      this.travelExpenses.filter(e => e.state === 'Potvrđeno')
    );

    if (resetPages) {
      this.sectionPages = { pending: 1, rejected: 1, approved: 1 };
    }
    this.clampSectionPages();
  }

  private toSection(section: string): ExpenseSectionKey {
    if (section === 'rejected' || section === 'approved' || section === 'pending') {
      return section;
    }
    return 'pending';
  }

  getSectionList(section: string): TravelExpense[] {
    switch (this.toSection(section)) {
      case 'pending':
        return this.pendingExpenses;
      case 'rejected':
        return this.rejectedExpenses;
      case 'approved':
        return this.approvedExpenses;
    }
  }

  getSectionPage(section: string): number {
    return this.sectionPages[this.toSection(section)];
  }

  getPagedExpenses(section: string): TravelExpense[] {
    const key = this.toSection(section);
    const list = this.getSectionList(key);
    const start = (this.sectionPages[key] - 1) * this.itemsPerPage;
    return list.slice(start, start + this.itemsPerPage);
  }

  getSectionTotalPages(section: string): number {
    return Math.max(1, Math.ceil(this.getSectionList(section).length / this.itemsPerPage));
  }

  goToSectionPage(section: string, page: number) {
    const key = this.toSection(section);
    const totalPages = this.getSectionTotalPages(key);
    if (page >= 1 && page <= totalPages && page !== this.sectionPages[key]) {
      this.sectionPages[key] = page;
    }
  }

  getSectionPages(section: string): number[] {
    const totalPages = this.getSectionTotalPages(section);
    const currentPage = this.getSectionPage(section);
    const maxPagesToShow = 5;
    let startPage = Math.max(1, currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    const pages: number[] = [];
    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
  }

  private clampSectionPages() {
    (['pending', 'rejected', 'approved'] as ExpenseSectionKey[]).forEach(section => {
      const totalPages = this.getSectionTotalPages(section);
      if (this.sectionPages[section] > totalPages) {
        this.sectionPages[section] = totalPages;
      } else if (this.sectionPages[section] < 1) {
        this.sectionPages[section] = 1;
      }
    });
  }

  get hasAnySection(): boolean {
    return this.pendingExpenses.length + this.rejectedExpenses.length + this.approvedExpenses.length > 0;
  }

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

  private sortByNewest(expenses: TravelExpense[]): TravelExpense[] {
    return [...expenses].sort((a, b) => {
      const aTime = a.createdAt ? new Date(a.createdAt).getTime() : 0;
      const bTime = b.createdAt ? new Date(b.createdAt).getTime() : 0;
      return bTime - aTime;
    });
  }

  filterExpenses(expenses: TravelExpense[]): TravelExpense[] {
    return expenses.filter(expense => {
      const displayId = expense.displayId != null ? String(expense.displayId) : '';
      const matchesId = !this.filterValues.id ||
        displayId.includes(this.filterValues.id.trim());
      
      const matchesType = !this.filterValues.type || 
        expense.type.toLowerCase().includes(this.filterValues.type.toLowerCase());
      
      const matchesUserName = !this.filterValues.userName || 
        `${expense.userName} ${expense.userSurname}`.toLowerCase()
          .includes(this.filterValues.userName.toLowerCase());
      
      const matchesYear = !this.filterValues.year || 
        expense.year.toString() === this.filterValues.year;
      
      const matchesMonth = !this.filterValues.month || 
        expense.month === this.filterValues.month;
      
      const matchesState = !this.filterValues.state || 
        expense.state === this.filterValues.state;

      return matchesId && matchesType && matchesUserName && 
             matchesYear && matchesMonth && matchesState;
    });
  }

  clearFilters() {
    this.filterValues = {
      id: '',
      type: '',
      userName: '',
      year: '',
      month: '',
      state: ''
    };
    this.applyFilters();
  }

  toggleMobileFilters() {
    this.isMobileFiltersOpen = !this.isMobileFiltersOpen;
  }

  // CRUD Operations
  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onReportCreated(event: { reportData: NewTravelExpense; reportId: string }) {
    this.closeModal();
    this.successMessage = 'Izvješće je uspješno kreirano!';
    this.loadTravelExpenses();
    setTimeout(() => this.clearMessages(), 4000);
    
    // Navigate to details
    this.router.navigate(['/expenses', event.reportId]);
  }

  editTravelExpense(expense: TravelExpense) {
    this.router.navigate(['/expenses', expense.id]);
  }

  openDeleteModal(expense: TravelExpense) {
    this.expenseToDelete = expense;
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.expenseToDelete = null;
  }

onDeleteConfirmed() {
  // Modal already deleted the expense, just handle UI updates
  this.successMessage = 'Izvješće je uspješno obrisano!';
  this.loadTravelExpenses();
  this.closeDeleteModal();
  setTimeout(() => this.clearMessages(), 4000);
}

onExpenseDeleted(expenseId: string) {
  console.log('Expense deleted:', expenseId);
  this.successMessage = 'Izvješće je uspješno obrisano!';
  this.loadTravelExpenses();
  this.closeDeleteModal();
  setTimeout(() => this.clearMessages(), 4000);
}

onDeleteError(errorMessage: string) {
  this.errorMessage = errorMessage;
  this.closeDeleteModal();
  setTimeout(() => this.clearMessages(), 6000);
}  

  // Helper methods
  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR');
  }

  formatAmount(amount: number | undefined): string {
    if (amount === undefined || amount === null) return '0.00 €';
    return `${amount.toFixed(2)} €`;
  }


  trackByExpenseId(index: number, expense: TravelExpense): string {
    return expense.id;
  }

  getStatusClass(state: string): string {
    switch (state) {
      case 'Skica':
        return 'status-draft';
      case 'Predano':
        return 'status-submitted';
      case 'Potvrđeno':
        return 'status-approved';
      case 'Odbijeno':
        return 'status-rejected';
      default:
        return '';
    }
  }

  private checkQueryParams() {
    this.route.queryParams.subscribe(params => {
      if (params['message'] === 'deleted') {
        this.successMessage = 'Izvješće je uspješno obrisano!';
        setTimeout(() => this.clearMessages(), 4000);
        
        // Clean URL
        this.router.navigate([], {
          queryParams: {},
          replaceUrl: true
        });
      }
    });
  }

  clearMessages() {
    this.successMessage = '';
    this.errorMessage = '';
  }
}