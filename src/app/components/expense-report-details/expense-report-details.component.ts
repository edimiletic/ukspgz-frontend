// Add to expense-report-details.component.ts

import { Component, OnInit } from '@angular/core';
import { ExpenseItem, TravelExpense } from '../../model/travel-expense.model';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { AuthService } from '../../services/login.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { FooterComponent } from "../footer/footer.component";
import { HeaderComponent } from "../header/header.component";
import { DeleteExpensesModalComponent } from "../expenses/delete-expenses-modal/delete-expenses-modal.component";
import { ModalExpenseReportDetailsComponent } from "./modal-expense-report-details/modal-expense-report-details.component";
import { SubmitModalExpenseComponent } from "./submit-modal-expense/submit-modal-expense.component";
import { DeleteItemModalComponent } from './delete-item-modal/delete-item-modal.component';
import { SidebarComponent } from "../sidebar/sidebar.component";
import { RejectExpenseModalComponent } from './reject-expense-modal/reject-expense-modal.component';
@Component({
  selector: 'app-expense-report-details',
  imports: [RouterModule, CommonModule, FooterComponent, HeaderComponent, DeleteExpensesModalComponent, ModalExpenseReportDetailsComponent, SubmitModalExpenseComponent, DeleteItemModalComponent, SidebarComponent, RejectExpenseModalComponent],
  templateUrl: './expense-report-details.component.html',
  styleUrl: './expense-report-details.component.scss'
})
export class ExpenseReportDetailsComponent implements OnInit {
 report: TravelExpense | null = null;
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  isDeleteModalOpen = false;
  isAddExpenseModalOpen = false;
  isSubmitModalOpen = false;
  isDeleteExpenseItemModalOpen = false;
  isRejectModalOpen = false;
  expenseItemToDelete = '';
  
  private platformId = inject(PLATFORM_ID);


  // Add these properties
  isAdmin = false;
  currentUser: any = null;
  isOwner = false;
  isReviewing = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private travelExpenseService: TravelExpenseService,
    private authService: AuthService // Remove HttpClient
  ) {}

ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCurrentUser();
    }
  }

private loadCurrentUser() {
  this.authService.getCurrentUser().subscribe({
    next: (user) =>{
       if (!user) {
        console.log('No user found (likely SSR)');
        return; // Stop execution on server-side
      }
      this.currentUser = user;
      this.isAdmin = user.role === 'Admin';
      this.route.params.subscribe(params => {
        const reportId = params['id'];
        if (reportId) {
          this.loadReport(reportId);
        }
      });
    },
    error:(error) =>{
      console.error('Error loading user:', error);
      this.router.navigate(['/login']);
    }
  })
}

  private loadReport(reportId: string) {
    this.isLoading = true;
    this.travelExpenseService.getTravelExpenseById(reportId).subscribe({
      next: (report) => {
        this.report = report;
        this.isLoading = false;
        this.isOwner = this.resolveIsOwner(report);
      },
      error: (error) => {
        console.error('Error loading report:', error);
        this.showError('Greška pri učitavanju izvješća.');
        this.isLoading = false;
      }
    });
  }

  // Add method to check if submit button should be shown
  shouldShowSubmitButton(): boolean {
    return this.canEditItems();
  }

  shouldShowDeleteButton(): boolean {
    return this.canEditItems();
  }

  shouldShowAdminReview(): boolean {
    return this.isAdmin && this.report?.state === 'Predano';
  }

  canEditItems(): boolean {
    if (!this.report) {
      return false;
    }
    const editable = this.report.state === 'Skica' || this.report.state === 'Odbijeno';
    if (!editable) {
      return false;
    }
    // Officials who can open the report are the owner. Admins may also own their own reports.
    return this.isOwner || !this.isAdmin;
  }

  private resolveIsOwner(report: TravelExpense): boolean {
    const currentId = this.extractId(this.currentUser) || this.authService.getCurrentUserId();
    const reportUserId = this.extractId(report.userId) || this.extractId((report as any).user);
    if (currentId && reportUserId && currentId === reportUserId) {
      return true;
    }
    return !this.isAdmin;
  }

  private extractId(value: any): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    const nested = value._id || value.id;
    if (!nested) {
      return '';
    }
    return typeof nested === 'object' ? String(nested._id || nested.id || nested) : String(nested);
  }

  getReportId(): string {
    if (!this.report) return '';
    return (this.report as any)._id || this.report.id;
  }

  // Helper method to get current user role from wherever you store it
  private getCurrentUserRole(): string {
    if (this.currentUser) {
      return this.currentUser.role;
    }
    
    // Fallback to localStorage if needed
    const userData = localStorage.getItem('currentUser');
    if (userData) {
      const user = JSON.parse(userData);
      return user.role;
    }
    
    return '';
  }

  onSubmitReport() {
    if (this.shouldShowSubmitButton()) {
      this.isSubmitModalOpen = true;
    } else {
      this.showError('Možete predati samo skice ili odbijena izvješća.');
    }
  }

  closeSubmitModal() {
    this.isSubmitModalOpen = false;
  }

  onSubmitConfirmed(updatedReport: TravelExpense) {
    this.report = updatedReport;
    this.closeSubmitModal();
    this.showSuccess('Izvješće je uspješno predano!');
  }

  onSubmitError(errorMessage: string) {
    this.showError(errorMessage);
  }



  closeDeleteModal() {
    this.isDeleteModalOpen = false;
  }

  onExpenseDeleted() {
  // Handle successful deletion - navigate back to expenses list
  console.log('Report deleted successfully');
  this.closeDeleteModal();
  this.router.navigate(['/expenses'], { 
    queryParams: { 
      message: 'deleted',
      reportId: this.report?.id 
    } 
  });
}

onDeleteError(errorMessage: string) {
  // Handle deletion error
  console.error('Error deleting report:', errorMessage);
  this.showError(errorMessage);
  this.closeDeleteModal();
}

onDeleteReport() {
  if (this.shouldShowDeleteButton()) {
    this.isDeleteModalOpen = true;
  }
}

  // Updated onAddExpense method with role-based check
  onAddExpense() {
    // Check if user can add expense items
    if (!this.canAddExpenseItem()) {
      this.showError('Ne možete dodati stavke u predana, odobrena ili odbijena izvješća. Samo Admin može izvršiti ovu akciju.');
      return;
    }
    
    this.isAddExpenseModalOpen = true;
  }

  closeAddExpenseModal() {
    this.isAddExpenseModalOpen = false;
  }

  onExpenseSaved(expenseData: ExpenseItem) {
    console.log('New expense item:', expenseData);
    
    if (!this.report) {
      this.showError('Greška: Izvješće nije učitano.');
      return;
    }
    
    // Convert NewExpenseItem to the format expected by the API
const expenseItem = {
    type: expenseData.type || '',
    date: expenseData.date || '',
    description: expenseData.description || '',
    unit: expenseData.unit || '',
    quantity: expenseData.quantity || 1,  // ✅ Changed from 0 to 1
    unitPrice: expenseData.unitPrice || expenseData.amount || 1,  // ✅ Use amount if unitPrice is 0
    competition: expenseData.competition || '',
    amount: expenseData.amount,  // ✅ Use the actual amount from expenseData
    gameId: expenseData.gameId || undefined,
    homeTeam: expenseData.homeTeam || undefined,
    awayTeam: expenseData.awayTeam || undefined
  };

    // Call the PATCH API to add expense item
    this.travelExpenseService.addExpenseItem(this.getReportId(), expenseItem).subscribe({
      next: (updatedReport) => {
        console.log('Expense item added successfully:', updatedReport);
        this.report = updatedReport;
        this.closeAddExpenseModal();
        this.showSuccess('Stavka je uspješno dodana!');
      },
      error: (error) => {
        console.error('Error adding expense item:', error);
        this.showError(this.getExpenseErrorMessage(error));
        // Don't close modal on error so user can retry
      }
    });
  }

  private getExpenseErrorMessage(error: any): string {
    if (error.error?.error) {
      const backendError = error.error.error;
      
      if (backendError.includes('Cannot add expense items to submitted')) {
        return 'Ne možete dodati stavke u predana, odobrena ili odbijena izvješća.';
      } else if (backendError.includes('Cannot modify approved')) {
        return 'Ne možete modificirati odobreno izvješće.';
      } else if (backendError.includes('Access denied')) {
        return 'Nemate dozvolu za dodavanje stavki.';
      } else if (backendError.includes('not found')) {
        return 'Izvješće nije pronađeno.';
      } else if (backendError.includes('validation')) {
        return 'Neispravni podaci. Molimo provjerite unos.';
      } else {
        return backendError;
      }
    }
    
    return 'Greška pri dodavanju stavke. Molimo pokušajte ponovo.';
  }

  onPrint() {
    window.print();
  }

  goBack() {
    this.router.navigate(['/expenses']);
  }

  // Helper methods
  getPageTitle(): string {
    if (!this.report) return 'Izvješće putnih troškova';
    return `Izvješće putnih troškova | ${this.report.userName || 'Nepoznato'} ${this.report.userSurname || ''} | ${this.report.month} ${this.report.year}`;
  }

  getFormattedAmount(): string {
    if (!this.report) return '0.00 €';
    return `${this.report.totalAmount?.toFixed(2) || '0.00'} €`;
  }

  getFormattedDate(): string {
    if (!this.report?.createdAt) return 'Nepoznato';
    const date = new Date(this.report.createdAt);
    return `${date.toLocaleDateString('hr-HR')} ${date.toLocaleTimeString('hr-HR', { 
      hour: '2-digit', 
      minute: '2-digit' 
    })}, ${this.report.userName || 'Nepoznato'} ${this.report.userSurname || ''}`;
  }

  getWarningMessage(): string {
    if (!this.report) return '';
    
    if (this.report.state === 'Skica') {
      return 'Upozorenje: Ovo izvješće nije predano. Dodajte troškove u izvješće.';
    }
    if (this.report.state === 'Odbijeno') {
      return 'Ovo izvješće je odbijeno. Ispravite ga prema napomeni administratora i predajte ponovo.';
    }
    return '';
  }

  showWarning(): boolean {
    return this.report?.state === 'Skica' || this.report?.state === 'Odbijeno';
  }

  getConditionText(): string {
    if (!this.report) return 'Nepoznato';
    return this.report.state;
  }

  // Helper methods for expense items display
  formatExpenseDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR');
  }

  getExpenseTypeDisplay(expense: any): string {
    if (expense.type) {
      return expense.type;
    }
    return expense.type || 'Nepoznato';
  }

  getGameDisplay(expense: ExpenseItem): string {
    if (expense.homeTeam && expense.awayTeam) {
      return `${expense.homeTeam} vs ${expense.awayTeam}`;
    }
    return '—';
  }

  formatAmount(amount: number | undefined | null): string {
    if (amount === undefined || amount === null || isNaN(amount)) {
      console.warn('Invalid amount value:', amount);
      return '0.00 €';
    }
    return `${amount.toFixed(2)} €`;
  }

  getTotalExpensesAmount(): string {
    if (!this.report?.expenses || this.report.expenses.length === 0) {
      return '0.00 €';
    }
    
    const total = this.report.expenses.reduce((sum, expense) => sum + (expense.amount || 0), 0);
    return `${total.toFixed(2)} €`;
  }

  // Updated deleteExpenseItem method to open confirmation modal
  deleteExpenseItem(expenseItemId: string) {
    if (!this.report || !expenseItemId) {
      return;
    }

    // Check if deletion is allowed based on report state and user role
    if (!this.canDeleteExpenseItem()) {
      this.showError('Ne možete obrisati stavke iz predanih, odobrenih ili odbijenih izvješća. Samo Admin može izvršiti ovu akciju.');
      return;
    }

    // Open confirmation modal instead of browser confirm
    this.expenseItemToDelete = expenseItemId;
    this.isDeleteExpenseItemModalOpen = true;
  }

  // Method to close the delete expense item modal
  closeDeleteExpenseItemModal() {
    this.isDeleteExpenseItemModalOpen = false;
    this.expenseItemToDelete = '';
  }

  // Method called when deletion is confirmed in the modal
  onDeleteExpenseItemConfirmed(expenseItemId: string) {
    if (!this.report || !expenseItemId) {
      this.closeDeleteExpenseItemModal();
      return;
    }

    this.travelExpenseService.removeExpenseItem(this.getReportId(), expenseItemId).subscribe({
      next: (updatedReport) => {
        console.log('Expense item deleted successfully');
        this.report = updatedReport;
        this.closeDeleteExpenseItemModal();
        this.showSuccess('Stavka je uspješno obrisana!');
      },
      error: (error) => {
        console.error('Error deleting expense item:', error);
        this.closeDeleteExpenseItemModal();
        this.showError(this.getDeleteErrorMessage(error));
      }
    });
  }

  // Helper method to check if current user can add expense items
  canAddExpenseItem(): boolean {
    return this.canEditItems();
  }

  canDeleteExpenseItem(): boolean {
    return this.canEditItems();
  }

  // Helper method to check if delete button should be shown
  showDeleteButton(): boolean {
    return this.canDeleteExpenseItem();
  }

  // Helper method to get appropriate error message for deletion
  private getDeleteErrorMessage(error: any): string {
    if (error.error?.error) {
      const backendError = error.error.error;
      
      if (backendError.includes('Cannot delete expense items from submitted')) {
        return 'Ne možete obrisati stavke iz predanih, odobrenih ili odbijenih izvješća.';
      } else if (backendError.includes('Access denied')) {
        return 'Nemate dozvolu za brisanje stavki.';
      } else if (backendError.includes('not found')) {
        return 'Stavka troška nije pronađena.';
      } else {
        return backendError;
      }
    }
    
    return 'Greška pri brisanju stavke troška.';
  }

  trackByExpenseItemId(index: number, expense: any): string {
    return expense._id || index.toString();
  }

  getConditionClass(): string {
    if (!this.report) return '';
    
    switch (this.report.state) {
      case 'Skica':
        return 'condition-draft';
      case 'Predano':
        return 'condition-submitted';
      case 'Potvrđeno':
        return 'condition-approved';
      case 'Odbijeno':
        return 'condition-rejected';
      default:
        return '';
    }
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

  reviewReport(action: 'approve' | 'reject', notes = ''): void {
    if (!this.report || this.isReviewing) {
      return;
    }

    this.isReviewing = true;
    this.travelExpenseService.reviewTravelExpense(
      this.getReportId(),
      action,
      notes.trim()
    ).subscribe({
      next: (updatedReport) => {
        this.report = updatedReport;
        this.isReviewing = false;
        this.isRejectModalOpen = false;
        this.showSuccess(action === 'approve'
          ? 'Izvješće je odobreno.'
          : 'Izvješće je vraćeno korisniku na ispravak.');
      },
      error: (error) => {
        this.isReviewing = false;
        this.showError(error.error?.error || 'Greška pri pregledu izvješća.');
      }
    });
  }

  openRejectModal(): void {
    this.isRejectModalOpen = true;
  }

  closeRejectModal(): void {
    if (!this.isReviewing) {
      this.isRejectModalOpen = false;
    }
  }

  onRejectConfirmed(notes: string): void {
    this.reviewReport('reject', notes);
  }
}