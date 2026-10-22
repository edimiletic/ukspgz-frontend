import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { Router, RouterModule } from '@angular/router';
import { AuthService } from '../../services/login.service';
import { BasketballGameService } from '../../services/basketballGame.service';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { AbsenceService } from '../../services/absence.service';
import { ExamService } from '../../services/exam.service';
import { UserService } from '../../services/user.service';
import { User } from '../../model/user.model';
import { BasketballGame } from '../../model/basketballGame.model';
import { TravelExpense, travelExpenseGameLabel, travelExpenseId, travelExpensePersonName } from '../../model/travel-expense.model';
import { Absence } from '../../model/absence.model';
import { Exam, ExamAttempt } from '../../model/exam.model';
import { EditGameModalComponent } from "../games-assigned/edit-game-modal/edit-game-modal.component";
import { AddQuestionModalComponent } from "../exams/add-question-modal/add-question-modal.component";
import { TimeAbsentModalComponent } from "../time-absent/time-absent-modal/time-absent-modal.component";
import { ExpensesModalComponent } from "../expenses/expenses-modal/expenses-modal.component";
import { ReasonModalComponent } from "../shared/reason-modal/reason-modal.component";
import { ConfirmationData, ConfirmationModalComponent } from "../shared/confirmation-modal/confirmation-modal.component";
import { nominationDecisionDetails, ownPendingNominations } from "../games-assigned/games-assigned.helpers";
import {
  GAME_ASSIGNMENT_ROLES,
  canManageCalendar,
  canNominateOfficials,
  canSeeAllGames,
  formatRoleLabel,
  isAdminUser,
  userHasRole
} from '../../model/roles';
import {
  activeAbsences,
  expenseStatusClass,
  formatAmount as formatEuroAmount,
  formatHomeDate,
  greetingForHour,
  homeGameStatusClass,
  homeGameStatusText,
  summarizeExamAttempts,
  summarizeOfficialGames,
  summarizeOverviewExpenses,
  summarizeOverviewGames,
  summarizeUserExpenses,
  welcomeMessage
} from './home.helpers';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [
    CommonModule,
    RouterModule,
    EditGameModalComponent,
    AddQuestionModalComponent,
    TimeAbsentModalComponent,
    ExpensesModalComponent,
    ReasonModalComponent,
    ConfirmationModalComponent
  ],
  templateUrl: './home.component.html',
  styleUrl: './home.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class HomeComponent implements OnInit {
  currentUser: User | null = null;
  isAdmin = false;
  canManageCalendar = false;
  canSeeAllGames = false;
  isFieldOfficial = false;
  canNominateOfficials = false;

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
    lastExamScore: 0
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
  pendingNominations: BasketballGame[] = [];
  isResponding = false;
  isRejectBusy = false;
  isAcceptModalOpen = false;
  isRejectionModalOpen = false;
  gameToAccept: BasketballGame | null = null;
  gameToReject: BasketballGame | null = null;
  rejectionDetails: string[] = [];
  acceptConfirmationData: ConfirmationData = {
    title: 'Prihvati nominaciju',
    message: 'Jeste li sigurni da želite prihvatiti ovu nominaciju?',
    confirmText: 'Prihvati nominaciju',
    cancelText: 'Odustani',
    confirmButtonClass: 'btn-success',
    loadingText: 'Prihvaćanje...'
  };
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
    private userService: UserService,
    private cdr: ChangeDetectorRef
  ) {}

  private refreshView(): void {
    this.cdr.markForCheck();
  }

  ngOnInit(): void {
    this.loadCurrentUser();
  }

  private loadCurrentUser(): void {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
        this.isAdmin = isAdminUser(user);
        this.canManageCalendar = canManageCalendar(user);
        this.canSeeAllGames = canSeeAllGames(user);
        this.canNominateOfficials = canNominateOfficials(user);
        this.isFieldOfficial = GAME_ASSIGNMENT_ROLES.some((role) => userHasRole(user, role));
        this.refreshView();
        this.loadDashboardData();
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.showError('Greška pri učitavanju korisničkih podataka.');
        this.hasError = true;
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  private loadDashboardData(): void {
    if (this.isAdmin) {
      this.loadAdminDashboard();
    } else if (this.canSeeAllGames) {
      this.loadCommissionerDashboard();
    } else {
      this.loadUserDashboard();
    }
  }

  private loadCommissionerDashboard(): void {
    const tasks: Promise<void>[] = [
      this.loadAdminGames(),
      this.loadAdminExpenses(),
      this.loadUserAbsences()
    ];
    if (this.isFieldOfficial) {
      tasks.push(this.loadOwnPendingNominations(), this.loadUserExams());
    }
    Promise.allSettled(tasks).then((results) => {
      const failures = results.filter(result => result.status === 'rejected');
      if (failures.length > 0) {
        this.showError('Neki podaci nisu mogli biti učitani. Molimo pokušajte osvježiti stranicu.');
      }
      this.isLoading = false;
      this.refreshView();
    });
  }

 private loadUserDashboard(): void {
    const loadPromises = [
      this.loadUserGames(),
      this.loadUserExpenses(),
      this.loadUserAbsences(),
      this.loadUserExams()
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
        this.refreshView();
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
        this.refreshView();
      });
  }

    // Add retry functionality
  retryLoadData(): void {
    this.hasError = false;
    this.isLoading = true;
    this.clearMessages();
    this.loadDashboardData();
  }


private loadOwnPendingNominations(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.gameService.getMyAssignments().subscribe({
      next: (games) => {
        this.pendingNominations = ownPendingNominations(games, this.currentUserId());
        this.dashboardStats.pendingGames = this.pendingNominations.length;
        resolve();
      },
      error: reject
    });
  });
}

private loadUserGames(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.gameService.getMyAssignments().subscribe({
      next: (games) => {
        const summary = summarizeOfficialGames(games, this.currentUserId());
        this.dashboardStats.pendingGames = summary.pendingGames;
        this.pendingNominations = summary.pendingNominations;
        this.dashboardStats.upcomingGames = summary.upcomingGames;
        this.recentGames = summary.recentGames;
        this.dashboardStats.completedGames = summary.recentGames.length;
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
        const summary = summarizeUserExpenses(expenses);
        this.dashboardStats.pendingExpenses = summary.pendingExpenses;
        this.recentExpenses = summary.recentExpenses;
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
        this.currentAbsences = activeAbsences(absences);
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
        const summary = summarizeExamAttempts(attempts);
        this.dashboardStats.lastExamScore = summary.lastExamScore;
        this.recentExamAttempts = summary.recentExamAttempts;
        resolve();
      },
      error: reject
    });
  });
}

private loadAdminGames(): Promise<void> {
  return new Promise((resolve, reject) => {
    this.gameService.getAllGames().subscribe({
      next: (response) => {
        const summary = summarizeOverviewGames(response.games);
        this.adminStats.totalGames = summary.totalGames;
        this.dashboardStats.upcomingGames = summary.upcomingGames;
        this.dashboardStats.completedGames = summary.completedGames;
        this.recentGames = summary.recentGames;
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
        const summary = summarizeOverviewExpenses(expenses);
        this.adminStats.totalExpenses = summary.totalExpenses;
        this.dashboardStats.pendingExpenses = summary.pendingExpenses;
        this.recentExpenses = summary.recentExpenses;
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
        this.currentAbsences = activeAbsences(absences);
        this.dashboardStats.activeAbsences = this.currentAbsences.length;
        resolve();
      },
      error: reject
    });
  });
}
  private loadAdminStats(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.userService.getAllUsers().subscribe({
        next: (users) => {
          this.adminStats.totalUsers = users?.length || 0;
          resolve();
        },
        error: reject
      });
    });
  }

  // Navigation helpers
  navigateTo(route: string): void {
    this.router.navigate([route]);
  }

  // Formatting helpers
formatDate(dateString: string | undefined): string {
  return formatHomeDate(dateString);
}

  getGameStatusClass(game: BasketballGame): string {
    return homeGameStatusClass(game);
  }

  getExpenseStatusClass(expense: TravelExpense): string {
    return expenseStatusClass(expense.state);
  }

  getGreeting(): string {
    return greetingForHour(new Date().getHours());
  }

  getRoleLabel(): string {
    return formatRoleLabel(this.currentUser);
  }

  getWelcomeMessage(): string {
    return welcomeMessage({
      isAdmin: this.isAdmin,
      canManageCalendar: this.canManageCalendar,
      canNominateOfficials: this.canNominateOfficials,
      isFieldOfficial: this.isFieldOfficial
    });
  }

formatAmount(amount: number | undefined | null): string {
  return formatEuroAmount(amount);
}

private currentUserId(): string {
  return this.currentUser?._id || (this.currentUser as { id?: string })?.id || '';
}

getGameStatusText(game: BasketballGame): string {
  return homeGameStatusText(game);
}

  openCreateGameModal(): void {
    this.isCreateGameModalOpen = true;
  }

  closeCreateGameModal(): void {
    this.isCreateGameModalOpen = false;
  }

  acceptNomination(game: BasketballGame): void {
    if (this.isResponding) {
      return;
    }
    this.gameToAccept = game;
    this.acceptConfirmationData = {
      title: 'Prihvati nominaciju',
      message: 'Jeste li sigurni da želite prihvatiti ovu nominaciju?',
      details: nominationDecisionDetails(game),
      confirmText: 'Prihvati nominaciju',
      cancelText: 'Odustani',
      confirmButtonClass: 'btn-success',
      loadingText: 'Prihvaćanje...',
      data: game._id
    };
    this.isAcceptModalOpen = true;
  }

  closeAcceptModal(): void {
    if (this.isResponding) {
      return;
    }
    this.isAcceptModalOpen = false;
    this.gameToAccept = null;
  }

  onAcceptConfirmed(payload: unknown): void {
    const gameId = payload as string | undefined;
    if (!gameId || this.isResponding) {
      return;
    }
    this.respondToAssignment(gameId, 'Accepted');
  }

  rejectNomination(game: BasketballGame): void {
    if (this.isResponding) {
      return;
    }
    this.gameToReject = game;
    this.rejectionDetails = nominationDecisionDetails(game);
    this.isRejectionModalOpen = true;
  }

  closeRejectionModal(): void {
    if (this.isRejectBusy) {
      return;
    }
    this.isRejectionModalOpen = false;
    this.isRejectBusy = false;
    this.gameToReject = null;
    this.rejectionDetails = [];
  }

  onRejectionConfirmed(rejectionReason: string): void {
    if (!this.gameToReject || this.isRejectBusy) {
      return;
    }
    this.isRejectBusy = true;
    this.respondToAssignment(this.gameToReject._id, 'Rejected', rejectionReason);
  }

  private respondToAssignment(gameId: string, response: 'Accepted' | 'Rejected', rejectionReason?: string): void {
    const requestBody: { response: 'Accepted' | 'Rejected'; rejectionReason?: string } = { response };
    if (rejectionReason) {
      requestBody.rejectionReason = rejectionReason;
    }

    this.isResponding = true;
    this.refreshView();
    this.gameService.respondToAssignment(gameId, requestBody).subscribe({
      next: () => {
        this.isResponding = false;
        if (response === 'Accepted') {
          this.showSuccess('Nominacija je uspješno prihvaćena! Povjerenik je obaviješten.');
          this.isAcceptModalOpen = false;
          this.gameToAccept = null;
        } else {
          this.showSuccess('Nominacija je uspješno odbijena! Povjerenik je obaviješten.');
          this.isRejectBusy = false;
          this.closeRejectionModal();
        }
        this.loadDashboardData();
        this.refreshView();
      },
      error: () => {
        this.isResponding = false;
        this.isRejectBusy = false;
        this.refreshView();
        this.showError('Greška pri odgovaranju na nominaciju.');
      }
    });
  }

   onGameCreated(result: any): void {
        this.closeCreateGameModal();
    
    // Show success toast
    if (result.message) {
      this.showSuccess(result.message);
    } else {
      this.showSuccess('Utakmica je uspješno kreirana');
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
    this.refreshView();
    setTimeout(() => {
      this.successMessage = '';
      this.refreshView();
    }, 5000);
  }

  private showError(message: string): void {
    this.clearMessages();
    this.errorMessage = message;
    // Auto-hide after 7 seconds
    this.refreshView();
    setTimeout(() => {
      this.errorMessage = '';
      this.refreshView();
    }, 7000);
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView();
  }

  openTimeAbsentModal(): void {
    this.isTimeAbsentModalOpen = true;
  }

  closeTimeAbsentModal(): void {
    this.isTimeAbsentModalOpen = false;
  }

  onAbsenceSaved(): void {
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
      this.refreshView();
      this.showSuccess('Ispit je uspješno generiran! Preusmjeravam vas...');
      
      // Navigate to exam taking page immediately
            this.router.navigate(['/exams/take', exam._id]);
    },
    error: (err) => {
      this.isLoading = false;
      this.refreshView();
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

  trackByGameId(_index: number, game: BasketballGame): string {
    return game._id;
  }

  trackByExpenseId(_index: number, expense: TravelExpense): string {
    return travelExpenseId(expense);
  }

  expenseTitle(expense: TravelExpense): string {
    const game = travelExpenseGameLabel(expense);
    const role = expense.assignmentRole || '';
    return role ? `${role} — ${game}` : game;
  }

  expensePerson(expense: TravelExpense): string {
    return travelExpensePersonName(expense);
  }

  trackByAbsenceId(_index: number, absence: Absence): string {
    return absence._id;
  }

onExpenseReportCreated(_event: { reportId: string }): void {
  this.closeExpensesModal();
  this.showSuccess('Putni nalog je predan.');
  this.loadDashboardData();
}

}