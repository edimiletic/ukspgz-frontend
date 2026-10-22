import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { GameFormData, NominationRejection, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import { formatRejectionWhen, officialRecordId } from './edit-game-modal.helpers';

@Component({
  selector: 'app-game-nominations-step',
  standalone: true,
  imports: [CommonModule, FormsModule],
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
  officialId = officialRecordId;

  onSudacChange(index: number, userId: string): void {
    this.selectedReferees.sudci[index].userId = userId || '';
    this.selectionChange.emit();
  }

  onDelegatChange(userId: string): void {
    this.selectedReferees.delegat = userId || '';
    this.selectionChange.emit();
  }

  onKontrolorChange(userId: string): void {
    this.selectedReferees.kontrolor = userId || '';
    this.selectionChange.emit();
  }
}
