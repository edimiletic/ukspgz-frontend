import { AbsenceStats, CompetitionStats, ExpenseStats, GradeStats, RefereeStats } from '../../model/statistics.model';
import { ALL_COMPETITIONS, userHasRole } from '../../model/roles';

export type StatisticsPeriod = 'month' | 'year' | 'season' | 'custom';

export interface DateRangeFilters {
  selectedPeriod: StatisticsPeriod;
  selectedMonth: string;
  selectedYear: string;
  selectedSeason: string;
  startDate: string;
  endDate: string;
}

export interface AvailableReferees {
  sudci: any[];
  delegati: any[];
  pomocniSudci: any[];
  kontrolori: any[];
}

export const STATISTICS_COMPETITIONS = ALL_COMPETITIONS;

export const STATISTICS_MONTHS = [
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

export function emptyAvailableReferees(): AvailableReferees {
  return { sudci: [], delegati: [], pomocniSudci: [], kontrolori: [] };
}

export function emptyGradeStats(): GradeStats {
  return {
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
}

export function emptyAbsenceStats(): AbsenceStats {
  return { totalAbsences: 0, totalDays: 0, byReferee: {}, byMonth: {} };
}

export function emptyExpenseStats(): ExpenseStats {
  return {
    totalExpenses: 0,
    totalAmount: 0,
    avgAmountPerExpense: 0,
    byReferee: {},
    byMonth: {},
    byStatus: {},
    byType: {}
  };
}

export function currentSeasonLabel(date = new Date()): string {
  const month = date.getMonth() + 1;
  const startYear = month >= 9 ? date.getFullYear() : date.getFullYear() - 1;
  return `${startYear}/${startYear + 1}`;
}

export function getDateRange(filters: DateRangeFilters): { start: string; end: string } {
  const currentYear = parseInt(filters.selectedYear, 10);

  switch (filters.selectedPeriod) {
    case 'month': {
      const month = parseInt(filters.selectedMonth, 10);
      return {
        start: `${currentYear}-${filters.selectedMonth.padStart(2, '0')}-01`,
        end: `${currentYear}-${filters.selectedMonth.padStart(2, '0')}-${new Date(currentYear, month, 0).getDate()}`
      };
    }
    case 'year':
      return { start: `${currentYear}-01-01`, end: `${currentYear}-12-31` };
    case 'season': {
      const seasonStartYear = parseInt(filters.selectedSeason.split('/')[0], 10);
      return { start: `${seasonStartYear}-09-01`, end: `${seasonStartYear + 1}-08-31` };
    }
    case 'custom':
      return { start: filters.startDate, end: filters.endDate };
    default:
      return { start: '', end: '' };
  }
}

export function refereesForRole(available: AvailableReferees, role: string): any[] {
  switch (role) {
    case 'Sudac':
      return available.sudci || [];
    case 'Delegat':
      return available.delegati || [];
    case 'Pomoćni Sudac':
      return available.pomocniSudci || [];
    case 'Kontrolor':
      return available.kontrolori || [];
    case 'Admin':
      return [
        ...(available.sudci || []),
        ...(available.delegati || []),
        ...(available.pomocniSudci || [])
      ];
    default:
      return [];
  }
}

export function calculateRefereeStats(games: any[], referees: any[], selectedRole: string): RefereeStats[] {
  const refereesMap = new Map<string, RefereeStats>();
  referees.filter(referee => userHasRole(referee, selectedRole)).forEach(referee => {
    refereesMap.set(referee._id, {
      referee,
      totalGames: 0,
      gamesInPeriod: 0,
      competitions: {},
      roles: {}
    });
  });

  games.forEach(game => {
    game.refereeAssignments?.forEach((assignment: any) => {
      if (assignment.assignmentStatus !== 'Accepted') {
        return;
      }
      if (selectedRole !== 'Admin' && assignment.role !== selectedRole) {
        return;
      }
      const stats = refereesMap.get(assignment.userId._id);
      if (!stats) {
        return;
      }
      stats.gamesInPeriod++;
      stats.totalGames++;
      stats.competitions[game.competition] = (stats.competitions[game.competition] || 0) + 1;
      stats.roles[assignment.role] = (stats.roles[assignment.role] || 0) + 1;
    });
  });

  return Array.from(refereesMap.values())
    .filter(stats => stats.gamesInPeriod > 0)
    .sort((a, b) => b.gamesInPeriod - a.gamesInPeriod);
}

export function calculateCompetitionStats(games: any[], selectedRole: string): CompetitionStats[] {
  const competitionMap = new Map<string, { competition: string; totalGames: number; totalReferees: Set<string> }>();

  games.forEach(game => {
    if (!competitionMap.has(game.competition)) {
      competitionMap.set(game.competition, {
        competition: game.competition,
        totalGames: 0,
        totalReferees: new Set()
      });
    }
    const stats = competitionMap.get(game.competition)!;
    stats.totalGames++;
    game.refereeAssignments?.forEach((assignment: any) => {
      if (assignment.assignmentStatus !== 'Accepted') {
        return;
      }
      if (selectedRole === 'Admin' || assignment.role === selectedRole) {
        stats.totalReferees.add(assignment.userId._id);
      }
    });
  });

  return Array.from(competitionMap.values())
    .map(stats => ({
      competition: stats.competition,
      totalGames: stats.totalGames,
      totalReferees: stats.totalReferees.size,
      avgRefereesPerGame: stats.totalGames > 0 ? stats.totalReferees.size / stats.totalGames : 0
    }))
    .sort((a, b) => b.totalGames - a.totalGames);
}

export function calculateAbsenceStats(
  absences: any[],
  available: AvailableReferees,
  selectedRole: string,
  dateRange: { start: string; end: string }
): AbsenceStats {
  let filtered = absences;
  if (dateRange.start && dateRange.end) {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    filtered = absences.filter(absence => {
      const absenceStart = new Date(absence.startDate);
      const absenceEnd = new Date(absence.endDate);
      return absenceStart <= endDate && absenceEnd >= startDate;
    });
  }

  const stats = emptyAbsenceStats();
  const refereeMap = new Map<string, string>();
  refereesForRole(available, selectedRole).forEach(ref => {
    refereeMap.set(ref.personalCode, `${ref.name} ${ref.surname}`);
  });

  const roleFiltered = filtered.filter(absence => refereeMap.has(absence.userPersonalCode));
  stats.totalAbsences = roleFiltered.length;

  roleFiltered.forEach(absence => {
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);
    const days = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24)) + 1;
    stats.totalDays += days;
    const refereeName = refereeMap.get(absence.userPersonalCode) || `Unknown (${absence.userPersonalCode})`;
    stats.byReferee[refereeName] = (stats.byReferee[refereeName] || 0) + days;
    const month = startDate.toISOString().substring(0, 7);
    stats.byMonth[month] = (stats.byMonth[month] || 0) + days;
  });

  return stats;
}

export function calculateExpenseStats(
  expenses: any[],
  available: AvailableReferees,
  selectedRole: string,
  dateRange: { start: string; end: string }
): ExpenseStats {
  let filtered = expenses;
  if (dateRange.start && dateRange.end) {
    const startDate = new Date(dateRange.start);
    const endDate = new Date(dateRange.end);
    filtered = expenses.filter(expense => {
      const expenseDate = new Date(expense.createdAt || expense.dateFrom);
      return expenseDate >= startDate && expenseDate <= endDate;
    });
  }

  const refereeMap = new Map<string, string>();
  refereesForRole(available, selectedRole).forEach(ref => {
    refereeMap.set(ref._id, `${ref.name} ${ref.surname}`);
  });

  const roleFiltered = filtered.filter(expense => {
    const userId = expense.userId?._id || expense.userId;
    return refereeMap.has(userId);
  });

  const stats = emptyExpenseStats();
  stats.totalExpenses = roleFiltered.length;

  roleFiltered.forEach(expense => {
    const expenseAmount = expense.expenses?.reduce((sum: number, item: any) => {
      return sum + (parseFloat(item.amount) || 0);
    }, 0) || 0;
    stats.totalAmount += expenseAmount;

    const userId = expense.userId?._id || expense.userId;
    const refereeName = refereeMap.get(userId) || expense.user?.name || 'Unknown';
    if (!stats.byReferee[refereeName]) {
      stats.byReferee[refereeName] = { count: 0, amount: 0 };
    }
    stats.byReferee[refereeName].count++;
    stats.byReferee[refereeName].amount += expenseAmount;

    const monthKey = new Date(expense.createdAt || expense.dateFrom).toISOString().substring(0, 7);
    if (!stats.byMonth[monthKey]) {
      stats.byMonth[monthKey] = { count: 0, amount: 0 };
    }
    stats.byMonth[monthKey].count++;
    stats.byMonth[monthKey].amount += expenseAmount;

    const status = expense.state || 'Unknown';
    stats.byStatus[status] = (stats.byStatus[status] || 0) + 1;
    const type = expense.type || 'Unknown';
    stats.byType[type] = (stats.byType[type] || 0) + 1;
  });

  stats.avgAmountPerExpense = stats.totalExpenses > 0 ? stats.totalAmount / stats.totalExpenses : 0;
  return stats;
}

export function processKontrolaData(kontrolaData: any[], selectedRole: string): GradeStats {
  const gradeValues: { [key: string]: number } = {
    Izvrsno: 5,
    'Iznad Prosjeka': 4,
    Prosječno: 3,
    'Ispod Prosjeka': 2,
    Loše: 1
  };

  const stats = emptyGradeStats();
  Object.keys(gradeValues).forEach(grade => {
    stats.gradeDistribution[grade] = 0;
  });

  const tempRefereeData: any = {};
  const categories = ['ocjena', 'pogreske', 'prekrsaji', 'tehnikaMehanika', 'timskiRad', 'kontrolaUtakmice'];

  kontrolaData.forEach(kontrola => {
    if (!kontrola.refereeGrades) {
      return;
    }
    kontrola.refereeGrades.forEach((grade: any) => {
      if (selectedRole !== 'Admin' && grade.refereeRole !== selectedRole) {
        return;
      }
      const refereeKey = grade.refereeName;
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
      categories.forEach(category => {
        const gradeText: string = grade[category];
        if (gradeText && typeof gradeText === 'string' && gradeValues[gradeText] != null) {
          const gradeValue = gradeValues[gradeText];
          tempRef.gradeSums[category] += gradeValue;
          tempRef.totalSum += gradeValue;
          tempRef.totalCount++;
          stats.byCategory[category] += gradeValue;
          stats.gradeDistribution[gradeText] = (stats.gradeDistribution[gradeText] || 0) + 1;
        }
      });
    });
  });

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
      trend: 'stable'
    };
  });

  const totalGradeSum = Object.values(tempRefereeData).reduce((sum: number, ref: any) => sum + ref.totalSum, 0);
  const totalGradeCount = Object.values(tempRefereeData).reduce((sum: number, ref: any) => sum + ref.totalCount, 0);
  stats.averageGrade = totalGradeCount > 0 ? totalGradeSum / totalGradeCount : 0;
  Object.keys(stats.byCategory).forEach(category => {
    stats.byCategory[category] = stats.totalEvaluations > 0
      ? stats.byCategory[category] / stats.totalEvaluations
      : 0;
  });

  return stats;
}

export function objectKeys(obj: object): string[] {
  return Object.keys(obj || {});
}

export function objectValues(obj: object): any[] {
  return Object.values(obj || {});
}

export function getGradeClass(average: number): string {
  if (average >= 4.5) return 'excellent';
  if (average >= 4.0) return 'above-average';
  if (average >= 3.0) return 'average';
  if (average >= 2.0) return 'below-average';
  return 'poor';
}

export function getGradeText(average: number): string {
  if (average >= 4.5) return 'Izvrsno';
  if (average >= 4.0) return 'Iznad Prosjeka';
  if (average >= 3.0) return 'Prosječno';
  if (average >= 2.0) return 'Ispod Prosjeka';
  return 'Loše';
}

export function getRankClass(position: number): string {
  if (position === 1) return 'gold';
  if (position === 2) return 'silver';
  if (position === 3) return 'bronze';
  return '';
}

export function categoryLabel(category: string): string {
  switch (category) {
    case 'ocjena': return 'Ukupna Ocjena';
    case 'pogreske': return 'Pogreške';
    case 'prekrsaji': return 'Prekršaji';
    case 'tehnikaMehanika': return 'Tehnika/Mehanika';
    case 'timskiRad': return 'Timski Rad';
    case 'kontrolaUtakmice': return 'Kontrola Utakmice';
    default: return category;
  }
}

export function rolePeopleLabel(role: string): string {
  switch (role) {
    case 'Sudac': return 'sudaca';
    case 'Delegat': return 'delegata';
    case 'Pomoćni Sudac': return 'pomoćnih sudaca';
    case 'Admin': return 'admina';
    default: return 'korisnika';
  }
}
