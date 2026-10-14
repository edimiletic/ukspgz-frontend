import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { BasketballGame } from '../../model/basketballGame.model';
import {
  formatGameDate,
  gameStatusClass,
  gameStatusDisplay,
  refereesFormatted,
  teamsDisplay
} from './games-assigned.helpers';

@Component({
  selector: 'app-games-list-section',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './games-list-section.component.html'
})
export class GamesListSectionComponent {
  @Input() title = '';
  @Input() titleTag: 'h2' | 'h3' = 'h2';
  @Input() emptyMessage = '';
  @Input() games: BasketballGame[] = [];
  @Input() displayedGames: BasketballGame[] = [];
  @Input() page = 1;
  @Input() totalPages = 1;
  @Input() pageNumbers: number[] = [];
  @Input() seeAllGames = false;
  @Input() userId = '';
  @Input() showOfficialActions = false;
  @Input() showStatus = false;
  @Input() showOverviewActions = false;
  @Input() showHistoryAdminActions = false;
  @Input() isResponding = false;
  @Input() canEdit: (game: BasketballGame) => boolean = () => false;
  @Input() canDelete: (game: BasketballGame) => boolean = () => false;

  @Output() pageChange = new EventEmitter<number>();
  @Output() accept = new EventEmitter<string>();
  @Output() reject = new EventEmitter<string>();
  @Output() edit = new EventEmitter<BasketballGame>();
  @Output() remove = new EventEmitter<BasketballGame>();

  formatDate = formatGameDate;
  teamsDisplay = teamsDisplay;

  trackByGameId(_index: number, game: BasketballGame): string {
    return game._id;
  }

  referees(game: BasketballGame) {
    return refereesFormatted(game, { seeAllGames: this.seeAllGames, userId: this.userId });
  }

  statusLabel(game: BasketballGame): string {
    return gameStatusDisplay(game, { seeAllGames: this.seeAllGames, userId: this.userId });
  }

  statusClass(game: BasketballGame): string {
    return gameStatusClass(game, { seeAllGames: this.seeAllGames, userId: this.userId });
  }
}
