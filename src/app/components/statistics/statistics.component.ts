import { Component, HostListener, inject, OnInit, ViewEncapsulation } from '@angular/core';
import { firstValueFrom } from 'rxjs';
import { AbsenceStats, CompetitionStats, ExpenseStats, GradeStats, RefereeStats } from '../../model/statistics.model';
import { AuthService } from '../../services/login.service';
import { UserService } from '../../services/user.service';
import { BasketballGameService } from '../../services/basketballGame.service';
import { AbsenceService } from '../../services/absence.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { KontrolaService } from '../../services/kontrola.service';
import { canViewStatistics, getStatisticsRoles, GameAssignmentRole, userHasRole } from '../../model/roles';
import { StatisticsFiltersComponent } from './statistics-filters.component';
import { StatisticsResultsComponent } from './statistics-results.component';
import {
  AvailableReferees,
  StatisticsPeriod,
  calculateAbsenceStats,
  calculateCompetitionStats,
  calculateExpenseStats,
  calculateRefereeStats,
  currentSeasonLabel,
  emptyAbsenceStats,
  emptyAvailableReferees,
  emptyExpenseStats,
  emptyGradeStats,
  getDateRange,
  processKontrolaData
} from './statistics.helpers';

@Component({
  selector: 'app-statistics',
  imports: [CommonModule, StatisticsFiltersComponent, StatisticsResultsComponent],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss',
  encapsulation: ViewEncapsulation.None
})
export class StatisticsComponent implements OnInit {
  currentUser: any = null;
  statisticsRoles: GameAssignmentRole[] = [];
  isLoading = false;
  isMobileFiltersOpen = false;

  selectedRole = 'Sudac';
  selectedPeriod: StatisticsPeriod = 'custom';
  selectedMonth = '';
  selectedYear = '';
  selectedSeason = '';
  startDate = '';
  endDate = '';
  selectedCompetition = '';

  availableReferees: AvailableReferees = emptyAvailableReferees();
  gradeStats: GradeStats = emptyGradeStats();
  refereeStats: RefereeStats[] = [];
  competitionStats: CompetitionStats[] = [];
  absenceStats: AbsenceStats = emptyAbsenceStats();
  expenseStats: ExpenseStats = emptyExpenseStats();
  totalGamesInPeriod = 0;
  totalRefereesActive = 0;
  mostActiveReferee: RefereeStats | null = null;

  private travelExpenseService = inject(TravelExpenseService);

  constructor(
    private authService: AuthService,
    private userService: UserService,
    private basketballGameService: BasketballGameService,
    private absenceService: AbsenceService,
    private router: Router,
    private kontrolaService: KontrolaService
  ) {}

  ngOnInit() {
    this.checkStatisticsAccess();
    const now = new Date();
    this.selectedMonth = String(now.getMonth() + 1).padStart(2, '0');
    this.selectedYear = String(now.getFullYear());
    this.selectedSeason = currentSeasonLabel(now);
    this.loadStatistics();
  }

  checkStatisticsAccess() {
    this.currentUser = this.authService.currentUserValue;
    this.statisticsRoles = getStatisticsRoles(this.currentUser);
    if (!canViewStatistics(this.currentUser) || !this.statisticsRoles.length) {
      this.router.navigate(['/home']);
      return;
    }
    if (!this.statisticsRoles.includes(this.selectedRole as GameAssignmentRole)) {
      this.selectedRole = this.statisticsRoles[0];
    }
  }

  private dateFilters() {
    return {
      selectedPeriod: this.selectedPeriod,
      selectedMonth: this.selectedMonth,
      selectedYear: this.selectedYear,
      selectedSeason: this.selectedSeason,
      startDate: this.startDate,
      endDate: this.endDate
    };
  }

  loadStatistics() {
    this.isLoading = true;
    this.loadGameStatistics().then(() => Promise.all([
      this.loadAbsenceStatistics(),
      this.loadExpenseStatistics(),
      this.loadGradeStatistics()
    ])).finally(() => {
      this.isLoading = false;
      this.mostActiveReferee = this.refereeStats[0] || null;
    });
  }

  async loadGradeStatistics() {
    try {
      const dateRange = getDateRange(this.dateFilters());
      const filters: any = { role: this.selectedRole };
      if (dateRange.start && dateRange.end) {
        filters.startDate = dateRange.start;
        filters.endDate = dateRange.end;
      }
      if (this.selectedCompetition) {
        filters.competition = this.selectedCompetition;
      }
      const kontrolaData = await firstValueFrom(this.kontrolaService.getAllKontrolaForStatistics(filters));
      this.gradeStats = processKontrolaData(kontrolaData || [], this.selectedRole);
    } catch (error) {
      console.error('Error loading grade statistics:', error);
      this.gradeStats = emptyGradeStats();
    }
  }

  async loadGameStatistics() {
    try {
      const referees = await firstValueFrom(this.userService.getReferees()) || [];
      this.availableReferees = {
        sudci: referees.filter(ref => userHasRole(ref, 'Sudac')),
        delegati: referees.filter(ref => userHasRole(ref, 'Delegat')),
        pomocniSudci: referees.filter(ref => userHasRole(ref, 'Pomoćni Sudac')),
        kontrolori: referees.filter(ref => userHasRole(ref, 'Kontrolor'))
      };

      const filters: any = {};
      if (this.selectedCompetition) {
        filters.competition = this.selectedCompetition;
      }
      const dateRange = getDateRange(this.dateFilters());
      if (dateRange.start && dateRange.end) {
        filters.startDate = dateRange.start;
        filters.endDate = dateRange.end;
      }

      const gamesResponse = await firstValueFrom(this.basketballGameService.getAllGames(filters));
      const games = gamesResponse?.games || [];
      this.refereeStats = calculateRefereeStats(games, referees, this.selectedRole);
      this.competitionStats = calculateCompetitionStats(games, this.selectedRole);
      this.totalGamesInPeriod = games.length;
      this.totalRefereesActive = this.refereeStats.length;
    } catch (error) {
      console.error('Error loading game statistics:', error);
      this.refereeStats = [];
      this.competitionStats = [];
      this.totalGamesInPeriod = 0;
      this.totalRefereesActive = 0;
    }
  }

  async loadAbsenceStatistics() {
    try {
      const absences = await firstValueFrom(this.absenceService.getAllAbsences()) || [];
      this.absenceStats = calculateAbsenceStats(
        absences,
        this.availableReferees,
        this.selectedRole,
        getDateRange(this.dateFilters())
      );
    } catch (error) {
      console.error('Error loading absence statistics:', error);
      this.absenceStats = emptyAbsenceStats();
    }
  }

  async loadExpenseStatistics() {
    try {
      const expenses = await firstValueFrom(this.travelExpenseService.getAllTravelExpenses()) || [];
      this.expenseStats = calculateExpenseStats(
        expenses,
        this.availableReferees,
        this.selectedRole,
        getDateRange(this.dateFilters())
      );
    } catch (error) {
      console.error('Error loading expense statistics:', error);
      this.expenseStats = emptyExpenseStats();
    }
  }

  onRoleChange() {
    if (!this.statisticsRoles.includes(this.selectedRole as GameAssignmentRole)) {
      this.selectedRole = this.statisticsRoles[0] || 'Sudac';
    }
    this.closeMobileFilters();
    this.loadStatistics();
  }

  onPeriodChange() {
    this.loadStatistics();
  }

  onFiltersChange() {
    this.closeMobileFilters();
    this.loadStatistics();
  }

  clearAllFilters() {
    const now = new Date();
    this.selectedPeriod = 'custom';
    this.selectedMonth = String(now.getMonth() + 1).padStart(2, '0');
    this.selectedYear = String(now.getFullYear());
    this.selectedSeason = currentSeasonLabel(now);
    this.startDate = '';
    this.endDate = '';
    this.selectedCompetition = '';
    this.selectedRole = this.statisticsRoles[0] || 'Sudac';
    this.closeMobileFilters();
    this.loadStatistics();
  }

  private closeMobileFilters() {
    if (typeof window !== 'undefined' && window.innerWidth <= 768) {
      this.isMobileFiltersOpen = false;
    }
  }

  @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (event.target.innerWidth > 768) {
      this.isMobileFiltersOpen = false;
    }
  }
}
