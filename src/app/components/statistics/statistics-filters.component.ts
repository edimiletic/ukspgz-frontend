import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { GameAssignmentRole } from '../../model/roles';
import { STATISTICS_COMPETITIONS, STATISTICS_MONTHS, STATISTICS_SEASONS, StatisticsPeriod } from './statistics.helpers';

@Component({
  selector: 'app-statistics-filters',
  imports: [CommonModule, FormsModule],
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
