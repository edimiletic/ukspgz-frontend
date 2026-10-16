import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { GameFormData } from '../../../model/basketballGame.model';
import { TimeSelectComponent } from '../time-select/time-select.component';
import { VenueSearchComponent } from '../venue-search/venue-search.component';

@Component({
  selector: 'app-game-details-step',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule, TimeSelectComponent, VenueSearchComponent],
  templateUrl: './game-details-step.component.html'
})
export class GameDetailsStepComponent implements OnChanges {
  @Input({ required: true }) gameForm!: GameFormData;
  @Input() competitions: string[] = [];
  @Input() statusOptions: Array<{ value: string; label: string }> = [];
  @Input() teamOptions: string[] = [];
  @Input() awayTeamOptions: string[] = [];
  @Input() venueOptions: string[] = [];
  @Input() hasTeamCatalog = false;
  @Input() teamsLocked = false;
  @Input() isCreateMode = true;
  @Input() canEditDetails = true;
  @Input() minDate = '';

  @Output() competitionChange = new EventEmitter<void>();
  @Output() dateTimeChange = new EventEmitter<void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private skipEmit = false;

  readonly form = this.fb.nonNullable.group({
    competition: [''],
    status: ['Scheduled'],
    homeTeam: [''],
    awayTeam: [''],
    date: [''],
    time: [''],
    venue: [''],
    notes: ['']
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      if (this.skipEmit || !this.gameForm) {
        return;
      }
      const value = this.form.getRawValue();
      const previousCompetition = this.gameForm.competition;
      const previousDate = this.gameForm.date;
      const previousTime = this.gameForm.time;
      Object.assign(this.gameForm, value);
      if (value.competition !== previousCompetition) {
        this.competitionChange.emit();
      }
      if (value.date !== previousDate || value.time !== previousTime) {
        this.dateTimeChange.emit();
      }
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (!this.gameForm) {
      return;
    }

    const modelChanged = !!(changes['gameForm'] || changes['isCreateMode']);
    if (modelChanged) {
      this.skipEmit = true;
      this.form.patchValue({
        competition: this.gameForm.competition,
        status: this.gameForm.status,
        homeTeam: this.gameForm.homeTeam,
        awayTeam: this.gameForm.awayTeam,
        date: this.gameForm.date,
        time: this.gameForm.time,
        venue: this.gameForm.venue,
        notes: this.gameForm.notes
      }, { emitEvent: false });
      this.skipEmit = false;
    }

    this.syncDisabledState();
  }

  private syncDisabledState(): void {
    if (!this.canEditDetails) {
      this.form.disable({ emitEvent: false });
      return;
    }

    this.form.enable({ emitEvent: false });
    if (this.teamsLocked) {
      this.form.controls.homeTeam.disable({ emitEvent: false });
      this.form.controls.awayTeam.disable({ emitEvent: false });
    }
  }
}
