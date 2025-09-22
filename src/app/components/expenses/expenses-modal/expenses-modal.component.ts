import { NewTravelExpense } from './../../../model/travel-expense.model';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TravelExpenseService } from '../../../services/travel-expense.service';
import { User } from '../../../model/user.model';
import { AuthService } from '../../../services/login.service';
import { Router } from '@angular/router';

@Component({
  selector: 'app-expenses-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './expenses-modal.component.html',
  styleUrl: './expenses-modal.component.scss'
})
export class ExpensesModalComponent implements OnInit {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<{ reportData: NewTravelExpense, reportId: string }>();

  reportData: NewTravelExpense = {
    type: '',
    season: '2024./2025.',
    year: 2024,
    month: ''
  };

  // All available report types
  private allReportTypes = [
    'Troškovno izvješće suca',
    'Troškovno izvješće delegata',
    'Troškovno izvješće pomoćnog suca'
  ];

  // Role-based mapping for report types
  private roleToReportTypeMap = {
    'Sudac': ['Troškovno izvješće suca'],
    'Delegat': ['Troškovno izvješće delegata'],
    'Pomoćni sudac': ['Troškovno izvješće pomoćnog suca']
  };

  // Available report types based on user role
  reportTypes: string[] = [];

  seasons = ['2024./2025.'];

  months = [
    'Siječanj',
    'Veljača',
    'Ožujak',
    'Travanj',
    'Svibanj',
    'Lipanj',
    'Srpanj',
    'Kolovoz',
    'Rujan',
    'Listopad',
    'Studeni',
    'Prosinac'
  ];

  years = [2024, 2025];

  // Modal-specific states
  isLoading = false;
  errorMessage = '';
  currentUser: User | null = null;
  isLoadingUser = false;

  constructor(
    private travelExpenseService: TravelExpenseService,
    private authService: AuthService,
    private router: Router
  ) {}

  ngOnInit() {
    this.loadCurrentUser();
  }

  private loadCurrentUser() {
    this.isLoadingUser = true;
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
      if (user) {  // Check if user is not null
        this.currentUser = user;
        this.setAvailableReportTypes(user.role);
        console.log('Current user loaded:', user);
      } else {
        console.log('No user returned from getCurrentUser');
        this.reportTypes = []; // Set empty array if no user
      }
      this.isLoadingUser = false;
      },
      error: (error) => {
        console.error('Error loading current user:', error);
        this.errorMessage = 'Greška pri učitavanju korisničkih podataka.';
        // Fallback: show all report types if user data can't be loaded
        this.reportTypes = [];
        this.isLoadingUser = false;
      }
    });
  }

  private setAvailableReportTypes(userRole: string) {
    // Get available report types based on user role
    const availableTypes = this.roleToReportTypeMap[userRole as keyof typeof this.roleToReportTypeMap];
    
    if (availableTypes && availableTypes.length > 0) {
      this.reportTypes = availableTypes;
      // Auto-select the report type if there's only one option
      if (this.reportTypes.length === 1) {
        this.reportData.type = this.reportTypes[0];
      }
    } else {
      // Fallback: if role is not recognized, show all types
      console.warn(`Unknown user role: ${userRole}. Showing all report types.`);
      this.reportTypes = [...this.allReportTypes];
    }

    console.log(`User role: ${userRole}, Available report types:`, this.reportTypes);
  }

  onClose() {
    this.resetForm();
    this.clearError();
    this.close.emit();
  }

  onSave() {
    if (this.isFormValid() && !this.isLoadingUser) {
      this.isLoading = true;
      this.clearError();

      this.travelExpenseService.createTravelExpense(this.reportData).subscribe({
        next: (createdReport) => {
          console.log('Travel expense report created successfully:', createdReport);
          
          // Emit success with both report data and ID
          this.success.emit({ 
            reportData: { ...this.reportData }, 
            reportId: createdReport.id 
          });
          
          // Navigate to the specific report details page
          this.router.navigate(['/expenses', createdReport.id]);
          
          this.resetForm();
          this.isLoading = false;
          
          // Close the modal after navigation
          this.onClose();
        },
        error: (error) => {
          console.error('Error creating travel expense report:', error);
          this.errorMessage = this.getErrorMessage(error);
          this.isLoading = false;
        }
      });
    }
  }

  private resetForm() {
    this.reportData = {
      type: this.reportTypes.length === 1 ? this.reportTypes[0] : '', // Auto-select if only one option
      season: '2024./2025.',
      year: 2024,
      month: ''
    };
  }

  private clearError() {
    this.errorMessage = '';
  }

  isFormValid(): boolean {
    return this.reportData.type !== '' && 
           this.reportData.season !== '' && 
           this.reportData.month !== '' &&
           !this.isLoadingUser;
  }

  private getErrorMessage(error: any): string {
    if (error.error?.error) {
      // Handle specific backend error messages
      const backendError = error.error.error;
      
      if (backendError.includes('already have a report')) {
        return 'Već imate izvješće za ovaj tip, godinu i mjesec.';
      } else if (backendError.includes('Missing required fields')) {
        return 'Molimo popunite sva obavezna polja.';
      } else if (backendError.includes('Unauthorized')) {
        return 'Nemate dozvolu za ovu akciju.';
      } else {
        return backendError;
      }
    }
    
    return 'Dogodila se greška. Molimo pokušajte ponovo.';
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  // Helper method to get user role display text
  getUserRoleDisplay(): string {
    return this.currentUser?.role || 'Nepoznato';
  }
}