
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
