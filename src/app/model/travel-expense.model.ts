export interface TravelExpenseFile {
  originalName: string;
  mimeType?: string;
  size: number;
}

export interface TravelExpenseGame {
  _id: string;
  homeTeam: string;
  awayTeam: string;
  date: string;
  time: string;
  venue: string;
  competition: string;
  assignmentRole?: string;
}

export interface TravelExpense {
  id: string;
  _id?: string;
  displayId?: number;
  userId?: string | { _id?: string; id?: string; name?: string; surname?: string };
  userName?: string;
  userSurname?: string;
  gameId?: string | TravelExpenseGame;
  assignmentRole?: string;
  usedHighway: boolean;
  nalogFile?: TravelExpenseFile | null;
  fuelReceiptFile?: TravelExpenseFile | null;
  tollReceiptFile?: TravelExpenseFile | null;
  state: string;
  createdAt?: string;
  updatedAt?: string;
  submittedAt?: string;
  reviewedAt?: string;
  reviewedBy?: string | { name?: string; surname?: string };
  reviewComments?: string;
}

export interface EligibleTravelGame extends TravelExpenseGame {
  assignmentRole: string;
}

export interface TravelExpenseFilters {
  id?: number;
  assignmentRole?: string;
  userName?: string;
  state?: string;
}

export function travelExpenseId(expense: Pick<TravelExpense, 'id' | '_id'> | null | undefined): string {
  if (!expense) return '';
  return String(expense.id || expense._id || '');
}

export function travelExpenseGame(expense: TravelExpense | null | undefined): TravelExpenseGame | null {
  const game = expense?.gameId;
  if (!game || typeof game === 'string') {
    return null;
  }
  return game;
}

export function travelExpensePersonName(expense: TravelExpense | null | undefined): string {
  if (!expense) return '';
  const fromFields = `${expense.userName || ''} ${expense.userSurname || ''}`.trim();
  if (fromFields) return fromFields;
  const user = expense.userId;
  if (user && typeof user === 'object') {
    return `${user.name || ''} ${user.surname || ''}`.trim();
  }
  return '';
}

export const CROATIAN_MONTHS = [
  'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
  'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'
];

export function travelExpenseGameLabel(expense: TravelExpense | null | undefined): string {
  const game = travelExpenseGame(expense);
  if (!game) {
    return expense?.assignmentRole || '';
  }
  const date = game.date ? new Date(game.date).toLocaleDateString('hr-HR') : '';
  const time = game.time ? ` ${game.time}` : '';
  return `${date}${time} — ${game.homeTeam} vs ${game.awayTeam}`;
}

export function travelExpenseGameYear(expense: TravelExpense | null | undefined): string {
  const game = travelExpenseGame(expense);
  if (!game?.date) return '';
  return String(new Date(game.date).getFullYear());
}

export function travelExpenseGameMonth(expense: TravelExpense | null | undefined): string {
  const game = travelExpenseGame(expense);
  if (!game?.date) return '';
  return CROATIAN_MONTHS[new Date(game.date).getMonth()] || '';
}
