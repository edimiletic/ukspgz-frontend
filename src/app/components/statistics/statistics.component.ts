import { Component, inject, OnInit } from '@angular/core';
import { AbsenceStats, CompetitionStats, ExpenseStats, RefereeStats } from '../../model/statistics.model';
import { AuthService } from '../../services/login.service';
import { UserService } from '../../services/user.service';
import { BasketballGameService } from '../../services/basketballGame.service';
import { AbsenceService } from '../../services/absence.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TravelExpenseService } from '../../services/travel-expense.service';

@Component({
  selector: 'app-statistics',
  imports: [CommonModule, FormsModule],
  templateUrl: './statistics.component.html',
  styleUrl: './statistics.component.scss'
})
export class StatisticsComponent implements OnInit {
  // Current user and auth
  currentUser: any = null;
  isAdmin: boolean = false;

  // Loading states
  isLoading = false;
  isLoadingGames = false;
  isLoadingAbsences = false;
  isLoadingExpenses = false;

  // Filter options
  selectedPeriod: 'month' | 'year' | 'season' | 'custom' = 'month';
  selectedMonth: string = '';
  selectedYear: string = '';
  selectedSeason: string = '';
  startDate: string = '';
  endDate: string = '';
  selectedCompetition: string = '';

  // Available options
  competitions: string[] = [
    'FAVBET PREMIJER LIGA',
    'KUP «K. ĆOSIĆ»',
    'PRVA MUŠKA LIGA',
    'ZAVRŠNI TURNIR ZA POPUNU PRVE MUŠKE LIGE',
    'DRUGE MUŠKE LIGE',
    'TREĆE MUŠKE LIGE',
    'ČETVRTE MUŠKE LIGE',
    'PREMIJER ŽENSKA LIGA',
    'PRVA ŽENSKA LIGA',
    'KUP «R. MEGLAJ-RIMAC»',
    'JUNIORI',
    'JUNIORKE',
    'KADETI',
    'KADETKINJE',
    'MLAĐI KADETI',
    'MLAĐE KADETKINJE',
    'DJEČACI I DJEVOJČICE',
    'NATJECANJE SREDNJIH ŠKOLA',
    'NATJECANJE OSNOVNIH ŠKOLA',
    'Natjecanje MINI KOŠARKA',
    '3X3'
  ];

  months = [
    { value: '01', label: 'Siječanj' },
    { value: '02', label: 'Veljača' },
    { value: '03', label: 'Ožujak' },
    { value: '04', label: 'Travanj' },
    { value: '05', label: 'Svibanj' },
    { value: '06', label: 'Lipanj' },
    { value: '07', label: 'Srpanj' },
    { value: '08', label: 'Kolovoz' },
    { value: '09', label: 'Rujan' },
    { value: '10', label: 'Listopad' },
    { value: '11', label: 'Studeni' },
    { value: '12', label: 'Prosinac' }
  ];

availableReferees: {
  sudci: any[];
  delegati: any[];
  pomocniSudci: any[];
} = {
  sudci: [],
  delegati: [],
  pomocniSudci: []
};

  // Statistics data
  refereeStats: RefereeStats[] = [];
  competitionStats: CompetitionStats[] = [];
  absenceStats: AbsenceStats = {
    totalAbsences: 0,
    totalDays: 0,
    byReferee: {},
    byMonth: {}
  };

  expenseStats: ExpenseStats = {
      totalExpenses: 0,
      totalAmount: 0,
      avgAmountPerExpense: 0,
      byReferee: {},
      byMonth: {},
      byStatus: {},
      byType: {}
  };

  // Summary stats
  totalGamesInPeriod = 0;
  totalRefereesActive = 0;
  mostActiveReferee: any = null;
  mostPopularCompetition: string = '';

private travelExpenseService = inject(TravelExpenseService);


  constructor(
    private authService: AuthService,
    private userService: UserService,
    private basketballGameService: BasketballGameService,
    private absenceService: AbsenceService,
    private router: Router
  ) {}

  ngOnInit() {
    this.checkAdminAccess();
    this.initializeDefaultValues();
    this.loadStatistics();
  }

  checkAdminAccess() {
    this.currentUser = this.authService.currentUserValue;
    this.isAdmin = this.authService.hasRole('Admin');
    
    if (!this.isAdmin) {
      this.router.navigate(['/home']);
      return;
    }
  }

  initializeDefaultValues() {
    const currentDate = new Date();
    this.selectedMonth = String(currentDate.getMonth() + 1).padStart(2, '0');
    this.selectedYear = String(currentDate.getFullYear());
    
    // Set current season (September to August)
    const currentMonth = currentDate.getMonth() + 1;
    const seasonStartYear = currentMonth >= 9 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;
    this.selectedSeason = `${seasonStartYear}/${seasonStartYear + 1}`;
  }
loadStatistics() {
  this.isLoading = true;
  
  // Load game statistics first (which loads referees), then load other stats
  this.loadGameStatistics().then(() => {
    return Promise.all([
      this.loadAbsenceStatistics(),
      this.loadExpenseStatistics() // ← Uncomment this line
    ]);
  }).finally(() => {
    this.isLoading = false;
    this.calculateSummaryStats();
  });
}

async loadGameStatistics() {
  this.isLoadingGames = true;
  try {
    // Get all referees FIRST
    const refereesResponse = await this.userService.getReferees().toPromise();
    const referees = refereesResponse || [];

    // Populate availableReferees for use in other methods
    this.availableReferees = {
      sudci: referees.filter(ref => ref.role === 'Sudac'),
      delegati: referees.filter(ref => ref.role === 'Delegat'),
      pomocniSudci: referees.filter(ref => ref.role === 'Pomoćni Sudac')
    };

    console.log('Loaded referees:', this.availableReferees); // Debug log

    // Get all games with filters
    const filters = this.buildGameFilters();
    const gamesResponse = await this.basketballGameService.getAllGames(filters).toPromise();
    const games = gamesResponse?.games || [];

    this.calculateRefereeStats(games, referees);
    this.calculateCompetitionStats(games);
    this.totalGamesInPeriod = games.length;

  } catch (error) {
    console.error('Error loading game statistics:', error);
    this.refereeStats = [];
    this.competitionStats = [];
    this.totalGamesInPeriod = 0;
    this.totalRefereesActive = 0;
  } finally {
    this.isLoadingGames = false;
  }
}
async loadAbsenceStatistics() {
  this.isLoadingAbsences = true;
  try {
    const absencesResponse = await this.absenceService.getAllAbsences().toPromise();
    const absences = absencesResponse || []; // Fix: Handle undefined
    this.calculateAbsenceStats(absences);
  } catch (error) {
    console.error('Error loading absence statistics:', error);
  } finally {
    this.isLoadingAbsences = false;
  }
}
async loadExpenseStatistics() {
  this.isLoadingExpenses = true;
  console.log('Starting to load expense statistics...');
  
  try {
    // Add null check
    if (!this.travelExpenseService) {
      console.error('TravelExpenseService not available');
      this.expenseStats = {
        totalExpenses: 0,
        totalAmount: 0,
        avgAmountPerExpense: 0,
        byReferee: {},
        byMonth: {},
        byStatus: {},
        byType: {}
      };
      return;
    }

    console.log('Calling getAllTravelExpenses...');
    const expensesResponse = await this.travelExpenseService.getAllTravelExpenses().toPromise();
    const expenses = expensesResponse || [];
    
    console.log('Received expenses:', expenses.length, expenses);
    
    this.calculateExpenseStats(expenses);
    
    console.log('Final expense stats:', this.expenseStats);
    
  } catch (error) {
    console.error('Error loading expense statistics:', error);
    // Set safe default values
    this.expenseStats = {
      totalExpenses: 0,
      totalAmount: 0,
      avgAmountPerExpense: 0,
      byReferee: {},
      byMonth: {},
      byStatus: {},
      byType: {}
    };
  } finally {
    this.isLoadingExpenses = false;
  }
}
  buildGameFilters() {
    const filters: any = {};

    if (this.selectedCompetition) {
      filters.competition = this.selectedCompetition;
    }

    // Add date filters based on selected period
    const dateRange = this.getDateRange();
    if (dateRange.start && dateRange.end) {
      filters.startDate = dateRange.start;
      filters.endDate = dateRange.end;
    }

    return filters;
  }

  getDateRange(): { start: string; end: string } {
    const currentYear = parseInt(this.selectedYear);
    
    switch (this.selectedPeriod) {
      case 'month':
        const month = parseInt(this.selectedMonth);
        return {
          start: `${currentYear}-${this.selectedMonth.padStart(2, '0')}-01`,
          end: `${currentYear}-${this.selectedMonth.padStart(2, '0')}-${new Date(currentYear, month, 0).getDate()}`
        };

      case 'year':
        return {
          start: `${currentYear}-01-01`,
          end: `${currentYear}-12-31`
        };

      case 'season':
        const seasonStartYear = parseInt(this.selectedSeason.split('/')[0]);
        return {
          start: `${seasonStartYear}-09-01`,
          end: `${seasonStartYear + 1}-08-31`
        };

      case 'custom':
        return {
          start: this.startDate,
          end: this.endDate
        };

      default:
        return { start: '', end: '' };
    }
  }

  calculateRefereeStats(games: any[], referees: any[]) {
    const refereesMap = new Map();

    // Initialize referee stats
    referees.forEach(referee => {
      refereesMap.set(referee._id, {
        referee: referee,
        totalGames: 0,
        gamesInPeriod: 0,
        competitions: {},
        roles: {}
      });
    });

    // Count games for each referee
    games.forEach(game => {
      game.refereeAssignments?.forEach((assignment: any) => {
        if (assignment.assignmentStatus === 'Accepted') {
          const refereeId = assignment.userId._id;
          const stats = refereesMap.get(refereeId);
          
          if (stats) {
            stats.gamesInPeriod++;
            
            // Count by competition
            if (!stats.competitions[game.competition]) {
              stats.competitions[game.competition] = 0;
            }
            stats.competitions[game.competition]++;
            
            // Count by role
            if (!stats.roles[assignment.role]) {
              stats.roles[assignment.role] = 0;
            }
            stats.roles[assignment.role]++;
          }
        }
      });
    });

    this.refereeStats = Array.from(refereesMap.values())
      .filter(stats => stats.gamesInPeriod > 0)
      .sort((a, b) => b.gamesInPeriod - a.gamesInPeriod);

    this.totalRefereesActive = this.refereeStats.length;
  }

  calculateCompetitionStats(games: any[]) {
    const competitionMap = new Map();

    games.forEach(game => {
      if (!competitionMap.has(game.competition)) {
        competitionMap.set(game.competition, {
          competition: game.competition,
          totalGames: 0,
          totalReferees: new Set(),
          avgRefereesPerGame: 0
        });
      }

      const stats = competitionMap.get(game.competition);
      stats.totalGames++;

      // Count unique referees
      game.refereeAssignments?.forEach((assignment: any) => {
        if (assignment.assignmentStatus === 'Accepted') {
          stats.totalReferees.add(assignment.userId._id);
        }
      });
    });

    this.competitionStats = Array.from(competitionMap.values())
      .map(stats => ({
        ...stats,
        totalReferees: stats.totalReferees.size,
        avgRefereesPerGame: stats.totalGames > 0 ? 
          (stats.totalReferees.size / stats.totalGames).toFixed(1) : 0
      }))
      .sort((a, b) => b.totalGames - a.totalGames);
  }

calculateAbsenceStats(absences: any[]) {
  console.log('Calculating absence stats, available referees:', this.availableReferees); // Debug log
  
  const dateRange = this.getDateRange();
  let filteredAbsences = absences;

  if (dateRange.start && dateRange.end) {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    filteredAbsences = absences.filter(absence => {
      const absenceStart = new Date(absence.startDate);
      const absenceEnd = new Date(absence.endDate);
      return absenceStart <= endDate && absenceEnd >= startDate;
    });
  }

  this.absenceStats = {
    totalAbsences: filteredAbsences.length,
    totalDays: 0,
    byReferee: {},
    byMonth: {}
  };

  // Create a map of personalCode to referee name for quick lookup
  const refereeMap = new Map();
  
  // Make sure availableReferees is populated
  if (this.availableReferees.sudci) {
    this.availableReferees.sudci.forEach(ref => {
      refereeMap.set(ref.personalCode, `${ref.name} ${ref.surname}`);
    });
  }
  if (this.availableReferees.delegati) {
    this.availableReferees.delegati.forEach(ref => {
      refereeMap.set(ref.personalCode, `${ref.name} ${ref.surname}`);
    });
  }
  if (this.availableReferees.pomocniSudci) {
    this.availableReferees.pomocniSudci.forEach(ref => {
      refereeMap.set(ref.personalCode, `${ref.name} ${ref.surname}`);
    });
  }

  console.log('Referee map:', refereeMap); // Debug log

  filteredAbsences.forEach(absence => {
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    this.absenceStats.totalDays += days;

    // By referee - use name instead of personal code
    const personalCode = absence.userPersonalCode || 'Unknown';
    const refereeName = refereeMap.get(personalCode) || `Unknown (${personalCode})`;
    
    console.log(`Personal code: ${personalCode}, Referee name: ${refereeName}`); // Debug log
    
    if (!this.absenceStats.byReferee[refereeName]) {
      this.absenceStats.byReferee[refereeName] = 0;
    }
    this.absenceStats.byReferee[refereeName] += days;

    // By month
    const month = startDate.toISOString().substring(0, 7); // YYYY-MM
    if (!this.absenceStats.byMonth[month]) {
      this.absenceStats.byMonth[month] = 0;
    }
    this.absenceStats.byMonth[month] += days;
  });
}

 calculateExpenseStats(expenses: any[]) {
  const dateRange = this.getDateRange();
  let filteredExpenses = expenses;

  // Filter expenses by date range if specified
  if (dateRange.start && dateRange.end) {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    
    filteredExpenses = expenses.filter(expense => {
      const expenseDate = new Date(expense.createdAt || expense.dateFrom);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }

  // Initialize stats
  this.expenseStats = {
    totalExpenses: filteredExpenses.length,
    totalAmount: 0,
    avgAmountPerExpense: 0,
    byReferee: {},
    byMonth: {},
    byStatus: {},
    byType: {}
  };

  // Create a map of user IDs to referee names
  const refereeMap = new Map();
  if (this.availableReferees.sudci) {
    this.availableReferees.sudci.forEach(ref => {
      refereeMap.set(ref._id, `${ref.name} ${ref.surname}`);
    });
  }
  if (this.availableReferees.delegati) {
    this.availableReferees.delegati.forEach(ref => {
      refereeMap.set(ref._id, `${ref.name} ${ref.surname}`);
    });
  }
  if (this.availableReferees.pomocniSudci) {
    this.availableReferees.pomocniSudci.forEach(ref => {
      refereeMap.set(ref._id, `${ref.name} ${ref.surname}`);
    });
  }

  filteredExpenses.forEach(expense => {
    // Calculate total amount from expense items
    const expenseAmount = expense.expenses?.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0) || 0;

    this.expenseStats.totalAmount += expenseAmount;

    // By referee
    const userId = expense.userId?._id || expense.userId;
    const refereeName = refereeMap.get(userId) || expense.user?.name || 'Unknown';
    
    if (!this.expenseStats.byReferee[refereeName]) {
      this.expenseStats.byReferee[refereeName] = { count: 0, amount: 0 };
    }
    this.expenseStats.byReferee[refereeName].count++;
    this.expenseStats.byReferee[refereeName].amount += expenseAmount;

    // By month
    const expenseDate = new Date(expense.createdAt || expense.dateFrom);
    const monthKey = expenseDate.toISOString().substring(0, 7); // YYYY-MM
    
    if (!this.expenseStats.byMonth[monthKey]) {
      this.expenseStats.byMonth[monthKey] = { count: 0, amount: 0 };
    }
    this.expenseStats.byMonth[monthKey].count++;
    this.expenseStats.byMonth[monthKey].amount += expenseAmount;

    // By status
    const status = expense.state || 'Unknown';
    if (!this.expenseStats.byStatus[status]) {
      this.expenseStats.byStatus[status] = 0;
    }
    this.expenseStats.byStatus[status]++;

    // By type
    const type = expense.type || 'Unknown';
    if (!this.expenseStats.byType[type]) {
      this.expenseStats.byType[type] = 0;
    }
    this.expenseStats.byType[type]++;
  });

  // Calculate average
  this.expenseStats.avgAmountPerExpense = this.expenseStats.totalExpenses > 0 
    ? this.expenseStats.totalAmount / this.expenseStats.totalExpenses 
    : 0;
}

  calculateSummaryStats() {
    // Most active referee
    if (this.refereeStats.length > 0) {
      this.mostActiveReferee = this.refereeStats[0];
    }

    // Most popular competition
    if (this.competitionStats.length > 0) {
      this.mostPopularCompetition = this.competitionStats[0].competition;
    }
  }

  onPeriodChange() {
    this.loadStatistics();
  }

  onFiltersChange() {
    this.loadStatistics();
  }

  exportStatistics() {
    // Placeholder for export functionality
    console.log('Exporting statistics...');
    alert('Izvoz statistika će biti implementiran u sljedećoj verziji.');
  }

  getObjectKeys(obj: any): string[] {
    return Object.keys(obj);
  }

  getObjectValues(obj: any): any[] {
    return Object.values(obj);
  }
}