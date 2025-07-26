import { BasketballGameService } from './../../services/basketballGame.service';
import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { HeaderComponent } from "../header/header.component";
import { FooterComponent } from "../footer/footer.component";
import { AuthService } from '../../services/login.service';
import { BasketballGame, RefereeAssignment, RefereeGroups, RefereeInfo } from '../../model/basketballGame.model';
import { FormsModule } from '@angular/forms';
import { RejectionModalComponent } from "./rejection-modal/rejection-modal.component";

@Component({
  selector: 'app-games-assigned',
  imports: [HeaderComponent, FooterComponent, CommonModule, FormsModule, RejectionModalComponent],
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

  constructor(
    private basketballGameService: BasketballGameService,
    private authService: AuthService
  ) {}

  ngOnInit() {
    this.getCurrentUser();
    this.loadMyGames();
  }

  getCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        this.currentUser = user;
      },
      error: (error) => {
        console.error('Error getting current user:', error);
      }
    });
  }

  loadMyGames() {
    this.isLoading = true;
    this.basketballGameService.getMyAssignments().subscribe({
      next: (games) => {
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

  categorizeGames(games: BasketballGame[]) {
    const now = new Date();
    
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
        const nameDisplay = isCurrentUser ? 'Vi' : `${assignment.userId.name} ${assignment.userId.surname}`;
        
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

    // Format Pomoćni Sudac - only show if current user is NOT Sudac or Delegat
    if (refereeGroups['Pomoćni Sudac'].length > 0 && myRole !== 'Sudac' && myRole !== 'Delegat') {
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
}