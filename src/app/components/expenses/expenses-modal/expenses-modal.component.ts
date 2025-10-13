// src/app/components/expenses/expenses-modal/expenses-modal.component.ts
import { NewTravelExpense } from './../../../model/travel-expense.model';
import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TravelExpenseService } from '../../../services/travel-expense.service';
import { UserService } from '../../../services/user.service';
import { User } from '../../../model/user.model';
import { AuthService } from '../../../services/login.service';
import { Router } from '@angular/router';
import { isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';


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
    month: '',
    userId: '' // For admin to select user
  };

  // All available report types
  allReportTypes = [
    'Troškovno izvješće suca',
    'Troškovno izvješće delegata',
    'Troškovno izvješće pomoćnog suca'
  ];

  // Role-based mapping for report types
  private roleToReportTypeMap: { [key: string]: string[] } = {
    'Sudac': ['Troškovno izvješće suca'],
    'Delegat': ['Troškovno izvješće delegata'],
    'Pomoćni Sudac': ['Troškovno izvješće pomoćnog suca']
  };

  // Available report types based on selected user's role
  reportTypes: string[] = [];

  // List of all users (for admin)
  allUsers: User[] = [];
  filteredUsers: User[] = [];

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
  isAdmin = false;

  private platformId = inject(PLATFORM_ID);


  constructor(
    private travelExpenseService: TravelExpenseService,
    private authService: AuthService,
    private userService: UserService,
    private router: Router
  ) {}

ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCurrentUser();
    }
  }

  private loadCurrentUser() {
    this.isLoadingUser = true;
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
         if (!user) {
        console.log('No user found (likely SSR)');
        return; // Stop execution on server-side
      }
        this.currentUser = user;
        this.isAdmin = user.role === 'Admin';
        
        if (this.isAdmin) {
          // Admin can create reports for any user
          this.loadAllUsers();
          this.reportTypes = this.allReportTypes; // Show all types initially
        } else {
          // Regular user creates for themselves
          this.setAvailableReportTypes(user.role);
        }
        
        this.isLoadingUser = false;
        console.log('Current user loaded:', user, 'isAdmin:', this.isAdmin);
      },
      error: (error) => {
        console.error('Error loading current user:', error);
        this.errorMessage = 'Greška pri učitavanju korisničkih podataka.';
        this.isLoadingUser = false;
      }
    });
  }

  private loadAllUsers() {
    this.userService.getReferees().subscribe({
      next: (users) => {
        // Get only referees (Sudac, Delegat, Pomoćni Sudac)
        this.allUsers = users;
        this.filteredUsers = users;
        console.log('Loaded users:', users.length);
      },
      error: (error) => {
        console.error('Error loading users:', error);
        this.errorMessage = 'Greška pri učitavanju korisnika.';
      }
    });
  }

  onUserSelected() {
    if (!this.reportData.userId) {
      this.reportTypes = this.allReportTypes;
      this.reportData.type = '';
      return;
    }

    // Find selected user and set available report types
    const selectedUser = this.allUsers.find(u => u._id === this.reportData.userId);
    if (selectedUser) {
      this.setAvailableReportTypes(selectedUser.role);
      // Auto-select if only one type available
      if (this.reportTypes.length === 1) {
        this.reportData.type = this.reportTypes[0];
      } else {
        this.reportData.type = '';
      }
    }
  }

  private setAvailableReportTypes(role: string) {
    // Map user role to report types
    this.reportTypes = this.roleToReportTypeMap[role] || this.allReportTypes;
    
    // Auto-select if only one option
    if (this.reportTypes.length === 1) {
      this.reportData.type = this.reportTypes[0];
    }
    
    console.log('Available report types for role', role, ':', this.reportTypes);
  }

  isFormValid(): boolean {
    const basicValidation = !!(this.reportData.type && 
           this.reportData.season && 
           this.reportData.year && 
           this.reportData.month);
    
    // For admin, also check if user is selected
    if (this.isAdmin) {
      return basicValidation && !!this.reportData.userId;
    }
    
    return !!basicValidation;
  }

  onSave() {
    if (!this.isFormValid()) {
      this.errorMessage = 'Molimo popunite sva obavezna polja.';
      return;
    }

    this.isLoading = true;
    this.errorMessage = '';

    this.travelExpenseService.createTravelExpense(this.reportData).subscribe({
      next: (createdExpense) => {
        console.log('Travel expense created:', createdExpense);
        this.isLoading = false;
        this.success.emit({
          reportData: this.reportData,
          reportId: createdExpense.id
        });
        this.resetForm();
        this.onClose();
      },
      error: (error) => {
        console.error('Error creating travel expense:', error);
        this.isLoading = false;
        
        if (error.error?.error) {
          if (error.error.error.includes('already have a report')) {
            this.errorMessage = 'Već postoji izvješće za odabranu kombinaciju tipa, godine i mjeseca.';
          } else {
            this.errorMessage = error.error.error;
          }
        } else {
          this.errorMessage = 'Greška pri kreiranju izvješća. Pokušajte ponovo.';
        }
      }
    });
  }

  onClose() {
    this.resetForm();
    this.errorMessage = '';
    this.close.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget && !this.isLoading) {
      this.onClose();
    }
  }

  private resetForm() {
    this.reportData = {
      type: '',
      season: '2024./2025.',
      year: 2024,
      month: '',
      userId: ''
    };
    this.errorMessage = '';
  }

  // Helper to display user name
  getUserDisplayName(user: User): string {
    return `${user.name} ${user.surname} (${user.role})`;
  }
}