import { Absence } from '../../model/absence.model';
import { BasketballGame } from '../../model/basketballGame.model';
import { ExamAttempt } from '../../model/exam.model';
import { TravelExpense } from '../../model/travel-expense.model';
import {
  findMyAssignment,
  isGameInPast,
  isGameUpcoming,
  ownPendingNominations
} from '../games-assigned/games-assigned.helpers';

export function safeDate(dateString: string | undefined, fallback: string | Date = new Date(0)): Date {
  if (!dateString) {
    return new Date(fallback);
  }
  return new Date(dateString);
}

export function countOwnPendingNominations(games: BasketballGame[], userId: string): number {
  return ownPendingNominations(games, userId).length;
}

export function summarizeOfficialGames(
  games: BasketballGame[],
  userId: string,
  now = new Date()
): {
  pendingGames: number;
  pendingNominations: BasketballGame[];
  upcomingGames: number;
  recentGames: BasketballGame[];
} {
  const pendingNominations = ownPendingNominations(games, userId);
  const recentGames = games
    .filter((game) => {
      const assignment = findMyAssignment(game, userId);
      return assignment?.assignmentStatus === 'Accepted' && isGameInPast(game, now);
    })
    .sort((a, b) => safeDate(b.date).getTime() - safeDate(a.date).getTime())
    .slice(0, 3);

  return {
    pendingGames: pendingNominations.length,
    pendingNominations,
    upcomingGames: games.filter((game) => {
      const assignment = findMyAssignment(game, userId);
      return assignment?.assignmentStatus === 'Accepted' && isGameUpcoming(game, now);
    }).length,
    recentGames
  };
}

export function summarizeOverviewGames(
  games: BasketballGame[],
  now = new Date()
): { totalGames: number; upcomingGames: number; completedGames: number; recentGames: BasketballGame[] } {
  return {
    totalGames: games.length,
    upcomingGames: games.filter((game) => isGameUpcoming(game, now)).length,
    completedGames: games.filter((game) => isGameInPast(game, now)).length,
    recentGames: [...games]
      .sort(
        (a, b) =>
          safeDate(b.createdAt || b.date).getTime() - safeDate(a.createdAt || a.date).getTime()
      )
      .slice(0, 5)
  };
}

export function summarizeUserExpenses(expenses: TravelExpense[]): {
  pendingExpenses: number;
  recentExpenses: TravelExpense[];
} {
  return {
    pendingExpenses: expenses.filter((e) => e.state === 'Predano' || e.state === 'Odbijeno').length,
    recentExpenses: [...expenses]
      .sort(
        (a, b) =>
          safeDate(b.updatedAt || b.createdAt).getTime() - safeDate(a.updatedAt || a.createdAt).getTime()
      )
      .slice(0, 3)
  };
}

export function summarizeOverviewExpenses(expenses: TravelExpense[]): {
  totalExpenses: number;
  pendingExpenses: number;
  recentExpenses: TravelExpense[];
} {
  return {
    totalExpenses: expenses.length,
    pendingExpenses: expenses.filter((e) => e.state === 'Predano').length,
    recentExpenses: [...expenses]
      .sort(
        (a, b) =>
          safeDate(b.submittedAt || b.createdAt).getTime() -
          safeDate(a.submittedAt || a.createdAt).getTime()
      )
      .slice(0, 5)
  };
}

export function activeAbsences(absences: Absence[], now = new Date()): Absence[] {
  return absences
    .filter((absence) => {
      const startDate = new Date(absence.startDate);
      const endDate = new Date(absence.endDate);
      return startDate <= now && endDate >= now;
    })
    .sort((a, b) => safeDate(b.createdAt).getTime() - safeDate(a.createdAt).getTime());
}

export function summarizeExamAttempts(attempts: ExamAttempt[]): {
  lastExamScore: number;
  recentExamAttempts: ExamAttempt[];
} {
  if (!attempts.length) {
    return { lastExamScore: 0, recentExamAttempts: [] };
  }
  const sorted = [...attempts].sort(
    (a, b) => safeDate(b.completedAt).getTime() - safeDate(a.completedAt).getTime()
  );
  return {
    lastExamScore: sorted[0].score || 0,
    recentExamAttempts: sorted.slice(0, 2)
  };
}

export function greetingForHour(hour: number): string {
  if (hour < 12) return 'Dobro jutro';
  if (hour < 18) return 'Dobar dan';
  return 'Dobra večer';
}

export function welcomeMessage(options: {
  isAdmin: boolean;
  canManageCalendar: boolean;
  canNominateOfficials: boolean;
  isFieldOfficial: boolean;
}): string {
  if (options.isAdmin) {
    return 'Dobrodošli u administratorski panel. Ovdje možete upravljati svim aspektima sustava.';
  }
  const hats: string[] = [];
  if (options.canManageCalendar) {
    hats.push('dogovarati kalendar natjecanja');
  }
  if (options.canNominateOfficials) {
    hats.push('slati nominacije službenim osobama');
  }
  if (options.isFieldOfficial) {
    hats.push('pratiti svoje utakmice, troškove i ispite');
  }
  if (!hats.length) {
    return 'Dobrodošli u portal.';
  }
  if (hats.length === 1) {
    return `Ovdje možete ${hats[0]}.`;
  }
  const last = hats.pop() as string;
  return `Ovdje možete ${hats.join(', ')} i ${last}.`;
}

export function formatHomeDate(dateString: string | undefined): string {
  if (!dateString) return 'N/A';
  return new Date(dateString).toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function formatAmount(amount: number | undefined | null): string {
  if (amount === undefined || amount === null || isNaN(amount)) {
    return '0,00 €';
  }
  return `${amount.toFixed(2).replace('.', ',')} €`;
}

export function homeGameStatusClass(game: BasketballGame, now = new Date()): string {
  if (isGameUpcoming(game, now)) return 'status-upcoming';
  if (isGameInPast(game, now)) return 'status-completed';
  return 'status-ongoing';
}

export function homeGameStatusText(game: BasketballGame, now = new Date()): string {
  switch (game.status) {
    case 'Completed':
      return 'Završeno';
    case 'Cancelled':
      return 'Otkazano';
    case 'Ongoing':
      return 'U tijeku';
    case 'Scheduled':
    default:
      return isGameUpcoming(game, now) ? 'Nadolazi' : 'Završeno';
  }
}

export function expenseStatusClass(state: string): string {
  switch (state) {
    case 'Skica':
      return 'status-draft';
    case 'Predano':
      return 'status-submitted';
    case 'Potvrđeno':
      return 'status-approved';
    case 'Odbijeno':
      return 'status-rejected';
    default:
      return '';
  }
}
