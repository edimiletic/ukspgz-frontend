import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { GameFormData, NominationRejection, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { formatRejectionWhen } from './edit-game-modal.helpers';

@Component({
  selector: 'app-game-nominations-step',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './game-nominations-step.component.html'
})
export class GameNominationsStepComponent {
  @Input({ required: true }) gameForm!: GameFormData;
  @Input({ required: true }) selectedReferees!: RefereeSelection;
  @Input() availableSudciForIndex: { [key: number]: User[] } = {};
  @Input() availableDelegati: User[] = [];
  @Input() availableKontrolori: User[] = [];
  @Input() unavailableCounts: { sudci: number; delegati: number } = { sudci: 0, delegati: 0 };
  @Input() isLoadingReferees = false;
  @Input() isLoadingAbsences = false;
  @Input() canNominate = false;
  @Input() showKontrolor = false;
  @Input() kontrolorHeading = 'Kontrolor (opcionalno)';
  @Input() rejections: NominationRejection[] = [];

  @Output() selectionChange = new EventEmitter<void>();

  formatWhen = formatRejectionWhen;

  onSudacChange(index: number, event: Event): void {
    this.selectedReferees.sudci[index].userId = (event.target as HTMLSelectElement).value;
    this.selectionChange.emit();
  }

  onDelegatChange(event: Event): void {
    this.selectedReferees.delegat = (event.target as HTMLSelectElement).value;
    this.selectionChange.emit();
  }

  onKontrolorChange(event: Event): void {
    this.selectedReferees.kontrolor = (event.target as HTMLSelectElement).value;
    this.selectionChange.emit();
  }
}
