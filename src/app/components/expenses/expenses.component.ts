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
  
  // Single list for all expenses
  allTravelExpenses: TravelExpense[] = [];
  travelExpenses: TravelExpense[] = [];
  
  // Pagination
  currentPage = 1;
  itemsPerPage = 10;
  totalPages = 1;
  displayedExpenses: TravelExpense[] = [];

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
    this.loadCurrentUser();
    this.checkQueryParams();
  }

  private loadCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.isAdmin = user.role === 'Admin';
        console.log('User loaded:', user.role, 'isAdmin:', this.isAdmin);
        
        // Redirect if not admin
        if (!this.isAdmin) {
          this.router.navigate(['/home'], {
            queryParams: {
              error: 'access_denied',
              message: 'Nemate pristup putnim troškovima. Samo administratori mogu pristupiti ovoj stranici.'
            }
          });
          return;
        }
        
        this.loadTravelExpenses();
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.errorMessage = 'Greška pri učitavanju korisničkih podataka.';
      }
    });
  }

  loadTravelExpenses() {
    // Admin loads ALL expenses
    this.travelExpenseService.getAllTravelExpenses().subscribe({
      next: (expenses) => {
        this.allTravelExpenses = expenses;
        this.applyFilters();
        console.log('Loaded all travel expenses:', expenses.length);
      },
      error: (error) => {
        console.error('Error loading travel expenses:', error);
        this.errorMessage = 'Greška pri učitavanju izvješća.';
      }
    });
  }

  applyFilters() {
    this.travelExpenses = this.filterExpenses(this.allTravelExpenses);
    this.currentPage = 1; // Reset to first page
    this.updatePagination();
  }

  filterExpenses(expenses: TravelExpense[]): TravelExpense[] {
    return expenses.filter(expense => {
      const matchesId = !this.filterValues.id || 
        expense.id.toLowerCase().includes(this.filterValues.id.toLowerCase());
      
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

  updatePagination() {
    this.totalPages = Math.ceil(this.travelExpenses.length / this.itemsPerPage);
    
    if (this.currentPage > this.totalPages && this.totalPages > 0) {
      this.currentPage = this.totalPages;
    } else if (this.totalPages === 0) {
      this.currentPage = 1;
    }
    
    const startIndex = (this.currentPage - 1) * this.itemsPerPage;
    const endIndex = startIndex + this.itemsPerPage;
    this.displayedExpenses = this.travelExpenses.slice(startIndex, endIndex);
  }

  goToPage(page: number) {
    if (page >= 1 && page <= this.totalPages && page !== this.currentPage) {
      this.currentPage = page;
      this.updatePagination();
    }
  }

  getPages(): number[] {
    const pages = [];
    const maxPagesToShow = 5;
    let startPage = Math.max(1, this.currentPage - Math.floor(maxPagesToShow / 2));
    let endPage = Math.min(this.totalPages, startPage + maxPagesToShow - 1);

    if (endPage - startPage < maxPagesToShow - 1) {
      startPage = Math.max(1, endPage - maxPagesToShow + 1);
    }

    for (let i = startPage; i <= endPage; i++) {
      pages.push(i);
    }
    return pages;
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