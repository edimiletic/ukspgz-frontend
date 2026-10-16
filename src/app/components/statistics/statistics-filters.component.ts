import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { GameAssignmentRole } from '../../model/roles';
import { STATISTICS_COMPETITIONS, STATISTICS_MONTHS, STATISTICS_SEASONS, StatisticsPeriod } from './statistics.helpers';

@Component({
  selector: 'app-statistics-filters',
  imports: [CommonModule],
  templateUrl: './statistics-filters.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatisticsFiltersComponent {
  @Input() selectedRole = 'Sudac';
  @Output() selectedRoleChange = new EventEmitter<string>();
  @Input() statisticsRoles: GameAssignmentRole[] = [];
  @Input() selectedPeriod: StatisticsPeriod = 'custom';
  @Output() selectedPeriodChange = new EventEmitter<StatisticsPeriod>();
  @Input() selectedMonth = '';
  @Output() selectedMonthChange = new EventEmitter<string>();
  @Input() selectedYear = '';
  @Output() selectedYearChange = new EventEmitter<string>();
  @Input() selectedSeason = '';
  @Output() selectedSeasonChange = new EventEmitter<string>();
  @Input() startDate = '';
  @Output() startDateChange = new EventEmitter<string>();
  @Input() endDate = '';
  @Output() endDateChange = new EventEmitter<string>();
  @Input() selectedCompetition = '';
  @Output() selectedCompetitionChange = new EventEmitter<string>();
  @Input() isMobileFiltersOpen = false;
  @Output() isMobileFiltersOpenChange = new EventEmitter<boolean>();

  @Output() roleChange = new EventEmitter<void>();
  @Output() periodChange = new EventEmitter<void>();
  @Output() filtersChange = new EventEmitter<void>();
  @Output() clear = new EventEmitter<void>();

  months = STATISTICS_MONTHS;
  seasons = STATISTICS_SEASONS;
  competitions = STATISTICS_COMPETITIONS;

  toggleMobileFilters(): void {
    this.isMobileFiltersOpenChange.emit(!this.isMobileFiltersOpen);
  }

  private fieldValue(event: Event): string {
    return (event.target as HTMLSelectElement | HTMLInputElement).value;
  }

  onRole(event: Event): void {
    this.selectedRoleChange.emit(this.fieldValue(event));
    this.roleChange.emit();
  }

  onPeriod(event: Event): void {
    this.selectedPeriodChange.emit(this.fieldValue(event) as StatisticsPeriod);
    this.periodChange.emit();
  }

  onMonth(event: Event): void {
    this.selectedMonthChange.emit(this.fieldValue(event));
    this.filtersChange.emit();
  }

  onYear(event: Event): void {
    this.selectedYearChange.emit(this.fieldValue(event));
    this.filtersChange.emit();
  }

  onSeason(event: Event): void {
    this.selectedSeasonChange.emit(this.fieldValue(event));
    this.filtersChange.emit();
  }

  onStartDate(event: Event): void {
    this.startDateChange.emit(this.fieldValue(event));
    this.filtersChange.emit();
  }

  onEndDate(event: Event): void {
    this.endDateChange.emit(this.fieldValue(event));
    this.filtersChange.emit();
  }

  onCompetition(event: Event): void {
    this.selectedCompetitionChange.emit(this.fieldValue(event));
    this.filtersChange.emit();
  }

  trackByName(_index: number, value: string): string {
    return value;
  }

  trackByMonth(_index: number, month: { value: string }): string {
    return month.value;
  }

  trackBySeason(_index: number, season: { value: string }): string {
    return season.value;
  }
}
