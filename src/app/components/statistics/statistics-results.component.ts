import { ChangeDetectionStrategy, Component, Input } from '@angular/core';
import { CommonModule } from '@angular/common';
import { AbsenceStats, CompetitionStats, ExpenseStats, RefereeStats } from '../../model/statistics.model';
import {
  objectKeys,
  objectValues,
  rolePeopleLabel
} from './statistics.helpers';

@Component({
  selector: 'app-statistics-results',
  imports: [CommonModule],
  templateUrl: './statistics-results.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class StatisticsResultsComponent {
  @Input() selectedRole = 'Sudac';
  @Input() totalGamesInPeriod = 0;
  @Input() totalRefereesActive = 0;
  @Input() mostActiveReferee: RefereeStats | null = null;
  @Input() refereeStats: RefereeStats[] = [];
  @Input() competitionStats: CompetitionStats[] = [];
  @Input() absenceStats: AbsenceStats = { totalAbsences: 0, totalDays: 0, byReferee: {}, byMonth: {} };
  @Input() expenseStats: ExpenseStats = {
    totalExpenses: 0, totalAmount: 0, avgAmountPerExpense: 0, byReferee: {}, byMonth: {}, byStatus: {}, byType: {}
  };

  showAllReferees = false;
  showAllCompetitions = false;
  showAllAbsences = false;
  showAllExpenses = false;

  objectKeys = objectKeys;
  objectValues = objectValues;
  rolePeopleLabel = rolePeopleLabel;

  getSortedAbsenceReferees(): string[] {
    return Object.keys(this.absenceStats.byReferee)
      .sort((a, b) => this.absenceStats.byReferee[b] - this.absenceStats.byReferee[a]);
  }

  getSortedExpenseReferees(): string[] {
    return Object.keys(this.expenseStats.byReferee)
      .sort((a, b) => this.expenseStats.byReferee[b].count - this.expenseStats.byReferee[a].count);
  }

  trackByRefereeStat(_index: number, stat: RefereeStats): string {
    return stat.referee?._id || `${stat.referee?.name}-${stat.referee?.surname}`;
  }

  trackByCompetitionStat(_index: number, stat: CompetitionStats): string {
    return stat.competition;
  }

  trackByName(_index: number, name: string): string {
    return name;
  }
}
