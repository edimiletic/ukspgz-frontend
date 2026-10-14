import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameFormData } from '../../../model/basketballGame.model';
import { TimeSelectComponent } from '../time-select/time-select.component';
import { VenueSearchComponent } from '../venue-search/venue-search.component';

@Component({
  selector: 'app-game-details-step',
  standalone: true,
  imports: [CommonModule, FormsModule, TimeSelectComponent, VenueSearchComponent],
  templateUrl: './game-details-step.component.html'
})
export class GameDetailsStepComponent {
  @Input({ required: true }) gameForm!: GameFormData;
  @Input() competitions: string[] = [];
  @Input() statusOptions: Array<{ value: string; label: string }> = [];
  @Input() teamOptions: string[] = [];
  @Input() awayTeamOptions: string[] = [];
  @Input() venueOptions: string[] = [];
  @Input() hasTeamCatalog = false;
  @Input() isCreateMode = true;
  @Input() canEditDetails = true;
  @Input() minDate = '';

  @Output() competitionChange = new EventEmitter<void>();
  @Output() dateTimeChange = new EventEmitter<void>();
}
