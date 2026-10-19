import { BasketballGameService } from './../../services/basketballGame.service';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit, HostListener, ViewEncapsulation } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AuthService } from '../../services/login.service';
import { BasketballGame, RefereeAssignment } from '../../model/basketballGame.model';
import { ReasonModalComponent } from "../shared/reason-modal/reason-modal.component";
import { ConfirmationData, ConfirmationModalComponent } from "../shared/confirmation-modal/confirmation-modal.component";
import { EditGameModalComponent } from "./edit-game-modal/edit-game-modal.component";
import { canManageCalendar, canNominateOfficials, canSeeAllGames, isAdminUser } from '../../model/roles';
import {
  EMPTY_GAME_FILTERS,
  categorizeGames as splitGamesIntoBuckets,
  filterGames,
  findMyAssignment,
  formatGameDate,
  GamesListFilters,
  hasActiveFilters,
  isGameInPast,
  pageWindow,
  paginate
} from './games-assigned.helpers';
import { GamesFilterBarComponent } from './games-filter-bar.component';
import { GamesListSectionComponent } from './games-list-section.component';

@Component({
  selector: 'app-games-assigned',
  standalone: true,
  imports: [CommonModule, ReasonModalComponent, ConfirmationModalComponent, EditGameModalComponent, GamesFilterBarComponent, GamesListSectionComponent],
  templateUrl: './games-assigned.component.html',
  styleUrl: './games-assigned.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
  encapsulation: ViewEncapsulation.None
})
export class GamesAssignedComponent implements OnInit {
 // Game arrays
  pendingGames: BasketballGame[] = [];
  confirmedGames: BasketballGame[] = [];
  gameHistory: BasketballGame[] = [];
  
  // Original data (unfiltered)
  allPendingGames: BasketballGame[] = [];
  allConfirmedGames: BasketballGame[] = [];
  allGameHistory: BasketballGame[] = [];
  
  // ADD PAGINATION PROPERTIES
  // Pagination for Pending Games
  pendingPage = 1;
  pendingLimit = 10;
  pendingTotalPages = 1;
  pendingDisplayedGames: BasketballGame[] = [];
  
  // Pagination for Confirmed Games
  confirmedPage = 1;
  confirmedLimit = 10;
  confirmedTotalPages = 1;
  confirmedDisplayedGames: BasketballGame[] = [];
  
  // Pagination for Game History
  historyPage = 1;
  historyLimit = 10;
  historyTotalPages = 1;
  historyDisplayedGames: BasketballGame[] = [];
  
  // Loading states
  isLoading = true;
  isLoadingPending = false;
  isLoadingConfirmed = false;
  isLoadingHistory = false;
  
  // Error handling
  errorMessage = '';
  successMessage = '';
  private pendingFocusGameId = '';
  
isMobileFiltersOpen: boolean = false;

  // Current user
  currentUser: any = null;
  
  // Filter properties
  filterValues: GamesListFilters = { ...EMPTY_GAME_FILTERS };
    
  // Rejection modal
  isRejectionModalOpen = false;
  isRejectBusy = false;
  isResponding = false;
  gameToReject: BasketballGame | null = null;
  rejectionDetails: string[] = [];

  isGameFormModalOpen = false;
  gameToEdit: BasketballGame | null = null;

  isConfirmationModalOpen = false;
  isConfirmBusy = false;
  confirmationData: ConfirmationData = {
    title: '',
    message: '',
    confirmText: 'Obriši',
    cancelText: 'Odustani',
    confirmButtonClass: 'btn-danger',
    loadingText: 'Brisanje...'
  };
  gameToDelete: BasketballGame | null = null;

  constructor(
    private basketballGameService: BasketballGameService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  private refreshView(): void {
    this.cdr.markForCheck();
  }

  ngOnInit() {
    this.getCurrentUser();
    // Don't load games here - wait for user data
  }

  getCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
                this.currentUser = user;
        this.refreshView();
        // Load games after we have user data
        this.loadMyGames();
      },
      error: (error) => {
        console.error('Error getting current user:', error);
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  // Check if current user is admin
  isAdmin(): boolean {
    return isAdminUser(this.currentUser);
  }

  canManageCalendar(competition?: string): boolean {
    return canManageCalendar(this.currentUser, competition);
  }

  canNominateOfficials(competition?: string): boolean {
    return canNominateOfficials(this.currentUser, competition);
  }

  canSeeAllGames(): boolean {
    return canSeeAllGames(this.currentUser);
  }

  canEditGame(game: BasketballGame): boolean {
    if (this.isGameInPast(game) && !this.isAdmin()) {
      return false;
    }
    return this.canManageCalendar(game.competition) ||
      this.canNominateOfficials(game.competition);
  }

  private currentUserId(): string {
    return this.currentUser?._id || this.currentUser?.id || '';
  }

  openCreateGameModal() {
    this.gameToEdit = null;
    this.isGameFormModalOpen = true;
  }

  openEditGameModal(game: BasketballGame) {
    this.gameToEdit = game;
    this.isGameFormModalOpen = true;
  }

  closeGameFormModal() {
    this.isGameFormModalOpen = false;
    this.gameToEdit = null;
  }

onGameCreated(result: any) {
  if (result.message) {
    this.showSuccess(result.message);
  } else {
    this.showSuccess('Utakmica je uspješno kreirana');
  }
  this.pendingFocusGameId = result?._id || '';
  this.loadMyGames();
}

  onGameUpdated(updatedGame: any) {
    this.showSuccess(updatedGame?.message || 'Utakmica je uspješno ažurirana!');
    this.pendingFocusGameId = updatedGame?._id || '';
    this.loadMyGames();
  }

  loadMyGames() {
    this.isLoading = true;

    if (this.canSeeAllGames()) {
      // If admin, load all games in the system
            this.basketballGameService.getAllGames().subscribe({
        next: (response) => {
                    this.categorizeGames(response.games);
          this.isLoading = false;
          this.refreshView();
          this.focusPendingGameRow();
        },
        error: (error) => {
          console.error('Error loading games:', error);
          this.showError('Greška pri učitavanju utakmica.');
          this.isLoading = false;
          this.refreshView();
        }
      });
    } else {
      // If referee, load only assigned games
            this.basketballGameService.getMyAssignments().subscribe({
        next: (games) => {
                    this.categorizeGames(games);
          this.isLoading = false;
          this.refreshView();
          this.focusPendingGameRow();
        },
        error: (error) => {
          console.error('Error loading games:', error);
          this.showError('Greška pri učitavanju utakmica.');
          this.isLoading = false;
          this.refreshView();
        }
      });
    }
  }

 categorizeGames(games: BasketballGame[]) {
    const buckets = splitGamesIntoBuckets(games, {
      seeAllGames: this.canSeeAllGames(),
      userId: this.currentUserId()
    });
    this.allPendingGames = buckets.pending;
    this.allConfirmedGames = buckets.confirmed;
    this.allGameHistory = buckets.history;
    this.applyFilters();
  }

  private isGameInPast(game: BasketballGame, now = new Date()): boolean {
    return isGameInPast(game, now);
  }

  getMyAssignment(game: BasketballGame): RefereeAssignment | undefined {
    return findMyAssignment(game, this.currentUserId());
  }

  isAcceptModalOpen = false;
  acceptConfirmationData: ConfirmationData = {
    title: 'Prihvati nominaciju',
    message: 'Jeste li sigurni da želite prihvatiti ovu nominaciju?',
    confirmText: 'Prihvati',
    cancelText: 'Odustani',
    confirmButtonClass: 'btn-success',
    loadingText: 'Prihvaćanje...'
  };
  gameToAccept: BasketballGame | null = null;

  acceptAssignment(gameId: string) {
    if (this.isResponding) {
      return;
    }
    const game = this.pendingGames.find(g => g._id === gameId);
    if (!game) {
      return;
    }
    this.gameToAccept = game;
    this.acceptConfirmationData = {
      title: 'Prihvati nominaciju',
      message: 'Jeste li sigurni da želite prihvatiti ovu nominaciju?',
      details: [
        `${game.homeTeam} vs ${game.awayTeam}`,
        `${this.formatDate(game.date)} u ${game.time}`,
        game.venue,
        game.competition
      ],
      confirmText: 'Prihvati nominaciju',
      cancelText: 'Odustani',
      confirmButtonClass: 'btn-success',
      loadingText: 'Prihvaćanje...',
      data: game._id
    };
    this.isAcceptModalOpen = true;
  }

  closeAcceptModal() {
    if (this.isResponding) {
      return;
    }
    this.isAcceptModalOpen = false;
    this.gameToAccept = null;
  }

  onAcceptConfirmed(payload: unknown) {
    const gameId = payload as string | undefined;
    if (!gameId || this.isResponding) {
      return;
    }
    this.respondToAssignment(gameId, 'Accepted');
  }

  rejectAssignment(gameId: string) {
    const game = this.pendingGames.find(g => g._id === gameId);
    if (game) {
      this.gameToReject = game;
      this.rejectionDetails = [
        `${game.homeTeam} vs ${game.awayTeam}`,
        `${this.formatDate(game.date)} u ${game.time}`,
        game.venue,
        game.competition
      ];
      this.isRejectionModalOpen = true;
    }
  }

  closeRejectionModal() {
    if (this.isRejectBusy) {
      return;
    }
    this.isRejectionModalOpen = false;
    this.isRejectBusy = false;
    this.gameToReject = null;
    this.rejectionDetails = [];
  }

  onRejectionConfirmed(rejectionReason: string) {
    if (!this.gameToReject || this.isRejectBusy) return;
    this.isRejectBusy = true;
    this.respondToAssignment(this.gameToReject._id, 'Rejected', rejectionReason);
  }

  private respondToAssignment(gameId: string, response: 'Accepted' | 'Rejected', rejectionReason?: string) {
    const requestBody: any = { response };
    if (rejectionReason) {
      requestBody.rejectionReason = rejectionReason;
    }

    this.isResponding = true;
    this.basketballGameService.respondToAssignment(gameId, requestBody).subscribe({
      next: () => {
        this.isResponding = false;
        this.refreshView();
        if (response === 'Accepted') {
          this.showSuccess('Nominacija je uspješno prihvaćena! Povjerenik je obaviješten.');
          this.isAcceptModalOpen = false;
          this.gameToAccept = null;
        } else {
          this.showSuccess('Nominacija je uspješno odbijena! Povjerenik je obaviješten.');
          this.isRejectBusy = false;
          this.closeRejectionModal();
        }
        this.loadMyGames();
      },
      error: () => {
        this.isResponding = false;
        this.isRejectBusy = false;
        this.refreshView();
        this.showError('Greška pri odgovaranju na nominaciju.');
      }
    });
  }

  // Helper methods for display
  formatDate(dateString: string): string {
    return formatGameDate(dateString);
  }

  viewerUserId(): string {
    return this.currentUserId();
  }

  canDeleteGame = (game: BasketballGame): boolean => this.canManageCalendar(game.competition);

  canEditListedGame = (game: BasketballGame): boolean => this.canEditGame(game);

  // Toast notification methods
  private showSuccess(message: string): void {
    this.clearMessages();
    this.successMessage = message;
    this.refreshView();
    setTimeout(() => {
      this.successMessage = '';
      this.refreshView();
    }, 5000);
  }

  private showError(message: string): void {
    this.clearMessages();
    this.errorMessage = message;
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



  onFilterChange() {
    this.applyFilters();
    this.refreshView();
  }

  clearFilters() {
    this.filterValues = { ...EMPTY_GAME_FILTERS };
    this.pendingPage = 1;
    this.confirmedPage = 1;
    this.historyPage = 1;
    
if (window.innerWidth <= 693) {
  this.isMobileFiltersOpen = false;
}

    this.applyFilters();
  }

  // Check if any filters are active
  get hasActiveFilters(): boolean {
    return hasActiveFilters(this.filterValues);
  }

  // Get total count for display
  get totalFilteredCount(): number {
    return this.pendingGames.length + this.confirmedGames.length + this.gameHistory.length;
  }

  // Admin action methods
  editGame(game: BasketballGame): void {
    if (!this.canEditGame(game)) {
      return;
    }
    this.openEditGameModal(game);
  }

  deleteGame(game: BasketballGame): void {
    if (this.isGameInPast(game) && !this.isAdmin()) {
      return;
    }
    this.gameToDelete = game;
    this.confirmationData = {
      title: 'Obriši Utakmicu',
      message: 'Jeste li sigurni da želite obrisati ovu utakmicu?',
      details: [
        `${game.homeTeam} vs ${game.awayTeam}`,
        `${this.formatDate(game.date)} u ${game.time}`,
        game.venue,
        'Ova akcija se ne može poništiti.'
      ],
      confirmText: 'Obriši utakmicu',
      cancelText: 'Odustani',
      confirmButtonClass: 'btn-danger',
      loadingText: 'Brisanje...',
      data: game
    };
    this.isConfirmationModalOpen = true;
  }

  closeConfirmationModal(): void {
    this.isConfirmationModalOpen = false;
    this.isConfirmBusy = false;
    this.gameToDelete = null;
  }

  onDeleteConfirmed(payload: unknown): void {
    const game = payload as BasketballGame | undefined;
    if (!game?._id) return;

    this.isConfirmBusy = true;
    this.basketballGameService.deleteGame(game._id).subscribe({
      next: () => {
        this.showSuccess(`Utakmica ${game.homeTeam} vs ${game.awayTeam} je uspješno obrisana.`);
        this.loadMyGames();
        this.closeConfirmationModal();
        this.refreshView();
      },
      error: (error) => {
        console.error('Error deleting game:', error);
        this.showError('Greška pri brisanju utakmice. Molimo pokušajte ponovo.');
        this.closeConfirmationModal();
        this.refreshView();
      }
    });
  }

  updatePagination() {
    this.updatePendingPagination();
    this.updateConfirmedPagination();
    this.updateHistoryPagination();
  }

  updatePendingPagination() {
    const slice = paginate(this.pendingGames, this.pendingPage, this.pendingLimit);
    this.pendingPage = slice.page;
    this.pendingTotalPages = slice.totalPages;
    this.pendingDisplayedGames = slice.items;
  }

  updateConfirmedPagination() {
    const slice = paginate(this.confirmedGames, this.confirmedPage, this.confirmedLimit);
    this.confirmedPage = slice.page;
    this.confirmedTotalPages = slice.totalPages;
    this.confirmedDisplayedGames = slice.items;
  }

  updateHistoryPagination() {
    const slice = paginate(this.gameHistory, this.historyPage, this.historyLimit);
    this.historyPage = slice.page;
    this.historyTotalPages = slice.totalPages;
    this.historyDisplayedGames = slice.items;
  }

  // Pending games pagination methods
  goToPendingPage(page: number) {
    if (page >= 1 && page <= this.pendingTotalPages && page !== this.pendingPage) {
      this.pendingPage = page;
      this.updatePendingPagination();
    }
  }

  getPendingPages(): number[] {
    return pageWindow(this.pendingPage, this.pendingTotalPages);
  }

  // Confirmed games pagination methods
  goToConfirmedPage(page: number) {
    if (page >= 1 && page <= this.confirmedTotalPages && page !== this.confirmedPage) {
      this.confirmedPage = page;
      this.updateConfirmedPagination();
    }
  }

  getConfirmedPages(): number[] {
    return pageWindow(this.confirmedPage, this.confirmedTotalPages);
  }

  // History games pagination methods
  goToHistoryPage(page: number) {
    if (page >= 1 && page <= this.historyTotalPages && page !== this.historyPage) {
      this.historyPage = page;
      this.updateHistoryPagination();
    }
  }

  getHistoryPages(): number[] {
    return pageWindow(this.historyPage, this.historyTotalPages);
  }

  // UPDATE EXISTING METHODS
  applyFilters() {
    // Filter each category
    this.pendingGames = filterGames(this.allPendingGames, this.filterValues);
    this.confirmedGames = filterGames(this.allConfirmedGames, this.filterValues);
    this.gameHistory = filterGames(this.allGameHistory, this.filterValues);
    
    // ADD PAGINATION UPDATE
    this.updatePagination();
  }

  trackByGameId(_index: number, game: BasketballGame): string {
    return game._id;
  }

  private revealGamePage(gameId: string): void {
    const pendingIndex = this.pendingGames.findIndex((game) => game._id === gameId);
    if (pendingIndex >= 0) {
      this.pendingPage = Math.floor(pendingIndex / this.pendingLimit) + 1;
      this.updatePendingPagination();
      return;
    }
    const confirmedIndex = this.confirmedGames.findIndex((game) => game._id === gameId);
    if (confirmedIndex >= 0) {
      this.confirmedPage = Math.floor(confirmedIndex / this.confirmedLimit) + 1;
      this.updateConfirmedPagination();
      return;
    }
    const historyIndex = this.gameHistory.findIndex((game) => game._id === gameId);
    if (historyIndex >= 0) {
      this.historyPage = Math.floor(historyIndex / this.historyLimit) + 1;
      this.updateHistoryPagination();
    }
  }

  private focusPendingGameRow(): void {
    const gameId = this.pendingFocusGameId;
    if (!gameId) {
      return;
    }
    this.revealGamePage(gameId);
    this.cdr.detectChanges();
    this.pendingFocusGameId = '';
    const row = document.querySelector(`[data-game-id="${CSS.escape(gameId)}"]`) as HTMLElement | null;
    if (!row) {
      return;
    }
    row.focus();
    row.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
  }

toggleMobileFilters(): void {
  this.isMobileFiltersOpen = !this.isMobileFiltersOpen;
}

@HostListener('window:resize', ['$event'])
onResize(event: any): void {
  if (event.target.innerWidth > 693) {
    this.isMobileFiltersOpen = false;
  }
}
}