
export interface RefereeStats {
  referee: any;
  totalGames: number;
  gamesInPeriod: number;
  competitions: { [key: string]: number };
  roles: { [key: string]: number };
}

export interface CompetitionStats {
  competition: string;
  totalGames: number;
  totalReferees: number;
  avgRefereesPerGame: number;
}

export interface AbsenceStats {
  totalAbsences: number;
  totalDays: number;
  byReferee: { [key: string]: number };
  byMonth: { [key: string]: number };
}

export interface ExpenseStats {
  totalExpenses: number;
  totalAmount: number;
  avgAmountPerExpense: number;
  byReferee: { [key: string]: { count: number; amount: number } };
  byMonth: { [key: string]: { count: number; amount: number } };
  byStatus: { [key: string]: number };
  byType: { [key: string]: number };
}

export interface GradeStats {
  totalEvaluations: number;
  averageGrade: number;
  gradeDistribution: { [key: string]: number };
  byReferee: { [key: string]: RefereeGradeData };
byCategory: {
    ocjena: number;
    pogreske: number;
    prekrsaji: number;
    tehnikaMehanika: number;
    timskiRad: number;
    kontrolaUtakmice: number;
    [key: string]: number; // Add this line
  };}

// Update your RefereeGradeData interface in statistics.model.ts
export interface RefereeGradeData {
  refereeId: string;
  refereeName: string;
  refereeRole: string;
  totalEvaluations: number;
  averageGrade: number;
  categoryAverages: {
    ocjena: number;
    pogreske: number;
    prekrsaji: number;
    tehnikaMehanika: number;
    timskiRad: number;
    kontrolaUtakmice: number;
        [key: string]: number; // Add this line

  };
  trend: 'up' | 'down' | 'stable' | 'new';
  // Add these missing properties:
  gradeSums?: {
    ocjena: number;
    pogreske: number;
    prekrsaji: number;
    tehnikaMehanika: number;
    timskiRad: number;
    kontrolaUtakmice: number;
  };
  totalGradeSum?: number;
  gradeCount?: number;
}