import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { ExpensesModalComponent } from './expenses-modal/expenses-modal.component';
import {
  CROATIAN_MONTHS,
  TravelExpense,
  travelExpenseGame,
  travelExpenseGameLabel,
  travelExpenseGameMonth,
  travelExpenseGameYear,
  travelExpenseId,
  travelExpensePersonName
} from '../../model/travel-expense.model';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { AuthService } from '../../services/login.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ConfirmationData, ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { Router, RouterModule, ActivatedRoute } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { canSeeAllGames, isAdminUser, userHasRole } from '../../model/roles';

type ExpenseSectionKey = 'pending' | 'rejected' | 'approved';

@Component({
  selector: 'app-expenses',
  imports: [
    RouterModule,
    ExpensesModalComponent,
    FormsModule,
    CommonModule,
    ConfirmationModalComponent
  ],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpensesComponent implements OnInit {
  isModalOpen = false;
  isDeleteModalOpen = false;
  isConfirmBusy = false;
  confirmationData: ConfirmationData = {
    title: 'Potvrdi brisanje',
    message: 'Jeste li sigurni da želite obrisati ovaj putni nalog?'
  };

  private platformId = inject(PLATFORM_ID);

  allTravelExpenses: TravelExpense[] = [];
  travelExpenses: TravelExpense[] = [];
  pendingExpenses: TravelExpense[] = [];
  rejectedExpenses: TravelExpense[] = [];
  approvedExpenses: TravelExpense[] = [];
  months = CROATIAN_MONTHS;

  readonly itemsPerPage = 10;
  sectionPages: Record<ExpenseSectionKey, number> = {
    pending: 1,
    rejected: 1,
    approved: 1
  };

  filterValues = {
    id: '',
    assignmentRole: '',
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
  seesSupervisedExpenses = false;
  canReviewExpenses = false;
  currentUser: any = null;

  get defaultRoleFilter(): string {
    return 'Sudac';
  }

  constructor(
    private travelExpenseService: TravelExpenseService,
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute,
    private cdr: ChangeDetectorRef
  ) {}

  private refreshView(): void {
    this.cdr.markForCheck();
  }

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
          return;
        }
        this.currentUser = user;
        this.isAdmin = isAdminUser(user);
        this.seesSupervisedExpenses = !this.isAdmin && canSeeAllGames(user);
        this.canReviewExpenses = this.isAdmin || userHasRole(user, 'Povjerenik natjecanja');
        this.filterValues.assignmentRole = this.showNamedOverview ? this.defaultRoleFilter : '';
        this.refreshView();
        this.loadTravelExpenses();
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.errorMessage = 'Greška pri učitavanju korisničkih podataka.';
        this.refreshView();
      }
    });
  }

  get showNamedOverview(): boolean {
    return this.isAdmin || this.seesSupervisedExpenses;
  }

  loadTravelExpenses() {
    const request = this.showNamedOverview
      ? this.travelExpenseService.getAllTravelExpenses()
      : this.travelExpenseService.getCurrentUserTravelExpenses();

    request.subscribe({
      next: (expenses) => {
        this.allTravelExpenses = expenses;
        this.applyFilters(false);
        this.refreshView();
      },
      error: (error) => {
        console.error('Error loading travel expenses:', error);
        this.errorMessage = 'Greška pri učitavanju putnih naloga.';
        this.refreshView();
      }
    });
  }

  applyFilters(resetPages = true) {
    this.travelExpenses = this.filterExpenses(this.allTravelExpenses);
    this.pendingExpenses = this.sortByNewest(
      this.travelExpenses.filter(e => e.state === 'Predano')
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
    const roleActive = this.showNamedOverview
      ? this.filterValues.assignmentRole !== this.defaultRoleFilter
      : !!this.filterValues.assignmentRole;
    return !!(
      this.filterValues.id ||
      roleActive ||
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

      const matchesRole = this.isOwnExpense(expense) ||
        !this.filterValues.assignmentRole ||
        expense.assignmentRole === this.filterValues.assignmentRole;

      const matchesUserName = !this.filterValues.userName ||
        travelExpensePersonName(expense).toLowerCase()
          .includes(this.filterValues.userName.toLowerCase());

      const matchesYear = !this.filterValues.year ||
        travelExpenseGameYear(expense) === this.filterValues.year;

      const matchesMonth = !this.filterValues.month ||
        travelExpenseGameMonth(expense) === this.filterValues.month;

      const matchesState = !this.filterValues.state ||
        expense.state === this.filterValues.state;

      return matchesId && matchesRole && matchesUserName &&
             matchesYear && matchesMonth && matchesState;
    });
  }

  clearFilters() {
    this.filterValues = {
      id: '',
      assignmentRole: this.showNamedOverview ? this.defaultRoleFilter : '',
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

  openModal() {
    this.isModalOpen = true;
  }

  closeModal() {
    this.isModalOpen = false;
  }

  onReportCreated(event: { reportId: string }) {
    this.closeModal();
    this.successMessage = 'Putni nalog je predan.';
    this.refreshView();
    this.loadTravelExpenses();
    setTimeout(() => this.clearMessages(), 4000);
    if (event.reportId) {
      this.router.navigate(['/expenses', event.reportId]);
    }
  }

  editTravelExpense(expense: TravelExpense) {
    this.router.navigate(['/expenses', travelExpenseId(expense)]);
  }

  isOwnExpense(expense: TravelExpense): boolean {
    const currentId = this.extractId(this.currentUser);
    const reportUserId = this.extractId(expense.userId);
    return !!currentId && !!reportUserId && currentId === reportUserId;
  }

  canDeleteExpense(expense: TravelExpense): boolean {
    if (this.isAdmin) {
      return true;
    }
    return expense.state === 'Odbijeno' && this.isOwnExpense(expense);
  }

  personName(expense: TravelExpense): string {
    return travelExpensePersonName(expense);
  }

  gameLabel(expense: TravelExpense): string {
    return travelExpenseGameLabel(expense);
  }

  venue(expense: TravelExpense): string {
    return travelExpenseGame(expense)?.venue || '';
  }

  private extractId(value: any): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    if (value._id) {
      return String(value._id);
    }
    if (value.id) {
      return String(value.id);
    }
    return '';
  }

  openDeleteModal(expense: TravelExpense) {
    if (!this.canDeleteExpense(expense)) {
      return;
    }
    this.expenseToDelete = expense;
    this.confirmationData = {
      title: 'Potvrdi brisanje',
      message: 'Jeste li sigurni da želite obrisati ovaj putni nalog?',
      details: [
        this.gameLabel(expense),
        'Ova akcija se ne može poništiti.'
      ],
      confirmText: 'Obriši',
      loadingText: 'Brisanje...',
      data: expense
    };
    this.isDeleteModalOpen = true;
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.isConfirmBusy = false;
    this.expenseToDelete = null;
  }

  onDeleteConfirmed(payload: unknown) {
    const expense = payload as TravelExpense | undefined;
    const id = travelExpenseId(expense);
    if (!id || this.isConfirmBusy) return;

    this.isConfirmBusy = true;
    this.travelExpenseService.deleteTravelExpense(id).subscribe({
      next: () => {
        this.successMessage = 'Putni nalog je obrisan.';
        this.loadTravelExpenses();
        this.closeDeleteModal();
        this.refreshView();
        setTimeout(() => this.clearMessages(), 4000);
      },
      error: (error) => {
        this.isConfirmBusy = false;
        this.errorMessage = this.getDeleteErrorMessage(error);
        this.refreshView();
        setTimeout(() => this.clearMessages(), 6000);
      }
    });
  }

  private getDeleteErrorMessage(error: any): string {
    const backendError = error.error?.error;
    if (backendError) {
      return backendError;
    }
    if (error.status === 400) return 'Ne možete obrisati ovaj nalog.';
    if (error.status === 403) return 'Nemate dozvolu za brisanje naloga.';
    if (error.status === 404) return 'Nalog nije pronađen.';
    return 'Greška pri brisanju naloga. Molimo pokušajte ponovo.';
  }

  formatDate(dateString: string): string {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR');
  }

  trackByExpenseId(_index: number, expense: TravelExpense): string {
    return travelExpenseId(expense);
  }

  getStatusClass(state: string): string {
    switch (state) {
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
        this.successMessage = 'Putni nalog je obrisan.';
        this.refreshView();
        setTimeout(() => this.clearMessages(), 4000);

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
    this.refreshView();
  }
}
