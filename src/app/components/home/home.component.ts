import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { HeaderComponent } from '../header/header.component';
import { FooterComponent } from '../footer/footer.component';
import { SidebarComponent } from '../sidebar/sidebar.component';
import { AuthService } from '../../services/login.service';
import { BasketballGameService } from '../../services/basketballGame.service';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { AbsenceService } from '../../services/absence.service';
import { ExamService } from '../../services/exam.service';
import { KontrolaService } from '../../services/kontrola.service';
import { User } from '../../model/user.model';
import { BasketballGame } from '../../model/basketballGame.model';
import { TravelExpense } from '../../model/travel-expense.model';
import { Absence } from '../../model/absence.model';
import { Exam, ExamAttempt } from '../../model/exam.model';
import { CreateGameModalComponent } from "../games-assigned/create-game-modal/create-game-modal.component";
import { AddQuestionModalComponent } from "../exams/add-question-modal/add-question-modal.component";
import { TimeAbsentModalComponent } from "../time-absent/time-absent-modal/time-absent-modal.component";
import { ExpensesModalComponent } from "../expenses/expenses-modal/expenses-modal.component";

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [CommonModule, RouterModule, HeaderComponent, FooterComponent, SidebarComponent, CreateGameModalComponent, AddQuestionModalComponent, TimeAbsentModalComponent, ExpensesModalComponent],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss'
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  isAdmin = false;

    successMessage: string = '';
  errorMessage: string = '';
  
isCreateGameModalOpen = false;
isAddQuestionModalOpen = false; 
isTimeAbsentModalOpen = false;
isExpensesModalOpen = false;


  // Dashboard data
  dashboardStats = {
    pendingGames: 0,
    upcomingGames: 0,
    completedGames: 0,
    pendingExpenses: 0,
    activeAbsences: 0,
    lastExamScore: 0,
    kontrolaCount: 0
  };

  // Recent activity data
  recentGames: BasketballGame[] = [];
  recentExpenses: TravelExpense[] = [];
  currentAbsences: Absence[] = [];
  recentExamAttempts: ExamAttempt[] = [];
  
  // Loading states
  isLoading = true;
  hasError = false;
  
  // Quick stats for admin
  adminStats = {
    totalUsers: 0,
    totalGames: 0,
    totalExpenses: 0,
    totalAbsences: 0
  };

  constructor(
    private router: Router,
    private authService: AuthService,
    private gameService: BasketballGameService,
    private expenseService: TravelExpenseService,
    private absenceService: AbsenceService,
    private examService: ExamService,
    private kontrolaService: KontrolaService
  ) {}

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.isAdmin = user.role === 'Admin';
        console.log('✅ Home - User loaded:', user.role, 'isAdmin:', this.isAdmin); // Add this
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.showError('Greška pri učitavanju korisničkih podataka.');
        this.hasError = true;
        this.isLoading = false;
      }
    });
  }

  private loadDashboardData(): void {
    if (this.isAdmin) {
      this.loadAdminDashboard();
    } else {
      this.loadUserDashboard();
    }
  }

 private loadUserDashboard(): void {
    const loadPromises = [
      this.loadUserGames(),
      this.loadUserExpenses(),
      this.loadUserAbsences(),
      this.loadUserExams(),
      this.loadUserKontrola()
    ];

    Promise.allSettled(loadPromises)
      .then((results) => {
        // Check if any promises were rejected
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
          console.warn('Some dashboard data failed to load:', failures);
          this.showError('Neki podaci nisu mogli biti učitani. Molimo pokušajte osvježiti stranicu.');
        }
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

 private loadAdminDashboard(): void {
    const loadPromises = [
      this.loadAdminGames(),
      this.loadAdminExpenses(),
      this.loadAdminAbsences(),
      this.loadAdminStats()
    ];

    Promise.allSettled(loadPromises)
      .then((results) => {
        // Check if any promises were rejected
        const failures = results.filter(result => result.status === 'rejected');
        if (failures.length > 0) {
          console.warn('Some admin dashboard data failed to load:', failures);
          this.showError('Neki podaci nisu mogli biti učitani. Molimo pokušajte osvježiti stranicu.');
        }
      })
      .finally(() => {
        this.isLoading = false;
      });
  }

    // Add retry functionality
  retryLoadData(): void {
    this.hasError = false;
    this.isLoading = true;
    this.clearMessages();
    this.loadDashboardData();
  }


private loadUserGames(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.gameService.getMyAssignments().subscribe({
      next: (games) => {
        const now = new Date();
        
        // Count pending games (assignments waiting for response)
        this.dashboardStats.pendingGames = games.filter(game => {
          const assignment = game.refereeAssignments.find(
            a => a.userId._id === this.currentUser?._id
          );
          return assignment?.assignmentStatus === 'Pending';
        }).length;

        // Count upcoming games (accepted and future)
        this.dashboardStats.upcomingGames = games.filter(game => {
          const assignment = game.refereeAssignments.find(
            a => a.userId._id === this.currentUser?._id
          );
          const gameDate = new Date(game.date);
          return assignment?.assignmentStatus === 'Accepted' && gameDate >= now;
        }).length;

        // Get recent completed games
        this.recentGames = games
          .filter(game => {
            const assignment = game.refereeAssignments.find(
              a => a.userId._id === this.currentUser?._id
            );
            const gameDate = new Date(game.date);
            return assignment?.assignmentStatus === 'Accepted' && gameDate < now;
          })
          .sort((a, b) => {
            const dateA = this.getSafeDate(a.date).getTime();
            const dateB = this.getSafeDate(b.date).getTime();
            return dateB - dateA;
          })
          .slice(0, 3);

        this.dashboardStats.completedGames = this.recentGames.length;
        resolve();
      },
      error: reject
    });
  });
}

private loadUserExpenses(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.expenseService.getCurrentUserTravelExpenses().subscribe({
      next: (expenses) => {
        this.dashboardStats.pendingExpenses = expenses.filter(e => e.state === 'Skica').length;
        this.recentExpenses = expenses
          .sort((a, b) => {
            const dateA = this.getSafeDate(a.updatedAt || a.createdAt).getTime();
            const dateB = this.getSafeDate(b.updatedAt || b.createdAt).getTime();
            return dateB - dateA;
          })
          .slice(0, 3);
        resolve();
      },
      error: reject
    });
  });
}

private loadUserAbsences(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.absenceService.getCurrentUserAbsences().subscribe({
      next: (absences) => {
        const now = new Date();
        this.currentAbsences = absences
          .filter(absence => {
            const startDate = new Date(absence.startDate);
            const endDate = new Date(absence.endDate);
            return startDate <= now && endDate >= now;
          })
          .sort((a, b) => {
            const dateA = this.getSafeDate(a.createdAt).getTime();
            const dateB = this.getSafeDate(b.createdAt).getTime();
            return dateB - dateA;
          });
        this.dashboardStats.activeAbsences = this.currentAbsences.length;
        resolve();
      },
      error: reject
    });
  });
}
private loadUserExams(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.examService.getUserAttempts().subscribe({
      next: (attempts) => {
        if (attempts.length > 0) {
          const latest = attempts.sort((a, b) => {
            const dateA = this.getSafeDate(a.completedAt).getTime();
            const dateB = this.getSafeDate(b.completedAt).getTime();
            return dateB - dateA;
          })[0];
          this.dashboardStats.lastExamScore = latest.score || 0;
          this.recentExamAttempts = attempts.slice(0, 2);
        }
        resolve();
      },
      error: reject
    });
  });
}

  private loadUserKontrola(): Promise<void> {
    return new Promise((resolve, reject) => {
      // This would need a service method to get user's kontrola count
      // For now, we'll just resolve
      this.dashboardStats.kontrolaCount = 0;
      resolve();
    });
  }

private loadAdminGames(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.gameService.getAllGames().subscribe({
      next: (response) => {
        const games = response.games;
        const now = new Date();
        
        this.adminStats.totalGames = games.length;
        this.dashboardStats.upcomingGames = games.filter(game => new Date(game.date) >= now).length;
        this.dashboardStats.completedGames = games.filter(game => new Date(game.date) < now).length;
        
        this.recentGames = games
          .sort((a, b) => {
            const dateA = this.getSafeDate(a.createdAt || a.date).getTime();
            const dateB = this.getSafeDate(b.createdAt || b.date).getTime();
            return dateB - dateA;
          })
          .slice(0, 5);
        resolve();
      },
      error: reject
    });
  });
}
private loadAdminExpenses(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.expenseService.getAllTravelExpenses().subscribe({
      next: (expenses) => {
        this.adminStats.totalExpenses = expenses.length;
        this.dashboardStats.pendingExpenses = expenses.filter(e => e.state === 'Predano').length;
        this.recentExpenses = expenses
          .sort((a, b) => {
            const dateA = this.getSafeDate(a.submittedAt || a.createdAt).getTime();
            const dateB = this.getSafeDate(b.submittedAt || b.createdAt).getTime();
            return dateB - dateA;
          })
          .slice(0, 5);
        resolve();
      },
      error: reject
    });
  });
}

private loadAdminAbsences(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.absenceService.getAllAbsences().subscribe({
      next: (absences) => {
        this.adminStats.totalAbsences = absences.length;
        const now = new Date();
        this.currentAbsences = absences
          .filter(absence => {
            const startDate = new Date(absence.startDate);
            const endDate = new Date(absence.endDate);
            return startDate <= now && endDate >= now;
          })
          .sort((a, b) => {
            const dateA = this.getSafeDate(a.createdAt).getTime();
            const dateB = this.getSafeDate(b.createdAt).getTime();
            return dateB - dateA;
          });
        this.dashboardStats.activeAbsences = this.currentAbsences.length;
        resolve();
      },
      error: reject
    });
  });
}
  private loadAdminStats(): Promise<void> {
    return new Promise((resolve) => {
      // This would need additional service calls for user count, etc.
      this.adminStats.totalUsers = 0; // Would need UserService.getAllUsers()
      resolve();
    });
  }

  // Navigation helpers
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // Formatting helpers
formatDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

formatDateTime(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  const date = new Date(dateString);
  return date.toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

  getGameStatusClass(game: BasketballGame): string {
    const now = new Date();
    const gameDate = new Date(game.date);
    
    if (gameDate > now) return 'status-upcoming';
    if (gameDate < now) return 'status-completed';
    return 'status-ongoing';
  }

  getExpenseStatusClass(expense: TravelExpense): string {
    switch (expense.state) {
      case 'Skica': return 'status-draft';
      case 'Predano': return 'status-submitted';
      case 'Potvrđeno': return 'status-approved';
      case 'Odbijeno': return 'status-rejected';
      default: return '';
    }
  }

  getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return 'Dobro jutro';
    if (hour < 18) return 'Dobar dan';
    return 'Dobra večer';
  }

  getWelcomeMessage(): string {
    if (this.isAdmin) {
      return 'Dobrodošli u administratorski panel. Ovdje možete upravljati svim aspektima sustava.';
    }
    return 'Dobrodošli u vaš sudački portal. Ovdje možete pratiti svoje utakmice, troškove i ostale aktivnosti.';
  }

// Add this method to your HomeComponent class
formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0,00 €';
  }
  return `${amount.toFixed(2).replace('.', ',')} €`;
}

// Add this helper method to your HomeComponent
private getSafeDate(dateString: string | undefined, fallback: string | Date = new Date(0)): Date {
  if (!dateString) {
    return new Date(fallback);
  }
  return new Date(dateString);
}

getGameStatusText(game: BasketballGame): string {
  const gameDate = new Date(game.date);
  const now = new Date();
  
  // Check if game has a specific status
  switch (game.status) {
    case 'Completed':
      return 'Završeno';
    case 'Cancelled':
      return 'Otkazano';
    case 'Ongoing':
      return 'U tijeku';
    case 'Scheduled':
    default:
      return gameDate > now ? 'Nadolazi' : 'Završeno';
  }
}

  openCreateGameModal(): void {
    this.isCreateGameModalOpen = true;
  }

  closeCreateGameModal(): void {
    this.isCreateGameModalOpen = false;
  }

   onGameCreated(result: any): void {
    console.log('Game created from home:', result);
    this.closeCreateGameModal();
    
    // Show success toast
    if (result.message) {
      this.showSuccess(result.message);
    } else {
      this.showSuccess('Utakmica je uspješno kreirana i nominacije su poslane!');
    }
    
    // Optionally refresh dashboard data
    this.loadDashboardData();
  }

  openAddQuestionModal(): void {
    this.isAddQuestionModalOpen = true;
  }

  closeAddQuestionModal(): void {
    this.isAddQuestionModalOpen = false;
  }

onQuestionAdded(newQuestion: any): void {
    console.log('Question added from home:', newQuestion);
    this.closeAddQuestionModal();
    
    // Show success toast
    this.showSuccess(`Pitanje "${newQuestion.questionText.substring(0, 50)}..." je uspješno dodano!`);
    
    // Optionally refresh dashboard data
    this.loadDashboardData();
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

  openTimeAbsentModal(): void {
    this.isTimeAbsentModalOpen = true;
  }

  closeTimeAbsentModal(): void {
    this.isTimeAbsentModalOpen = false;
  }

  onAbsenceSaved(): void {
    console.log('Absence saved from home');
    this.closeTimeAbsentModal();
    
    // Show success toast
    this.showSuccess('Odsustvo je uspješno kreirano!');
    
    // Refresh dashboard data to update absence counts
    this.loadDashboardData();
  }

  onAbsenceError(errorMessage: string): void {
    console.error('Absence error:', errorMessage);
    // Show error toast
    this.showError(errorMessage);
  }

startNewExam(): void {
  this.isLoading = true; // You might want to add a loading state
  this.clearMessages();

  this.examService.generateExam().subscribe({
    next: (exam: Exam) => {
      this.isLoading = false;
      this.showSuccess('Ispit je uspješno generiran! Preusmjeravam vas...');
      
      // Navigate to exam taking page immediately
      console.log('Navigating to exam with ID:', exam._id);
      this.router.navigate(['/exams/take', exam._id]);
    },
    error: (err) => {
      this.isLoading = false;
      console.error('Failed to generate exam:', err);
      const errorMsg = err.error?.error || 'Greška prilikom kreiranja ispita. Pokušajte ponovo.';
      this.showError(errorMsg);
    }
  });
}

openExpensesModal(): void {
  this.isExpensesModalOpen = true;
}

closeExpensesModal(): void {
  this.isExpensesModalOpen = false;
}

onExpenseReportCreated(event: { reportData: any; reportId: string }): void {
  console.log('Expense report created from home:', event);
  this.closeExpensesModal();
  
  // Show success toast
  this.showSuccess('Izvješće je uspješno kreirano!');
  
  // Optionally refresh dashboard data
  this.loadDashboardData();
}

}