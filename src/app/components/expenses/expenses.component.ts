import { Component, OnInit } from '@angular/core';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";
import { ExpensesModalComponent } from "./expenses-modal/expenses-modal.component";
import { NewTravelExpense, TravelExpense } from '../../model/travel-expense.model';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { DeleteExpensesModalComponent } from './delete-expenses-modal/delete-expenses-modal.component';
import { Router, RouterModule ,ActivatedRoute } from '@angular/router';
@Component({
  selector: 'app-expenses',
  imports: [RouterModule, HeaderComponent, FooterComponent, ExpensesModalComponent, FormsModule, CommonModule, DeleteExpensesModalComponent],
  templateUrl: './expenses.component.html',
  styleUrl: './expenses.component.scss'
})
export class ExpensesComponent implements OnInit {
  isModalOpen = false;
  isDeleteModalOpen = false;
  travelExpenses: TravelExpense[] = [];
  successMessage = '';
  errorMessage = '';
  expenseToDelete: TravelExpense | null = null;

  constructor(
    private travelExpenseService: TravelExpenseService,
    private route: ActivatedRoute,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadTravelExpenses();
    this.checkForSuccessMessage();
  }

  private checkForSuccessMessage() {
    this.route.queryParams.subscribe(params => {
      if (params['message'] === 'deleted') {
        this.successMessage = 'Izvješće je uspješno obrisano!';
        console.log('Success message set from query params:', this.successMessage);
        
        // Clear success message after 4 seconds
        setTimeout(() => this.clearMessages(), 4000);
        
        // Clear query parameters to prevent message showing again on refresh
        // Note: We don't navigate to clear params to avoid adding to browser history
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

  editTravelExpense(expense: TravelExpense){
    this.router.navigate(['/expenses', expense.id]);
  }

  closeDeleteModal() {
    this.isDeleteModalOpen = false;
    this.expenseToDelete = null;
  }

  onReportCreated(event: { reportData: NewTravelExpense, reportId: string }) {
    console.log('Setting success message'); // Debug log
    this.successMessage = 'Izvješće je uspješno kreirano!';
    console.log('Success message set to:', this.successMessage); // Debug log
    this.closeModal();
    this.loadTravelExpenses(); // Refresh the table
    
    // Clear success message after 4 seconds
    setTimeout(() => this.clearMessages(), 4000);
    
    // Note: Navigation to report details is handled by the modal component
  }

  onDeleteConfirmed(expenseId: string) {
    this.travelExpenseService.deleteTravelExpense(expenseId).subscribe({
      next: () => {
        console.log('Setting delete success message'); // Debug log
        this.successMessage = 'Izvješće je uspješno obrisano!';
        console.log('Success message set to:', this.successMessage); // Debug log
        this.closeDeleteModal();
        this.loadTravelExpenses(); // Refresh the table
        setTimeout(() => this.clearMessages(), 4000);
      },
      error: (error) => {
        console.error('Error deleting travel expense:', error);
        console.log('Setting error message'); // Debug log
        this.errorMessage = this.getDeleteErrorMessage(error);
        console.log('Error message set to:', this.errorMessage); // Debug log
        this.closeDeleteModal();
        setTimeout(() => this.clearMessages(), 6000);
      }
    });
  }

  loadTravelExpenses() {
    this.travelExpenseService.getCurrentUserTravelExpenses().subscribe({
      next: (expenses) => {
        this.travelExpenses = expenses;
        console.log('Loaded travel expenses:', expenses);
      },
      error: (error) => {
        console.error('Error loading travel expenses:', error);
        this.errorMessage = 'Greška pri učitavanju izvješća.';
      }
    });
  }

  // Deprecated: Use openDeleteModal instead
  deleteTravelExpense(expenseId: string) {
    if (confirm('Jeste li sigurni da želite obrisati ovo izvješće?')) {
      this.travelExpenseService.deleteTravelExpense(expenseId).subscribe({
        next: () => {
          console.log('Setting delete success message'); // Debug log
          this.successMessage = 'Izvješće je uspješno obrisano!';
          console.log('Success message set to:', this.successMessage); // Debug log
          this.loadTravelExpenses(); // Refresh the table
          setTimeout(() => this.clearMessages(), 4000);
        },
        error: (error) => {
          console.error('Error deleting travel expense:', error);
          console.log('Setting error message'); // Debug log
          this.errorMessage = this.getDeleteErrorMessage(error);
          console.log('Error message set to:', this.errorMessage); // Debug log
          setTimeout(() => this.clearMessages(), 6000);
        }
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
}