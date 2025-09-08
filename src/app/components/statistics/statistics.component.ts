import { Component, HostListener, inject, OnInit } from '@angular/core';
import { AbsenceStats, CompetitionStats, ExpenseStats, GradeStats, RefereeStats } from '../../model/statistics.model';
import { AuthService } from '../../services/login.service';
import { UserService } from '../../services/user.service';
import { BasketballGameService } from '../../services/basketballGame.service';
import { AbsenceService } from '../../services/absence.service';
import { Router } from '@angular/router';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { HeaderComponent } from "../header/header.component";
import { KontrolaService } from '../../services/kontrola.service';
import { FooterComponent } from "../footer/footer.component";
import { SidebarComponent } from '../sidebar/sidebar.component';

@Component({
  selector: 'app-statistics',
  imports: [CommonModule, FormsModule, HeaderComponent, FooterComponent, SidebarComponent],
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
  isLoadingGrades = false;


  selectedRole: string = 'Sudac'; // Default to 'Sudac'
selectedAbsenceRole: string = 'Sudac'; // Default to 'Sudac'

// Add these properties with your other component properties
showAllAbsences = false;
showAllExpenses = false;
showAllReferees = false; // Add this
showAllCompetitions = false; // Add this
showAllGrades = false;


  isMobileFiltersOpen: boolean = false;


gradeStats: GradeStats = {
  totalEvaluations: 0,
  averageGrade: 0,
  gradeDistribution: {},
  byReferee: {},
  byCategory: {
    ocjena: 0,
    pogreske: 0,
    prekrsaji: 0,
    tehnikaMehanika: 0,
    timskiRad: 0,
    kontrolaUtakmice: 0
  }};

  // Filter options
selectedPeriod: 'month' | 'year' | 'season' | 'custom' = 'custom';
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
    private router: Router,
    private kontrolaService: KontrolaService
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
      this.loadExpenseStatistics(), // ← Uncomment this line
      this.loadGradeStatistics()
    ]);
  }).finally(() => {
    this.isLoading = false;
    this.calculateSummaryStats();
  });
}


async loadGradeStatistics() {
  this.isLoadingGrades = true;
  console.log('Starting to load grade statistics...');
  
  try {
    // Build filters for the request
    const filters: any = {};
    
    // Add date filters based on selected period
    const dateRange = this.getDateRange();
    if (dateRange.start && dateRange.end) {
      filters.startDate = dateRange.start;
      filters.endDate = dateRange.end;
      console.log('Added date filter:', dateRange);
    }
    
    // Add competition filter
    if (this.selectedCompetition) {
      filters.competition = this.selectedCompetition;
      console.log('Added competition filter:', this.selectedCompetition);
    }
    
    // Add role filter
    filters.role = this.selectedRole;
    console.log('Added role filter:', this.selectedRole);
    
    console.log('Final filters for kontrola request:', filters);
    
    // Get kontrola data from backend
    const kontrolaData = await this.kontrolaService.getAllKontrolaForStatistics(filters).toPromise();
    
    console.log('Received kontrola data:', kontrolaData?.length || 0, 'records');
    
    // Process the data (this will further filter by role on frontend)
    this.processKontrolaData(kontrolaData || []);
    
    console.log('Final grade stats:', this.gradeStats);
    
  } catch (error) {
    console.error('Error loading grade statistics:', error);
    // Set safe default values
    this.gradeStats = {
      totalEvaluations: 0,
      averageGrade: 0,
      gradeDistribution: {},
      byReferee: {},
      byCategory: {
        ocjena: 0,
        pogreske: 0,
        prekrsaji: 0,
        tehnikaMehanika: 0,
        timskiRad: 0,
        kontrolaUtakmice: 0
      }
    };
  } finally {
    this.isLoadingGrades = false;
  }
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
  let result = { start: '', end: '' };
  
  switch (this.selectedPeriod) {
    case 'month':
      const month = parseInt(this.selectedMonth);
      result = {
        start: `${currentYear}-${this.selectedMonth.padStart(2, '0')}-01`,
        end: `${currentYear}-${this.selectedMonth.padStart(2, '0')}-${new Date(currentYear, month, 0).getDate()}`
      };
      break;

    case 'year':
      result = {
        start: `${currentYear}-01-01`,
        end: `${currentYear}-12-31`
      };
      break;

    case 'season':
      const seasonStartYear = parseInt(this.selectedSeason.split('/')[0]);
      result = {
        start: `${seasonStartYear}-09-01`,
        end: `${seasonStartYear + 1}-08-31`
      };
      break;

    case 'custom':
      result = {
        start: this.startDate,
        end: this.endDate
      };
      break;
  }
  
  console.log('Date range calculated:', result, 'for period:', this.selectedPeriod); // Debug log
  return result;
}

calculateRefereeStats(games: any[], referees: any[]) {
  const refereesMap = new Map();

  // Filter referees by selected role
  const filteredReferees = referees.filter(referee => referee.role === this.selectedRole);

  // Initialize referee stats for filtered referees only
  filteredReferees.forEach(referee => {
    refereesMap.set(referee._id, {
      referee: referee,
      totalGames: 0,
      gamesInPeriod: 0,
      competitions: {},
      roles: {}
    });
  });

  // Rest of the method remains the same...
  games.forEach(game => {
    game.refereeAssignments?.forEach((assignment: any) => {
      if (assignment.assignmentStatus === 'Accepted') {
        const refereeId = assignment.userId._id;
        const stats = refereesMap.get(refereeId);
        
        if (stats) {
          stats.gamesInPeriod++;
          
          if (!stats.competitions[game.competition]) {
            stats.competitions[game.competition] = 0;
          }
          stats.competitions[game.competition]++;
          
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

    // Count unique referees of the selected role only
    game.refereeAssignments?.forEach((assignment: any) => {
      if (assignment.assignmentStatus === 'Accepted') {
        // Check if the referee's role matches the selected role
        // For Admin, count all roles
        if (this.selectedRole === 'Admin' || assignment.role === this.selectedRole) {
          stats.totalReferees.add(assignment.userId._id);
        }
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
  console.log('Calculating absence stats, available referees:', this.availableReferees);
  
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
    totalAbsences: 0,
    totalDays: 0,
    byReferee: {},
    byMonth: {}
  };

  // Create a map of personalCode to referee name for the selected role only
  const refereeMap = new Map();
  
  // Filter referees by the same selected role used for referee stats
  let selectedRoleReferees = [];
  switch(this.selectedRole) {
    case 'Sudac':
      selectedRoleReferees = this.availableReferees.sudci || [];
      break;
    case 'Delegat':
      selectedRoleReferees = this.availableReferees.delegati || [];
      break;
    case 'Pomoćni Sudac':
      selectedRoleReferees = this.availableReferees.pomocniSudci || [];
      break;
    case 'Admin':
      // If Admin is selected, show all referees (or handle as needed)
      selectedRoleReferees = [
        ...(this.availableReferees.sudci || []),
        ...(this.availableReferees.delegati || []),
        ...(this.availableReferees.pomocniSudci || [])
      ];
      break;
  }

  selectedRoleReferees.forEach(ref => {
    refereeMap.set(ref.personalCode, `${ref.name} ${ref.surname}`);
  });

  console.log('Referee map for role', this.selectedRole, ':', refereeMap);

  // Filter absences to only include those from referees with the selected role
  const roleFilteredAbsences = filteredAbsences.filter(absence => {
    return refereeMap.has(absence.userPersonalCode);
  });

  this.absenceStats.totalAbsences = roleFilteredAbsences.length;

  roleFilteredAbsences.forEach(absence => {
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    
    this.absenceStats.totalDays += days;

    const personalCode = absence.userPersonalCode || 'Unknown';
    const refereeName = refereeMap.get(personalCode) || `Unknown (${personalCode})`;
    
    if (!this.absenceStats.byReferee[refereeName]) {
      this.absenceStats.byReferee[refereeName] = 0;
    }
    this.absenceStats.byReferee[refereeName] += days;

    // By month
    const month = startDate.toISOString().substring(0, 7);
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

  // Create a map of user IDs to referee info for the selected role
  const refereeMap = new Map();
  let selectedRoleReferees = [];
  
  switch(this.selectedRole) {
    case 'Sudac':
      selectedRoleReferees = this.availableReferees.sudci || [];
      break;
    case 'Delegat':
      selectedRoleReferees = this.availableReferees.delegati || [];
      break;
    case 'Pomoćni Sudac':
      selectedRoleReferees = this.availableReferees.pomocniSudci || [];
      break;
    case 'Admin':
      // For Admin, include all referees
      selectedRoleReferees = [
        ...(this.availableReferees.sudci || []),
        ...(this.availableReferees.delegati || []),
        ...(this.availableReferees.pomocniSudci || [])
      ];
      break;
  }

  selectedRoleReferees.forEach(ref => {
    refereeMap.set(ref._id, `${ref.name} ${ref.surname}`);
  });

  // Filter expenses to only include those from referees with the selected role
  const roleFilteredExpenses = filteredExpenses.filter(expense => {
    const userId = expense.userId?._id || expense.userId;
    return refereeMap.has(userId);
  });

  // Initialize stats
  this.expenseStats = {
    totalExpenses: roleFilteredExpenses.length,
    totalAmount: 0,
    avgAmountPerExpense: 0,
    byReferee: {},
    byMonth: {},
    byStatus: {},
    byType: {}
  };

  roleFilteredExpenses.forEach(expense => {
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
  // Most active referee from the filtered stats (not all referees)
  if (this.refereeStats.length > 0) {
    this.mostActiveReferee = this.refereeStats[0];
  } else {
    this.mostActiveReferee = null; // Reset if no referees found for selected role
  }

  // Most popular competition
  if (this.competitionStats.length > 0) {
    this.mostPopularCompetition = this.competitionStats[0].competition;
  }
}

  onPeriodChange() {
      console.log('Period changed, reloading all statistics...'); // Debug log
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

onRoleChange() {
  // Reset expanded states when role changes
  this.showAllAbsences = false;
  this.showAllExpenses = false;
  this.showAllReferees = false; // Add this
  this.showAllCompetitions = false; // Add this
  this.showAllGrades= false;

    if (window.innerWidth <= 768) {
      this.isMobileFiltersOpen = false;
    }

  this.loadStatistics();
}

onFiltersChange() {
  // Reset expanded states when filters change
  this.showAllAbsences = false;
  this.showAllExpenses = false;
  this.showAllReferees = false; // Add this
  this.showAllCompetitions = false; // Add this
    this.showAllGrades = false; // Add this line

    if (window.innerWidth <= 768) {
      this.isMobileFiltersOpen = false;
    }

  this.loadStatistics();
}
getSortedAbsenceReferees(): string[] {
  return Object.keys(this.absenceStats.byReferee)
    .sort((a, b) => this.absenceStats.byReferee[b] - this.absenceStats.byReferee[a]);
}

getSortedExpenseReferees(): string[] {
  return Object.keys(this.expenseStats.byReferee)
    .sort((a, b) => this.expenseStats.byReferee[b].amount - this.expenseStats.byReferee[a].amount);
}


clearAllFilters() {
  // Reset all filter values to defaults
  this.selectedPeriod = 'custom';
  this.selectedMonth = String(new Date().getMonth() + 1).padStart(2, '0');
  this.selectedYear = String(new Date().getFullYear());
  
  // Reset season to current season
  const currentDate = new Date();
  const currentMonth = currentDate.getMonth() + 1;
  const seasonStartYear = currentMonth >= 9 ? currentDate.getFullYear() : currentDate.getFullYear() - 1;
  this.selectedSeason = `${seasonStartYear}/${seasonStartYear + 1}`;
  
  // Clear custom date range
  this.startDate = '';
  this.endDate = '';
  
  // Clear competition filter
  this.selectedCompetition = '';
  
  // Reset role to default
  this.selectedRole = 'Sudac';
  
  // Reset expanded states
  this.showAllAbsences = false;
  this.showAllExpenses = false;
  this.showAllReferees = false;
  this.showAllCompetitions = false;
    this.showAllGrades = false; // Add this line

      if (window.innerWidth <= 768) {
      this.isMobileFiltersOpen = false;
    }

  // Reload statistics with cleared filters
  this.loadStatistics();
}

// Replace the problematic section in processKontrolaData with this:
processKontrolaData(kontrolaData: any[]) {
  const gradeValues: { [key: string]: number } = {
    'Izvrsno': 5,
    'Iznad Prosjeka': 4,
    'Prosječno': 3,
    'Ispod Prosjeka': 2,
    'Loše': 1
  };

  const stats: GradeStats = {
    totalEvaluations: 0,
    averageGrade: 0,
    gradeDistribution: {},
    byReferee: {},
    byCategory: {
      ocjena: 0,
      pogreske: 0,
      prekrsaji: 0,
      tehnikaMehanika: 0,
      timskiRad: 0,
      kontrolaUtakmice: 0
    }
  };

  // Initialize grade distribution
  Object.keys(gradeValues).forEach(grade => {
    stats.gradeDistribution[grade] = 0;
  });

  // Temporary storage for calculations
  const tempRefereeData: any = {};

  kontrolaData.forEach(kontrola => {
    if (!kontrola.refereeGrades) return;

    kontrola.refereeGrades.forEach((grade: any) => {
      // Filter by selected role
      if (this.selectedRole !== 'Admin' && grade.refereeRole !== this.selectedRole) {
        return;
      }

      const refereeKey = grade.refereeName;
      
      // Initialize temp data if not exists
      if (!tempRefereeData[refereeKey]) {
        tempRefereeData[refereeKey] = {
          refereeId: grade.refereeId,
          refereeName: grade.refereeName,
          refereeRole: grade.refereeRole,
          evaluationCount: 0,
          gradeSums: {
            ocjena: 0, pogreske: 0, prekrsaji: 0, 
            tehnikaMehanika: 0, timskiRad: 0, kontrolaUtakmice: 0
          },
          totalSum: 0,
          totalCount: 0
        };
      }

      const tempRef = tempRefereeData[refereeKey];
      tempRef.evaluationCount++;
      stats.totalEvaluations++;

      // Process each grade category
      const categories = ['ocjena', 'pogreske', 'prekrsaji', 'tehnikaMehanika', 'timskiRad', 'kontrolaUtakmice'];
      
      categories.forEach(category => {
        const gradeText: string = grade[category];
        
        // Check if gradeText exists and is a valid key
        if (gradeText && typeof gradeText === 'string' && gradeValues.hasOwnProperty(gradeText)) {
          const gradeValue = gradeValues[gradeText];

          tempRef.gradeSums[category] += gradeValue;
          tempRef.totalSum += gradeValue;
          tempRef.totalCount++;

          stats.byCategory[category] += gradeValue;
          
          // Initialize if doesn't exist
          if (!stats.gradeDistribution[gradeText]) {
            stats.gradeDistribution[gradeText] = 0;
          }
          stats.gradeDistribution[gradeText]++;
        }
      });
    });
  });

  // Convert temp data to final format
  Object.keys(tempRefereeData).forEach(refereeKey => {
    const tempRef = tempRefereeData[refereeKey];
    
    stats.byReferee[refereeKey] = {
      refereeId: tempRef.refereeId,
      refereeName: tempRef.refereeName,
      refereeRole: tempRef.refereeRole,
      totalEvaluations: tempRef.evaluationCount,
      averageGrade: tempRef.totalCount > 0 ? tempRef.totalSum / tempRef.totalCount : 0,
      categoryAverages: {
        ocjena: tempRef.evaluationCount > 0 ? tempRef.gradeSums.ocjena / tempRef.evaluationCount : 0,
        pogreske: tempRef.evaluationCount > 0 ? tempRef.gradeSums.pogreske / tempRef.evaluationCount : 0,
        prekrsaji: tempRef.evaluationCount > 0 ? tempRef.gradeSums.prekrsaji / tempRef.evaluationCount : 0,
        tehnikaMehanika: tempRef.evaluationCount > 0 ? tempRef.gradeSums.tehnikaMehanika / tempRef.evaluationCount : 0,
        timskiRad: tempRef.evaluationCount > 0 ? tempRef.gradeSums.timskiRad / tempRef.evaluationCount : 0,
        kontrolaUtakmice: tempRef.evaluationCount > 0 ? tempRef.gradeSums.kontrolaUtakmice / tempRef.evaluationCount : 0
      },
      trend: 'stable' as any
    };
  });

  // Calculate overall averages
  const totalGradeSum = Object.values(tempRefereeData).reduce((sum: number, ref: any) => sum + ref.totalSum, 0);
  const totalGradeCount = Object.values(tempRefereeData).reduce((sum: number, ref: any) => sum + ref.totalCount, 0);
  
  stats.averageGrade = totalGradeCount > 0 ? totalGradeSum / totalGradeCount : 0;

  Object.keys(stats.byCategory).forEach(category => {
    stats.byCategory[category] = stats.totalEvaluations > 0 
      ? stats.byCategory[category] / stats.totalEvaluations 
      : 0;
  });

  this.gradeStats = stats;
}

getSortedGradeReferees(): string[] {
  return Object.keys(this.gradeStats.byReferee)
    .sort((a, b) => {
      const avgA = this.gradeStats.byReferee[a].averageGrade;
      const avgB = this.gradeStats.byReferee[b].averageGrade;
      return avgB - avgA; // Sort descending (highest grade first)
    });
}

// Add these helper methods for category-specific sorting:
getSortedRefereesByCategory(category: string): string[] {
  return Object.keys(this.gradeStats.byReferee)
    .sort((a, b) => {
      const avgA = this.gradeStats.byReferee[a].categoryAverages[category] || 0;
      const avgB = this.gradeStats.byReferee[b].categoryAverages[category] || 0;
      return avgB - avgA; // Sort descending (highest grade first)
    });
}
// Helper method to get grade class for styling
getGradeClass(average: number): string {
  if (average >= 4.5) return 'excellent';
  if (average >= 4.0) return 'above-average';
  if (average >= 3.0) return 'average';
  if (average >= 2.0) return 'below-average';
  return 'poor';
}

// Helper method to get grade text from number
getGradeText(average: number): string {
  if (average >= 4.5) return 'Izvrsno';
  if (average >= 4.0) return 'Iznad Prosjeka';
  if (average >= 3.0) return 'Prosječno';
  if (average >= 2.0) return 'Ispod Prosjeka';
  return 'Loše';
}

// Helper method to get rank class
getRankClass(position: number): string {
  if (position === 1) return 'gold';
  if (position === 2) return 'silver';
  if (position === 3) return 'bronze';
  return '';
}
  toggleMobileFilters(): void {
    this.isMobileFiltersOpen = !this.isMobileFiltersOpen;
  }


    @HostListener('window:resize', ['$event'])
  onResize(event: any): void {
    if (event.target.innerWidth > 768) {
      this.isMobileFiltersOpen = false;
    }
  }
}