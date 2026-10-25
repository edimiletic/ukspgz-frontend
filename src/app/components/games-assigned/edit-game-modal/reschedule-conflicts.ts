import { timesOverlap } from '../../../model/roles';

export interface RescheduleOfficial {
  id: string;
  name: string;
  personalCode?: string;
}

export interface RescheduleGame {
  _id?: string;
  id?: string;
  time?: string;
  competition?: string;
  homeTeam?: string;
  awayTeam?: string;
  refereeAssignments?: Array<{ userId?: unknown; assignmentStatus?: string }>;
}

export interface RescheduleAbsence {
  userPersonalCode?: string;
  startDate: string;
  endDate: string;
}

const ACTIVE_ASSIGNMENT = new Set(['Accepted', 'Pending']);

function calendarDay(value: string): number {
  const match = /^(\d{4})-(\d{2})-(\d{2})/.exec(value || '');
  if (!match) {
    return NaN;
  }
  return Date.UTC(Number(match[1]), Number(match[2]) - 1, Number(match[3]));
}

function assignmentUserId(userId: unknown): string {
  if (userId == null || userId === '') {
    return '';
  }
  if (typeof userId === 'string' || typeof userId === 'number') {
    return String(userId);
  }
  if (typeof userId === 'object') {
    const record = userId as { _id?: unknown; id?: unknown };
    return String(record._id || record.id || '');
  }
  return '';
}

function sameGame(game: RescheduleGame, gameId?: string): boolean {
  if (!gameId) {
    return false;
  }
  return String(game._id || game.id || '') === String(gameId);
}

function isAbsent(official: RescheduleOfficial, date: string, absences: RescheduleAbsence[]): boolean {
  if (!official.personalCode) {
    return false;
  }
  const selected = calendarDay(date);
  if (Number.isNaN(selected)) {
    return false;
  }
  return absences.some(absence => {
    if (absence.userPersonalCode !== official.personalCode) {
      return false;
    }
    const start = calendarDay(absence.startDate);
    const end = calendarDay(absence.endDate);
    return !Number.isNaN(start) && !Number.isNaN(end) && selected >= start && selected <= end;
  });
}

function overlappingGame(
  official: RescheduleOfficial,
  time: string,
  gameId: string | undefined,
  gamesOnDate: RescheduleGame[]
): RescheduleGame | undefined {
  return gamesOnDate.find(game => {
    if (sameGame(game, gameId) || !timesOverlap(game.time, time)) {
      return false;
    }
    return (game.refereeAssignments || []).some(assignment => {
      if (!assignment.assignmentStatus || !ACTIVE_ASSIGNMENT.has(assignment.assignmentStatus)) {
        return false;
      }
      return assignmentUserId(assignment.userId) === official.id;
    });
  });
}

function gameLabel(game: RescheduleGame): string {
  const matchup = game.homeTeam && game.awayTeam ? `${game.homeTeam} vs ${game.awayTeam}` : 'drugoj utakmici';
  const competition = game.competition ? ` (${game.competition})` : '';
  const time = game.time ? ` u ${game.time}` : '';
  return `${matchup}${competition}${time}`;
}

/**
 * Officials who stay on a game are not sent through assign-referee again, so a
 * date/time change never releases or rejects their other nomination. Block the
 * save when the new slot overlaps any of those nominations or an absence.
 */
export function findRescheduleConflicts(params: {
  date: string;
  time: string;
  gameId?: string;
  officials: RescheduleOfficial[];
  gamesOnDate: RescheduleGame[];
  absences: RescheduleAbsence[];
}): string | null {
  const conflicts: string[] = [];

  for (const official of params.officials) {
    if (!official.id) {
      continue;
    }
    if (isAbsent(official, params.date, params.absences)) {
      conflicts.push(`${official.name} ima odsustvo na odabrani datum.`);
      continue;
    }
    const other = overlappingGame(official, params.time, params.gameId, params.gamesOnDate);
    if (other) {
      conflicts.push(`${official.name} već ima nominaciju na ${gameLabel(other)}.`);
    }
  }

  if (!conflicts.length) {
    return null;
  }

  return `Novi termin se preklapa s postojećom nominacijom. ${conflicts.slice(0, 3).join(' ')} Promjena termina ne uklanja tu nominaciju. Prvo je uklonite ili odaberite drugi termin.`;
}
