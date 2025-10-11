// Add to expense-report-details.component.ts

import { Component, OnInit } from '@angular/core';
import { ExpenseItem, TravelExpense } from '../../model/travel-expense.model';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { AuthService } from '../../services/login.service';
import { CommonModule } from '@angular/common';
import { FooterComponent } from "../footer/footer.component";
import { HeaderComponent } from "../header/header.component";
import { DeleteExpensesModalComponent } from "../expenses/delete-expenses-modal/delete-expenses-modal.component";
import { ModalExpenseReportDetailsComponent } from "./modal-expense-report-details/modal-expense-report-details.component";
import { SubmitModalExpenseComponent } from "./submit-modal-expense/submit-modal-expense.component";
import { DeleteItemModalComponent } from './delete-item-modal/delete-item-modal.component';
import { SidebarComponent } from "../sidebar/sidebar.component";

@Component({
  selector: 'app-expense-report-details',
  imports: [RouterModule, CommonModule, FooterComponent, HeaderComponent, DeleteExpensesModalComponent, ModalExpenseReportDetailsComponent, SubmitModalExpenseComponent, DeleteItemModalComponent, SidebarComponent],
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
  expenseItemToDelete = '';
  
  // Add these properties
  isAdmin = false;
  currentUser: any = null;
  isOwner = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private travelExpenseService: TravelExpenseService,
    private authService: AuthService // Remove HttpClient
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
  }

private loadCurrentUser() {
  this.authService.getCurrentUser().subscribe({
    next: (user) =>{
      this.currentUser = user;
      this.isAdmin = user.role ==="Admin";

      if(!this.isAdmin){
        this.router.navigate(['/home'],{
          queryParams:{
            error: 'access_denied',
           message: 'Nemate pristup putnim troškovima'
          }
        });
        return;
      }
      this.route.params.subscribe(params =>{
        const reportId = params['id'];
        if(reportId){
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
        
        // Check if current user is the owner of this report
        this.isOwner = this.currentUser && this.currentUser._id === report.userId;
        console.log('Report loaded:', report);
        console.log('Is owner:', this.isOwner, 'Is admin:', this.isAdmin);
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
    if (!this.report) return false;
    
    // Only show submit button if:
    // 1. User is the owner of the report, AND
    // 2. Report is in 'Skica' state, AND  
    // 3. User is NOT an admin (admins shouldn't submit reports)
    return this.isOwner && this.report.state === 'Skica' && !this.isAdmin;
  }

  // Add method to check if delete button should be shown
  shouldShowDeleteButton(): boolean {
    if (!this.report) return false;
    
    // Only show delete button if:
    // 1. User is the owner of the report, AND
    // 2. User is NOT an admin (admins shouldn't delete reports from detail view)
    return this.isOwner && !this.isAdmin;
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
    if (this.report && this.report.state === 'Skica' && !this.isAdmin) {
      this.isSubmitModalOpen = true;
    } else if (this.isAdmin) {
      console.log('Admin users cannot submit reports');
    } else if (this.report?.state !== 'Skica') {
      this.showError('Možete predati samo izvješća u statusu "Skica".');
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
  if (this.report && !this.isAdmin) {
    this.isDeleteModalOpen = true;
  } else if (this.isAdmin) {
    console.log('Admin users cannot delete reports from detail view');
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
      quantity: expenseData.quantity || 0,
      unitPrice: expenseData.unitPrice || 0,
      competition: expenseData.competition || '',
      amount: expenseData.unitPrice * expenseData.quantity
    };

    // Call the PATCH API to add expense item
    this.travelExpenseService.addExpenseItem(this.report.id, expenseItem).subscribe({
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
    return '';
  }

  showWarning(): boolean {
    return this.report?.state === 'Skica' && (!this.report.expenses || this.report.expenses.length === 0);
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

    this.travelExpenseService.removeExpenseItem(this.report.id, expenseItemId).subscribe({
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
    if (!this.report) {
      return false;
    }

    // Allow adding if:
    // 1. Report is in 'Skica' state, OR
    // 2. User has 'Admin' role
    if (this.report.state === 'Skica') {
      return true;
    }

    return this.getCurrentUserRole() === 'Admin';
  }

  // Helper method to check if current user can delete expense items
  canDeleteExpenseItem(): boolean {
    if (!this.report) {
      return false;
    }

    // Allow deletion if:
    // 1. Report is in 'Skica' state, OR
    // 2. User has 'Admin' role
    if (this.report.state === 'Skica') {
      return true;
    }

    return this.getCurrentUserRole() === 'Admin';
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

  

 
}