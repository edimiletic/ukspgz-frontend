import {
  BasketballGame,
  RefereeAssignment,
  RefereeGroups,
  RefereeInfo
} from '../../model/basketballGame.model';

export interface GamesListFilters {
  id: string;
  homeTeam: string;
  awayTeam: string;
  venue: string;
  competition: string;
  date: string;
}

export const EMPTY_GAME_FILTERS: GamesListFilters = {
  id: '',
  homeTeam: '',
  awayTeam: '',
  venue: '',
  competition: '',
  date: ''
};

export interface CategorizedGames {
  pending: BasketballGame[];
  confirmed: BasketballGame[];
  history: BasketballGame[];
}

export interface PageSlice<T> {
  page: number;
  totalPages: number;
  items: T[];
}

export function gameDateTime(game: Pick<BasketballGame, 'date' | 'time'>): Date {
  const dateTime = new Date(game.date);
  const [hours = '0', minutes = '0'] = (game.time || '00:00').split(':');
  dateTime.setHours(Number(hours) || 0, Number(minutes) || 0, 0, 0);
  return dateTime;
}

export function isGameInPast(game: Pick<BasketballGame, 'date' | 'time'>, now = new Date()): boolean {
  return gameDateTime(game).getTime() < now.getTime();
}

export function isGameUpcoming(game: Pick<BasketballGame, 'date' | 'time'>, now = new Date()): boolean {
  return gameDateTime(game).getTime() >= now.getTime();
}

export function gamesAssignmentUserId(assignment: RefereeAssignment): string {
  const assigned: unknown = assignment?.userId;
  return String(
    typeof assigned === 'string' ? assigned : (assigned as { _id?: string; id?: string })?._id ||
      (assigned as { id?: string })?.id ||
      ''
  );
}

export function findMyAssignment(game: BasketballGame, userId: string): RefereeAssignment | undefined {
  if (!userId) {
    return undefined;
  }
  return game.refereeAssignments.find((assignment) => gamesAssignmentUserId(assignment) === userId);
}

export function ownPendingNominations(games: BasketballGame[], userId: string): BasketballGame[] {
  return games.filter((game) => findMyAssignment(game, userId)?.assignmentStatus === 'Pending');
}

export function nominationDecisionDetails(game: BasketballGame): string[] {
  return [
    `${game.homeTeam} vs ${game.awayTeam}`,
    `${formatGameDate(game.date)} u ${game.time}`,
    game.venue,
    game.competition
  ].filter((line): line is string => Boolean(line));
}

export function categorizeGames(
  games: BasketballGame[],
  options: { seeAllGames: boolean; userId: string; now?: Date }
): CategorizedGames {
  const now = options.now || new Date();
  if (options.seeAllGames) {
    return {
      pending: games.filter((game) => isGameUpcoming(game, now)),
      confirmed: [],
      history: games.filter((game) => isGameInPast(game, now))
    };
  }

  return {
    pending: games.filter((game) => findMyAssignment(game, options.userId)?.assignmentStatus === 'Pending'),
    confirmed: games.filter((game) => {
      const mine = findMyAssignment(game, options.userId);
      return mine?.assignmentStatus === 'Accepted' && isGameUpcoming(game, now);
    }),
    history: games.filter((game) => {
      const mine = findMyAssignment(game, options.userId);
      return (
        (mine?.assignmentStatus === 'Accepted' && isGameInPast(game, now)) ||
        mine?.assignmentStatus === 'Rejected'
      );
    })
  };
}

export function filterGames(games: BasketballGame[], filters: GamesListFilters): BasketballGame[] {
  return games.filter((game) => {
    const displayId = game.displayId != null ? String(game.displayId) : '';
    if (filters.id && !displayId.startsWith(filters.id.trim())) {
      return false;
    }
    if (filters.homeTeam && !game.homeTeam.toLowerCase().startsWith(filters.homeTeam.toLowerCase())) {
      return false;
    }
    if (filters.awayTeam && !game.awayTeam.toLowerCase().startsWith(filters.awayTeam.toLowerCase())) {
      return false;
    }
    if (filters.venue && !game.venue.toLowerCase().startsWith(filters.venue.toLowerCase())) {
      return false;
    }
    if (filters.competition && !game.competition.toLowerCase().startsWith(filters.competition.toLowerCase())) {
      return false;
    }
    if (filters.date) {
      const filterDate = new Date(filters.date);
      const gameDate = new Date(game.date);
      filterDate.setHours(0, 0, 0, 0);
      gameDate.setHours(0, 0, 0, 0);
      if (filterDate.getTime() !== gameDate.getTime()) {
        return false;
      }
    }
    return true;
  });
}

export function hasActiveFilters(filters: GamesListFilters): boolean {
  return !!(
    filters.id ||
    filters.homeTeam ||
    filters.awayTeam ||
    filters.venue ||
    filters.competition ||
    filters.date
  );
}

export function paginate<T>(items: T[], page: number, limit: number): PageSlice<T> {
  const totalPages = Math.ceil(items.length / limit);
  let current = page;
  if (current > totalPages && totalPages > 0) {
    current = totalPages;
  } else if (totalPages === 0) {
    current = 1;
  }
  const startIndex = (current - 1) * limit;
  return {
    page: current,
    totalPages,
    items: items.slice(startIndex, startIndex + limit)
  };
}

export function pageWindow(page: number, totalPages: number): number[] {
  const pages: number[] = [];
  const start = Math.max(1, page - 2);
  const end = Math.min(totalPages, page + 2);
  for (let i = start; i <= end; i++) {
    pages.push(i);
  }
  return pages;
}

export function formatGameDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  });
}

export function teamsDisplay(game: Pick<BasketballGame, 'homeTeam' | 'awayTeam'>): string {
  return `${game.homeTeam} vs ${game.awayTeam}`;
}

export function gameStatusDisplay(
  game: BasketballGame,
  options: { seeAllGames: boolean; userId: string; now?: Date }
): string {
  if (options.seeAllGames) {
    if (game.status === 'Scheduled' && isGameInPast(game, options.now)) {
      return 'Odigrano';
    }
    const statusTranslation: Record<string, string> = {
      Scheduled: 'Zakazano',
      Ongoing: 'U tijeku',
      Completed: 'Završeno',
      Cancelled: 'Otkazano'
    };
    return statusTranslation[game.status] || game.status;
  }

  const mine = findMyAssignment(game, options.userId);
  if (!mine) {
    return game.status;
  }
  const statusTranslation: Record<string, string> = {
    Pending: 'Na čekanju',
    Accepted: 'Prihvaćeno',
    Rejected: 'Odbijeno'
  };
  return statusTranslation[mine.assignmentStatus] || game.status;
}

export function gameStatusClass(
  game: BasketballGame,
  options: { seeAllGames: boolean; userId: string; now?: Date }
): string {
  if (options.seeAllGames) {
    if (game.status === 'Scheduled' && isGameInPast(game, options.now)) {
      return 'status-accepted';
    }
    switch (game.status) {
      case 'Scheduled':
      case 'Ongoing':
        return 'status-pending';
      case 'Completed':
        return 'status-accepted';
      case 'Cancelled':
        return 'status-rejected';
      default:
        return '';
    }
  }

  const mine = findMyAssignment(game, options.userId);
  if (!mine) {
    return '';
  }
  switch (mine.assignmentStatus) {
    case 'Pending':
      return 'status-pending';
    case 'Accepted':
      return 'status-accepted';
    case 'Rejected':
      return 'status-rejected';
    default:
      return '';
  }
}

export function refereesFormatted(
  game: BasketballGame,
  options: { seeAllGames: boolean; userId: string }
): { label: string; text: string }[] {
  const groups = refereeGroups(game, options);
  const parts: { label: string; text: string }[] = [];
  if (groups.Sudac.length > 0) {
    parts.push({
      label: 'Sudci',
      text: groups.Sudac
        .sort((a, b) => a.position - b.position)
        .map((ref) => `${ref.name} ${ref.statusText}`)
        .join(', ')
    });
  }
  if (groups.Delegat.length > 0) {
    parts.push({
      label: 'Delegat',
      text: groups.Delegat.map((ref) => `${ref.name} ${ref.statusText}`).join(', ')
    });
  }
  if (groups.Kontrolor.length > 0) {
    parts.push({
      label: 'Kontrolor',
      text: groups.Kontrolor.map((ref) => `${ref.name} ${ref.statusText}`).join(', ')
    });
  }
  return parts;
}

function refereeGroups(
  game: BasketballGame,
  options: { seeAllGames: boolean; userId: string }
): RefereeGroups {
  const groups: RefereeGroups = { Sudac: [], Delegat: [], Kontrolor: [] };
  game.refereeAssignments.forEach((assignment) => {
    if (assignment.assignmentStatus !== 'Pending' && assignment.assignmentStatus !== 'Accepted') {
      return;
    }
    const isCurrentUser = gamesAssignmentUserId(assignment) === options.userId;
    const nameDisplay = options.seeAllGames
      ? `${assignment.userId.name} ${assignment.userId.surname}`
      : isCurrentUser
        ? 'Vi'
        : `${assignment.userId.name} ${assignment.userId.surname}`;
    const refereeInfo: RefereeInfo = {
      name: nameDisplay,
      position: assignment.position,
      status: assignment.assignmentStatus,
      statusText: assignment.assignmentStatus === 'Pending' ? '(na čekanju)' : '(potvrđeno)',
      isCurrentUser
    };
    if (groups[assignment.role]) {
      groups[assignment.role].push(refereeInfo);
    }
  });
  return groups;
}
