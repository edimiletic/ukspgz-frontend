import { CommonModule } from '@angular/common';
import { Component, DestroyRef, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { GamesListFilters } from './games-assigned.helpers';

@Component({
  selector: 'app-games-filter-bar',
  standalone: true,
  imports: [CommonModule, ReactiveFormsModule],
  templateUrl: './games-filter-bar.component.html'
})
export class GamesFilterBarComponent implements OnChanges {
  @Input({ required: true }) filterValues!: GamesListFilters;
  @Input() isMobileOpen = false;
  @Output() isMobileOpenChange = new EventEmitter<boolean>();
  @Output() filterChange = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  private readonly destroyRef = inject(DestroyRef);
  private readonly fb = inject(FormBuilder);
  private skipEmit = false;

  readonly form = this.fb.nonNullable.group({
    date: [''],
    venue: [''],
    homeTeam: [''],
    awayTeam: [''],
    competition: ['']
  });

  constructor() {
    this.form.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe((value) => {
      if (this.skipEmit || !this.filterValues) {
        return;
      }
      Object.assign(this.filterValues, value);
      this.filterChange.emit();
    });
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['filterValues'] && this.filterValues) {
      this.skipEmit = true;
      this.form.patchValue(this.filterValues, { emitEvent: false });
      this.skipEmit = false;
    }
  }

  toggleMobile(): void {
    this.isMobileOpenChange.emit(!this.isMobileOpen);
  }
}
