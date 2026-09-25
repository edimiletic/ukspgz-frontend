import { BasketballGameService } from './../../services/basketballGame.service';
import { Component, OnInit, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";
import { AuthService } from '../../services/login.service';
import { BasketballGame, BasketballGameUtils, RefereeAssignment, RefereeGroups, RefereeInfo } from '../../model/basketballGame.model';
import { FormsModule } from '@angular/forms';
import { RejectionModalComponent } from "./rejection-modal/rejection-modal.component";
import { CreateGameModalComponent } from "./create-game-modal/create-game-modal.component";
import { ConfirmationData, DeleteGameModalComponent } from "./delete-game-modal/delete-game-modal.component";
import { EditGameModalComponent } from "./edit-game-modal/edit-game-modal.component";
import { SidebarComponent } from "../sidebar/sidebar.component";
import { canManageCalendar, canNominateAssistants, canNominateOfficials, canSeeAllGames, isAdminUser, userHasRole } from '../../model/roles';
import { KontrolaModalComponent } from "./kontrola-modal/kontrola-modal.component";
import { KontrolaService } from '../../services/kontrola.service';
import { ViewKontrolaModalComponent } from "./view-kontrola-modal/view-kontrola-modal.component";
import { firstValueFrom } from 'rxjs';

@Component({
  selector: 'app-games-assigned',
  standalone: true,
  imports: [HeaderComponent, FooterComponent, CommonModule, FormsModule, RejectionModalComponent, CreateGameModalComponent, DeleteGameModalComponent, EditGameModalComponent, SidebarComponent, KontrolaModalComponent, ViewKontrolaModalComponent],
  templateUrl: './games-assigned.component.html',
  styleUrl: './games-assigned.component.scss'
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
  
isMobileFiltersOpen: boolean = false;

  // Current user
  currentUser: any = null;
  
  // Filter properties
  filterValues = {
    id: '',
    homeTeam: '',
    awayTeam: '',
    venue: '',
    competition: '',
    date: ''
  };
    
 isKontrolaModalOpen = false;
  gameForKontrola: BasketballGame | null = null;

  // Rejection modal
  isRejectionModalOpen = false;
  gameToReject: BasketballGame | null = null;

  // Create game modal
  isCreateGameModalOpen = false;

  // Edit game modal
  isEditGameModalOpen = false;
  gameToEdit: BasketballGame | null = null;

  // Confirmation modal for delete
  isConfirmationModalOpen = false;
  confirmationData: ConfirmationData = {
    title: '',
    message: '',
    confirmText: 'Obriši',
    cancelText: 'Odustani',
    confirmButtonClass: 'btn-danger',
    iconClass: 'fa-trash'
  };
  gameToDelete: BasketballGame | null = null;

  constructor(
    private basketballGameService: BasketballGameService,
    private authService: AuthService,
    private kontrolaService: KontrolaService
  ) {}

  ngOnInit() {
    this.getCurrentUser();
    // Don't load games here - wait for user data
  }

  getCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        console.log('Current user loaded:', user);
        this.currentUser = user;
        // Load games after we have user data
        this.loadMyGames();
      },
      error: (error) => {
        console.error('Error getting current user:', error);
        this.isLoading = false;
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

  canNominateAssistants(competition?: string): boolean {
    return canNominateAssistants(this.currentUser, competition);
  }

  canSeeAllGames(): boolean {
    return canSeeAllGames(this.currentUser);
  }

  canEditGame(game: BasketballGame): boolean {
    return this.canManageCalendar(game.competition) ||
      this.canNominateOfficials(game.competition) ||
      this.canNominateAssistants(game.competition);
  }

  private currentUserId(): string {
    return this.currentUser?._id || this.currentUser?.id || '';
  }

  private assignmentUserId(assignment: RefereeAssignment): string {
    const assigned: any = assignment?.userId;
    return String(typeof assigned === 'string' ? assigned : assigned?._id || assigned?.id || '');
  }

  private isCurrentUserAssignment(assignment: RefereeAssignment): boolean {
    return this.assignmentUserId(assignment) === this.currentUserId();
  }

  isViewKontrolaModalOpen = false;
  gameForViewKontrola: BasketballGame | null = null;

  // Check if current user can view kontrola (only referees who participated)
  canViewKontrola(game: BasketballGame): boolean {
    if (!this.currentUser) return false;
    
    // Only referees can view kontrola, and only for games they participated in
    if (!userHasRole(this.currentUser, 'Sudac')) {
      return false;
    }

    // Check if the current user was assigned to this game and accepted
    const userAssignment = game.refereeAssignments.find(
      assignment => this.isCurrentUserAssignment(assignment) &&
                   assignment.assignmentStatus === 'Accepted'
    );

    return !!userAssignment;
  }

// Remove the hasKontrola method and add this property
kontrolaStatusMap = new Map<string, boolean>();

// Add this method to check and cache kontrola status

checkGameKontrolaStatus(gameId: string): void {
  console.log('Checking kontrola status for game:', gameId);
  console.log('Current user:', this.currentUser);
  
  if (!this.kontrolaStatusMap.has(gameId)) {
    this.kontrolaStatusMap.set(gameId, false);
    
    this.kontrolaService.hasKontrola(gameId).subscribe({
      next: (response) => {
        console.log(`Kontrola exists response for game ${gameId}:`, response);
        this.kontrolaStatusMap.set(gameId, response.exists);
        
        // Force change detection
        setTimeout(() => {
          console.log(`Kontrola status map updated for ${gameId}:`, this.kontrolaStatusMap.get(gameId));
        }, 100);
      },
      error: (error) => {
        console.error('Error checking kontrola for game', gameId, error);
        this.kontrolaStatusMap.set(gameId, false);
      }
    });
  } else {
    console.log(`Kontrola status already cached for ${gameId}:`, this.kontrolaStatusMap.get(gameId));
  }
}

// Helper method for template
getKontrolaStatus(gameId: string): boolean {
  if (!this.kontrolaStatusMap.has(gameId)) {
    this.checkGameKontrolaStatus(gameId);
    return false;
  }
  return this.kontrolaStatusMap.get(gameId) || false;
}

  // Open view kontrola modal
  openViewKontrolaModal(game: BasketballGame): void {
    console.log('Opening view kontrola modal for game:', game);
    this.gameForViewKontrola = game;
    this.isViewKontrolaModalOpen = true;
  }

  // Close view kontrola modal
  closeViewKontrolaModal(): void {
    this.isViewKontrolaModalOpen = false;
    this.gameForViewKontrola = null;
  }

  // Close kontrola modal
  closeKontrolaModal(): void {
    this.isKontrolaModalOpen = false;
    this.gameForKontrola = null;
  }

  // Handle kontrola saved
 
onKontrolaSaved(result: any): void {
  console.log('Kontrola saved:', result);
  
  // Check if the result indicates success
  if (result && result.success) {
    this.showSuccess(result.message || 'Kontrola je uspješno spremljena!');
  } else {
    this.showError(result?.message || 'Greška pri spremanju kontrole.');
  }
  
  // Refresh the games list to update the kontrola nus
  this.loadMyGames();
}



  // Open create game modal
  openCreateGameModal() {
    this.isCreateGameModalOpen = true;
  }

  // Close create game modal
  closeCreateGameModal() {
    this.isCreateGameModalOpen = false;
  }

onGameCreated(result: any) {
  if (result.message) {
    this.showSuccess(result.message);
  } else {
    this.showSuccess('Utakmica je uspješno kreirana');
  }
  this.loadMyGames(); // Refresh the games list
}
  // Open edit game modal
  openEditGameModal(game: BasketballGame) {
    console.log('Opening edit modal for game:', game);
    this.gameToEdit = game;
    this.isEditGameModalOpen = true;
    console.log('Edit modal state:', this.isEditGameModalOpen);
    console.log('Game to edit:', this.gameToEdit);
  }

  // Close edit game modal
  closeEditGameModal() {
    this.isEditGameModalOpen = false;
    this.gameToEdit = null;
  }

  // Handle game update success
  onGameUpdated(updatedGame: any) {
    this.showSuccess(updatedGame?.message || 'Utakmica je uspješno ažurirana!');
    this.loadMyGames();
  }

  loadMyGames() {
    this.isLoading = true;
    
    if (this.canSeeAllGames()) {
      // If admin, load all games in the system
      console.log('Admin loading all games...');
      this.basketballGameService.getAllGames().subscribe({
        next: (response) => {
          console.log('Admin received games:', response);
          this.categorizeGames(response.games);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading games:', error);
          this.showError('Greška pri učitavanju utakmica.');
          this.isLoading = false;
        }
      });
    } else {
      // If referee, load only assigned games
      console.log('Referee loading assigned games...');
      this.basketballGameService.getMyAssignments().subscribe({
        next: (games) => {
          console.log('Referee received games:', games);
          this.categorizeGames(games);
          this.isLoading = false;
        },
        error: (error) => {
          console.error('Error loading games:', error);
          this.showError('Greška pri učitavanju utakmica.');
          this.isLoading = false;
        }
      });
    }
  }

 categorizeGames(games: BasketballGame[]) {
    console.log('Categorizing games:', games);
    const now = new Date();
    
    if (this.canSeeAllGames()) {
      // For admin, show upcoming games and history only
      this.allPendingGames = games.filter(game => this.isGameUpcoming(game, now));

      this.allConfirmedGames = []; // Admin doesn't see confirmed games section

      this.allGameHistory = games.filter(game => this.isGameInPast(game, now));

      console.log('Admin games categorized:', {
        pending: this.allPendingGames.length,
        history: this.allGameHistory.length
      });
    } else {
      // For referees, show only their assigned games
      this.allPendingGames = games.filter(game => {
        const myAssignment = this.getMyAssignment(game);
        return myAssignment?.assignmentStatus === 'Pending';
      });

      this.allConfirmedGames = games.filter(game => {
        const myAssignment = this.getMyAssignment(game);
        return myAssignment?.assignmentStatus === 'Accepted' && this.isGameUpcoming(game, now);
      });

      this.allGameHistory = games.filter(game => {
        const myAssignment = this.getMyAssignment(game);
        return (myAssignment?.assignmentStatus === 'Accepted' && this.isGameInPast(game, now)) ||
               myAssignment?.assignmentStatus === 'Rejected';
      });

      console.log('Referee games categorized:', {
        pending: this.allPendingGames.length,
        confirmed: this.allConfirmedGames.length,
        history: this.allGameHistory.length
      });
    }
    
    // Apply filters after categorization (which will also update pagination)
    this.applyFilters();
  }

  private getGameDateTime(game: BasketballGame): Date {
    const dateTime = new Date(game.date);
    const [hours = '0', minutes = '0'] = (game.time || '00:00').split(':');
    dateTime.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
    return dateTime;
  }

  private isGameInPast(game: BasketballGame, now = new Date()): boolean {
    return this.getGameDateTime(game).getTime() < now.getTime();
  }

  private isGameUpcoming(game: BasketballGame, now = new Date()): boolean {
    return this.getGameDateTime(game).getTime() >= now.getTime();
  }

  getMyAssignment(game: BasketballGame): RefereeAssignment | undefined {
    if (!this.currentUser) return undefined;
    return game.refereeAssignments.find(
      assignment => this.isCurrentUserAssignment(assignment)
    );
  }

  acceptAssignment(gameId: string) {
    this.respondToAssignment(gameId, 'Accepted');
  }

  rejectAssignment(gameId: string) {
    const game = this.pendingGames.find(g => g._id === gameId);
    if (game) {
      this.gameToReject = game;
      this.isRejectionModalOpen = true;
    }
  }

  closeRejectionModal() {
    this.isRejectionModalOpen = false;
    this.gameToReject = null;
  }

  onRejectionConfirmed(rejectionReason: string) {
    if (!this.gameToReject) return;
    
    this.respondToAssignment(this.gameToReject._id, 'Rejected', rejectionReason);
  }

  private respondToAssignment(gameId: string, response: 'Accepted' | 'Rejected', rejectionReason?: string) {
    const requestBody: any = { response };
    if (rejectionReason) {
      requestBody.rejectionReason = rejectionReason;
    }

    this.basketballGameService.respondToAssignment(gameId, requestBody).subscribe({
      next: (updatedGame) => {
        if (response === 'Accepted') {
          this.showSuccess('Nominacija je uspješno prihvaćena! Administrator je obavješten.');
        } else {
          this.showSuccess('Nominacija je uspješno odbijena! Administrator je obavješten.');
        }
        
        // Reload all games to ensure accurate data and smart pagination
        this.loadMyGames();
        
        if (response === 'Rejected') {
          this.closeRejectionModal();
        }
      },
      error: (error) => {
        console.error('Error responding to assignment:', error);
        this.showError('Greška pri odgovaranju na nominaciju.');
      }
    });
  }

  // Helper methods for display
  formatDate(dateString: string): string {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  }

  formatDateTime(dateString: string, timeString: string): string {
    const date = new Date(dateString);
    return `${date.toLocaleDateString('hr-HR')} ${timeString}`;
  }

  getTeamsDisplay(game: BasketballGame): string {
    return `${game.homeTeam} vs ${game.awayTeam}`;
  }

  getMyRole(game: BasketballGame): string {
    if (this.canSeeAllGames()) {
      return 'Pregled utakmica';
    }

    const myAssignment = this.getMyAssignment(game);
    if (!myAssignment) return '';
    
    const roleTranslation: Record<string, string> = {
      'Sudac': 'Sudac',
      'Delegat': 'Delegat',
      'Pomoćni Sudac': 'Pomoćni Sudac',
      'Kontrolor': 'Kontrolor'
    };
    
    return `${roleTranslation[myAssignment.role]} ${myAssignment.position}`;
  }

  getOtherReferees(game: BasketballGame): string {
    if (!this.currentUser) return '';
    
    const otherReferees = game.refereeAssignments
      .filter(assignment => !this.isCurrentUserAssignment(assignment))
      .map(assignment => `${assignment.userId.name} ${assignment.userId.surname} (${assignment.role} ${assignment.position})`)
      .join(', ');
    
    return otherReferees || 'Nema ostalih sudaca';
  }

  // New method to get all referees with their status
  getAllReferees(game: BasketballGame): RefereeGroups {
    const refereeGroups: RefereeGroups = {
      'Sudac': [],
      'Delegat': [],
      'Pomoćni Sudac': [],
      Kontrolor: []
    };

    game.refereeAssignments.forEach(assignment => {
      // Only show referees with Pending or Accepted status
      if (assignment.assignmentStatus === 'Pending' || assignment.assignmentStatus === 'Accepted') {
        const statusText = assignment.assignmentStatus === 'Pending' ? '(na čekanju)' : '(potvrđeno)';
        const isCurrentUser = this.isCurrentUserAssignment(assignment);
        let nameDisplay: string;
        
        if (this.canSeeAllGames()) {
          nameDisplay = `${assignment.userId.name} ${assignment.userId.surname}`;
        } else {
          nameDisplay = isCurrentUser ? 'Vi' : `${assignment.userId.name} ${assignment.userId.surname}`;
        }
        
        const refereeInfo: RefereeInfo = {
          name: nameDisplay,
          position: assignment.position,
          status: assignment.assignmentStatus,
          statusText: statusText,
          isCurrentUser: isCurrentUser
        };

        refereeGroups[assignment.role].push(refereeInfo);
      }
    });

    return refereeGroups;
  }

  // Method to format all referees for display (filtered based on user role)
  getAllRefereesFormatted(game: BasketballGame): string {
    const refereeGroups = this.getAllReferees(game);
    const myAssignment = this.getMyAssignment(game);
    const myRole = myAssignment?.role;
    const parts = [];

    // Format Sudac
    if (refereeGroups['Sudac'].length > 0) {
      const sudci = refereeGroups['Sudac']
        .sort((a, b) => a.position - b.position)
        .map(ref => `${ref.name} ${ref.statusText}`)
        .join(', ');
      parts.push(`<strong>Sudci:</strong> ${sudci}`);
    }

    // Format Delegat
    if (refereeGroups['Delegat'].length > 0) {
      const delegati = refereeGroups['Delegat']
        .map(ref => `${ref.name} ${ref.statusText}`)
        .join(', ');
      parts.push(`<strong>Delegat:</strong> ${delegati}`);
    }

    if (refereeGroups['Kontrolor'].length > 0) {
      const kontrolori = refereeGroups['Kontrolor']
        .map(ref => `${ref.name} ${ref.statusText}`)
        .join(', ');
      parts.push(`<strong>Kontrolor:</strong> ${kontrolori}`);
    }

    // Format Pomoćni Sudac - show for admin or if current user is NOT Sudac or Delegat
    if (refereeGroups['Pomoćni Sudac'].length > 0 && (this.canSeeAllGames() || (myRole !== 'Sudac' && myRole !== 'Delegat' && myRole !== 'Kontrolor'))) {
      const pomocni = refereeGroups['Pomoćni Sudac']
        .sort((a, b) => a.position - b.position)
        .map(ref => `${ref.name} ${ref.statusText}`)
        .join(', ');
      parts.push(`<strong>Pomoćni sudci:</strong> ${pomocni}`);
    }

    return parts.length > 0 ? parts.join(' | ') : 'Nema dodijeljenih sudaca';
  }

  // Method to get referee summary for cards
  getRefereesSummaryForCard(game: BasketballGame): { sudci: RefereeInfo[], delegat: RefereeInfo[], pomocni: RefereeInfo[] } {
    const refereeGroups = this.getAllReferees(game);
    
    return {
      sudci: refereeGroups['Sudac'].sort((a, b) => a.position - b.position),
      delegat: refereeGroups['Delegat'],
      pomocni: refereeGroups['Pomoćni Sudac'].sort((a, b) => a.position - b.position)
    };
  }

  getStatusDisplay(game: BasketballGame): string {
    if (this.canSeeAllGames()) {
      if (game.status === 'Scheduled' && this.isGameInPast(game)) {
        return 'Odigrano'; // Past scheduled games are considered "played"
      }
      
      const statusTranslation = {
        'Scheduled': 'Zakazano',
        'Ongoing': 'U tijeku',
        'Completed': 'Završeno',
        'Cancelled': 'Otkazano'
      };
      return statusTranslation[game.status] || game.status;
    }

    const myAssignment = this.getMyAssignment(game);
    if (!myAssignment) return game.status;

    const statusTranslation = {
      'Pending': 'Na čekanju',
      'Accepted': 'Prihvaćeno',
      'Rejected': 'Odbijeno'
    };

    return statusTranslation[myAssignment.assignmentStatus] || game.status;
  }

  getStatusClass(game: BasketballGame): string {
    if (this.canSeeAllGames()) {
      if (game.status === 'Scheduled' && this.isGameInPast(game)) {
        return 'status-accepted'; // Use green styling for "Odigrano"
      }
      
      switch (game.status) {
        case 'Scheduled': return 'status-pending';
        case 'Ongoing': return 'status-pending';
        case 'Completed': return 'status-accepted';
        case 'Cancelled': return 'status-rejected';
        default: return '';
      }
    }

    const myAssignment = this.getMyAssignment(game);
    if (!myAssignment) return '';

    switch (myAssignment.assignmentStatus) {
      case 'Pending': return 'status-pending';
      case 'Accepted': return 'status-accepted';
      case 'Rejected': return 'status-rejected';
      default: return '';
    }
  }

  getScoreDisplay(game: BasketballGame): string {
    if (game.status === 'Completed' && game.score) {
      return `${game.score.homeScore} : ${game.score.awayScore}`;
    }
    return '-';
  }

  // Toast notification methods
  private showSuccess(message: string): void {
    this.clearMessages();
    this.successMessage = message;
    setTimeout(() => {
      this.successMessage = '';
    }, 5000);
  }

  private showError(message: string): void {
    this.clearMessages();
    this.errorMessage = message;
    setTimeout(() => {
      this.errorMessage = '';
    }, 7000);
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
  }


  private filterGames(games: BasketballGame[]): BasketballGame[] {
    return games.filter(game => {
      // ID filter - starts with
      const displayId = game.displayId != null ? String(game.displayId) : '';
      if (this.filterValues.id && !displayId.startsWith(this.filterValues.id.trim())) {
        return false;
      }

      // Home team filter - starts with
      if (this.filterValues.homeTeam && !game.homeTeam.toLowerCase().startsWith(this.filterValues.homeTeam.toLowerCase())) {
        return false;
      }

      // Away team filter - starts with
      if (this.filterValues.awayTeam && !game.awayTeam.toLowerCase().startsWith(this.filterValues.awayTeam.toLowerCase())) {
        return false;
      }

      // Venue filter - starts with
      if (this.filterValues.venue && !game.venue.toLowerCase().startsWith(this.filterValues.venue.toLowerCase())) {
        return false;
      }

      // Competition filter - starts with
      if (this.filterValues.competition && !game.competition.toLowerCase().startsWith(this.filterValues.competition.toLowerCase())) {
        return false;
      }

      // Date filter - EXACT match
      if (this.filterValues.date) {
        const filterDate = new Date(this.filterValues.date);
        const gameDate = new Date(game.date);
        
        // Compare only the date part (ignore time)
        filterDate.setHours(0, 0, 0, 0);
        gameDate.setHours(0, 0, 0, 0);
        
        if (filterDate.getTime() !== gameDate.getTime()) {
          return false;
        }
      }

      return true;
    });
  }

  onFilterChange() {
    this.applyFilters();
  }

  clearFilters() {
    this.filterValues = {
      id: '',
      homeTeam: '',
      awayTeam: '',
      venue: '',
      competition: '',
      date: ''
    };
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
    return !!(this.filterValues.id || this.filterValues.homeTeam || this.filterValues.awayTeam || 
              this.filterValues.venue || this.filterValues.competition || this.filterValues.date);
  }

  // Get total count for display
  get totalFilteredCount(): number {
    return this.pendingGames.length + this.confirmedGames.length + this.gameHistory.length;
  }

  // Admin action methods
  editGame(game: BasketballGame): void {
    console.log('Edit game:', game);
    this.openEditGameModal(game);
  }

  deleteGame(game: BasketballGame): void {
    console.log('Delete game clicked:', game);
    this.gameToDelete = game;
    this.confirmationData = {
      title: 'Obriši Utakmicu',
      message: `
        <strong>Jeste li sigurni da želite obrisati ovu utakmicu?</strong><br><br>
        <em><strong>${game.homeTeam}</strong> vs <strong>${game.awayTeam}</strong></em><br>
        <em>${this.formatDate(game.date)} u ${game.time}</em><br>
        <em>${game.venue}</em><br><br>
        <strong>Ova akcija se ne može poništiti.</strong>
      `,
      confirmText: 'Obriši Utakmicu',
      cancelText: 'Odustani',
      confirmButtonClass: 'btn-danger',
      iconClass: 'fa-trash',
      data: game
    };
    this.isConfirmationModalOpen = true;
    console.log('Modal should be open now:', this.isConfirmationModalOpen);
  }

  closeConfirmationModal(): void {
    this.isConfirmationModalOpen = false;
    this.gameToDelete = null;
    // No need to manually reset loading state - the modal will handle it
  }

  onDeleteConfirmed(game: BasketballGame): void {
    if (!game) return;

    this.basketballGameService.deleteGame(game._id).subscribe({
      next: (response) => {
        this.showSuccess(`Utakmica ${game.homeTeam} vs ${game.awayTeam} je uspješno obrisana.`);
        this.loadMyGames(); // Refresh the list
        this.closeConfirmationModal();
      },
      error: (error) => {
        console.error('Error deleting game:', error);
        this.showError('Greška pri brisanju utakmice. Molimo pokušajte ponovo.');
        this.closeConfirmationModal();
      }
    });
  }


  // Check if current user can access Kontrola column (Admin or Delegat)
  canAccessKontrola(): boolean {
    return isAdminUser(this.currentUser) ||
      userHasRole(this.currentUser, 'Delegat') ||
      userHasRole(this.currentUser, 'Kontrolor');
  }

  canWriteKontrola(game: BasketballGame): boolean {
    if (!this.currentUser) return false;
    if (isAdminUser(this.currentUser)) return true;

    const hasKontrolor = game.refereeAssignments.some(
      assignment => assignment.role === 'Kontrolor' && assignment.assignmentStatus !== 'Rejected'
    );
    const userId = this.currentUserId();

    if (hasKontrolor) {
      return game.refereeAssignments.some(
        assignment => assignment.role === 'Kontrolor' &&
          this.assignmentUserId(assignment) === userId &&
          assignment.assignmentStatus !== 'Rejected'
      );
    }

    return userHasRole(this.currentUser, 'Delegat') && game.refereeAssignments.some(
      assignment => assignment.role === 'Delegat' &&
        this.assignmentUserId(assignment) === userId &&
        assignment.assignmentStatus !== 'Rejected'
    );
  }

  isKontrolaEditMode = false;



async openKontrolaModal(game: BasketballGame): Promise<void> {
  console.log('Opening kontrola modal for game:', game);
  
  this.gameForKontrola = game;
  
  try {
    const response = await firstValueFrom(this.kontrolaService.hasKontrola(game._id));
    console.log('🔍 Kontrola exists:', response.exists);
    
    // Set edit mode first
    this.isKontrolaEditMode = response.exists;
    
    // Use setTimeout to ensure change detection picks up the edit mode change
    setTimeout(() => {
      this.isKontrolaModalOpen = true;
      console.log('📝 Modal opened with edit mode:', this.isKontrolaEditMode);
    }, 10);
    
  } catch (error) {
    console.error('❌ Error checking kontrola existence:', error);
    this.isKontrolaEditMode = false;
    setTimeout(() => {
      this.isKontrolaModalOpen = true;
    }, 10);
  }
}

  updatePagination() {
    this.updatePendingPagination();
    this.updateConfirmedPagination();
    this.updateHistoryPagination();
  }

  updatePendingPagination() {
    this.pendingTotalPages = Math.ceil(this.pendingGames.length / this.pendingLimit);
    
    // Only change page if current page is invalid
    if (this.pendingPage > this.pendingTotalPages && this.pendingTotalPages > 0) {
      this.pendingPage = this.pendingTotalPages;
    } else if (this.pendingTotalPages === 0) {
      this.pendingPage = 1;
    }
    
    const startIndex = (this.pendingPage - 1) * this.pendingLimit;
    const endIndex = startIndex + this.pendingLimit;
    this.pendingDisplayedGames = this.pendingGames.slice(startIndex, endIndex);
  }

  updateConfirmedPagination() {
    this.confirmedTotalPages = Math.ceil(this.confirmedGames.length / this.confirmedLimit);
    
    // Only change page if current page is invalid
    if (this.confirmedPage > this.confirmedTotalPages && this.confirmedTotalPages > 0) {
      this.confirmedPage = this.confirmedTotalPages;
    } else if (this.confirmedTotalPages === 0) {
      this.confirmedPage = 1;
    }
    
    const startIndex = (this.confirmedPage - 1) * this.confirmedLimit;
    const endIndex = startIndex + this.confirmedLimit;
    this.confirmedDisplayedGames = this.confirmedGames.slice(startIndex, endIndex);
  }

  updateHistoryPagination() {
    this.historyTotalPages = Math.ceil(this.gameHistory.length / this.historyLimit);
    
    // Only change page if current page is invalid
    if (this.historyPage > this.historyTotalPages && this.historyTotalPages > 0) {
      this.historyPage = this.historyTotalPages;
    } else if (this.historyTotalPages === 0) {
      this.historyPage = 1;
    }
    
    const startIndex = (this.historyPage - 1) * this.historyLimit;
    const endIndex = startIndex + this.historyLimit;
    this.historyDisplayedGames = this.gameHistory.slice(startIndex, endIndex);
  }

  // Pending games pagination methods
  goToPendingPage(page: number) {
    if (page >= 1 && page <= this.pendingTotalPages && page !== this.pendingPage) {
      this.pendingPage = page;
      this.updatePendingPagination();
    }
  }

  getPendingPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.pendingPage - 2);
    const end = Math.min(this.pendingTotalPages, this.pendingPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // Confirmed games pagination methods
  goToConfirmedPage(page: number) {
    if (page >= 1 && page <= this.confirmedTotalPages && page !== this.confirmedPage) {
      this.confirmedPage = page;
      this.updateConfirmedPagination();
    }
  }

  getConfirmedPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.confirmedPage - 2);
    const end = Math.min(this.confirmedTotalPages, this.confirmedPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // History games pagination methods
  goToHistoryPage(page: number) {
    if (page >= 1 && page <= this.historyTotalPages && page !== this.historyPage) {
      this.historyPage = page;
      this.updateHistoryPagination();
    }
  }

  getHistoryPages(): number[] {
    const pages = [];
    const start = Math.max(1, this.historyPage - 2);
    const end = Math.min(this.historyTotalPages, this.historyPage + 2);
    
    for (let i = start; i <= end; i++) {
      pages.push(i);
    }
    return pages;
  }

  // UPDATE EXISTING METHODS
  applyFilters() {
    // Filter each category
    this.pendingGames = this.filterGames(this.allPendingGames);
    this.confirmedGames = this.filterGames(this.allConfirmedGames);
    this.gameHistory = this.filterGames(this.allGameHistory);
    
    // ADD PAGINATION UPDATE
    this.updatePagination();
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