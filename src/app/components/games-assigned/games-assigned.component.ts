import { BasketballGameService } from './../../services/basketballGame.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";
import { AuthService } from '../../services/login.service';
import { BasketballGame, BasketballGameUtils, RefereeAssignment, RefereeGroups, RefereeInfo } from '../../model/basketballGame.model';
import { FormsModule } from '@angular/forms';
import { RejectionModalComponent } from "./rejection-modal/rejection-modal.component";
import { CreateGameModalComponent } from "./create-game-modal/create-game-modal.component";
import { ConfirmationData, DeleteGameModalComponent } from "./delete-game-modal/delete-game-modal.component";

@Component({
  selector: 'app-games-assigned',
  imports: [HeaderComponent, FooterComponent, CommonModule, FormsModule, RejectionModalComponent, CreateGameModalComponent, DeleteGameModalComponent],
  templateUrl: './games-assigned.component.html',
  styleUrl: './games-assigned.component.scss'
})
export class GamesAssignedComponent implements OnInit {
// Game arrays
  pendingGames: BasketballGame[] = [];
  confirmedGames: BasketballGame[] = [];
  gameHistory: BasketballGame[] = [];
  
  // Loading states
  isLoading = true;
  isLoadingPending = false;
  isLoadingConfirmed = false;
  isLoadingHistory = false;
  
  // Error handling
  errorMessage = '';
  successMessage = '';
  
  // Current user
  currentUser: any = null;
  
  // Rejection modal
  isRejectionModalOpen = false;
  gameToReject: BasketballGame | null = null;

  // Create game modal
  isCreateGameModalOpen = false;

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
    private authService: AuthService
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
    return this.currentUser?.role === 'Admin';
  }

  // Open create game modal
  openCreateGameModal() {
    this.isCreateGameModalOpen = true;
  }

  // Close create game modal
  closeCreateGameModal() {
    this.isCreateGameModalOpen = false;
  }

  // Handle game creation success
  onGameCreated(newGame: BasketballGame) {
    this.showSuccess('Utakmica je uspješno kreirana i nominacije su poslane!');
    this.loadMyGames(); // Refresh the games list
  }

  loadMyGames() {
    this.isLoading = true;
    
    if (this.isAdmin()) {
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
    
    if (this.isAdmin()) {
      // For admin, show upcoming games and history only
      this.pendingGames = games.filter(game => {
        const gameDate = new Date(game.date);
        return gameDate >= now; // All upcoming games regardless of status
      });

      this.confirmedGames = []; // Admin doesn't see confirmed games section

      this.gameHistory = games.filter(game => {
        const gameDate = new Date(game.date);
        return gameDate < now; // All past games
      });

      console.log('Admin games categorized:', {
        pending: this.pendingGames.length,
        history: this.gameHistory.length
      });
    } else {
      // For referees, show only their assigned games
      this.pendingGames = games.filter(game => {
        const myAssignment = this.getMyAssignment(game);
        return myAssignment?.assignmentStatus === 'Pending';
      });

      this.confirmedGames = games.filter(game => {
        const myAssignment = this.getMyAssignment(game);
        const gameDate = new Date(game.date);
        return myAssignment?.assignmentStatus === 'Accepted' && gameDate >= now;
      });

      this.gameHistory = games.filter(game => {
        const myAssignment = this.getMyAssignment(game);
        const gameDate = new Date(game.date);
        return (myAssignment?.assignmentStatus === 'Accepted' && gameDate < now) ||
               myAssignment?.assignmentStatus === 'Rejected';
      });

      console.log('Referee games categorized:', {
        pending: this.pendingGames.length,
        confirmed: this.confirmedGames.length,
        history: this.gameHistory.length
      });
    }
  }

  getMyAssignment(game: BasketballGame): RefereeAssignment | undefined {
    if (!this.currentUser) return undefined;
    return game.refereeAssignments.find(
      assignment => assignment.userId._id === this.currentUser._id
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
        const action = response === 'Accepted' ? 'prihvaćena' : 'odbijena';
        this.showSuccess(`Nominacija je uspješno ${action}!`);
        
        // If rejected, remove the game from pending games array
        if (response === 'Rejected') {
          this.pendingGames = this.pendingGames.filter(game => game._id !== gameId);
          this.closeRejectionModal(); // Close the rejection modal
        } else {
          // If accepted, move from pending to confirmed
          const gameIndex = this.pendingGames.findIndex(game => game._id === gameId);
          if (gameIndex !== -1) {
            const updatedGameData = { ...this.pendingGames[gameIndex] };
            // Update the assignment status in the local data
            const myAssignment = updatedGameData.refereeAssignments.find(
              assignment => assignment.userId._id === this.currentUser?._id
            );
            if (myAssignment) {
              myAssignment.assignmentStatus = 'Accepted';
              myAssignment.respondedAt = new Date().toISOString();
            }
            
            // Remove from pending and add to confirmed
            this.pendingGames.splice(gameIndex, 1);
            this.confirmedGames.unshift(updatedGameData);
          }
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
    if (this.isAdmin()) {
      return 'Administrator';
    }

    const myAssignment = this.getMyAssignment(game);
    if (!myAssignment) return '';
    
    const roleTranslation = {
      'Sudac': 'Sudac',
      'Delegat': 'Delegat', 
      'Pomoćni Sudac': 'Pomoćni Sudac'
    };
    
    return `${roleTranslation[myAssignment.role]} ${myAssignment.position}`;
  }

  getOtherReferees(game: BasketballGame): string {
    if (!this.currentUser) return '';
    
    const otherReferees = game.refereeAssignments
      .filter(assignment => assignment.userId._id !== this.currentUser._id)
      .map(assignment => `${assignment.userId.name} ${assignment.userId.surname} (${assignment.role} ${assignment.position})`)
      .join(', ');
    
    return otherReferees || 'Nema ostalih sudaca';
  }

  // New method to get all referees with their status
  getAllReferees(game: BasketballGame): RefereeGroups {
    const refereeGroups: RefereeGroups = {
      'Sudac': [],
      'Delegat': [],
      'Pomoćni Sudac': []
    };

    game.refereeAssignments.forEach(assignment => {
      // Only show referees with Pending or Accepted status
      if (assignment.assignmentStatus === 'Pending' || assignment.assignmentStatus === 'Accepted') {
        const statusText = assignment.assignmentStatus === 'Pending' ? '(na čekanju)' : '(potvrđeno)';
        const isCurrentUser = assignment.userId._id === this.currentUser?._id;
        let nameDisplay: string;
        
        if (this.isAdmin()) {
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

    // Format Pomoćni Sudac - show for admin or if current user is NOT Sudac or Delegat
    if (refereeGroups['Pomoćni Sudac'].length > 0 && (this.isAdmin() || (myRole !== 'Sudac' && myRole !== 'Delegat'))) {
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
    if (this.isAdmin()) {
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
    if (this.isAdmin()) {
      switch (game.status) {
        case 'Scheduled': return 'status-pending';
        case 'Ongoing': return 'status-accepted';
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

  // Admin action methods
  editGame(game: BasketballGame): void {
    console.log('Edit game:', game);
    // TODO: Implement edit game modal or navigation
    this.showSuccess(`Uređivanje utakmice ${game.homeTeam} vs ${game.awayTeam} - funkcionalnost uskoro!`);
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
}