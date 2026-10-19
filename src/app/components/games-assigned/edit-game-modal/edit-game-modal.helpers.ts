import { Absence } from '../../../model/absence.model';
import { GameFormData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import {
  cannotNominateSelf,
  isBlockingScheduleConflict,
  isKontrolorRequired,
  isWithinNominationCap,
  RoleSource,
  timesOverlap
} from '../../../model/roles';

export interface ScheduleGameOnDate {
  _id: string;
  time: string;
  competition: string;
  refereeAssignments?: Array<{ userId?: unknown; assignmentStatus: string }>;
}

export function assignmentUserId(assignment: { userId?: unknown } | null | undefined): string {
  if (!assignment?.userId) {
    return '';
  }
  return typeof assignment.userId === 'object'
    ? String((assignment.userId as { _id?: string })._id || '')
    : String(assignment.userId);
}

export function sudacSlotsFromAssignments(
  assignments: Array<{ role?: string; userId?: unknown; position?: number; _id?: string }>
): Array<{ _id?: string; userId: string; position: number }> {
  const slots: Array<{ _id?: string; userId: string; position: number }> = [
    { userId: '', position: 1 },
    { userId: '', position: 2 },
    { userId: '', position: 3 }
  ];
  const leftovers: Array<{ _id?: string; userId: string }> = [];

  assignments.forEach((assignment) => {
    if (assignment.role !== 'Sudac') {
      return;
    }
    const userId = assignmentUserId(assignment);
    const position = Number(assignment.position);
    if (position >= 1 && position <= 3 && !slots[position - 1].userId) {
      slots[position - 1] = { _id: assignment._id, userId, position };
      return;
    }
    leftovers.push({ _id: assignment._id, userId });
  });

  leftovers.forEach((item) => {
    const empty = slots.find((slot) => !slot.userId);
    if (empty) {
      empty.userId = item.userId;
      empty._id = item._id;
    }
  });

  return slots;
}

export function eligibleOfficials(
  refs: User[],
  competition: string,
  actor: RoleSource | null | undefined
): User[] {
  return refs.filter((ref) => {
    if (!isWithinNominationCap(ref, competition)) {
      return false;
    }
    return !cannotNominateSelf(actor, String(ref._id || ''));
  });
}

export function isRefereeAvailable(
  referee: User,
  options: {
    date: string;
    time: string;
    competition: string;
    currentGameId?: string | null;
    absences: Absence[];
    gamesOnDate: ScheduleGameOnDate[];
  }
): boolean {
  if (!options.date || !options.time) {
    return true;
  }

  const selectedGameDate = new Date(options.date);
  selectedGameDate.setHours(0, 0, 0, 0);

  const hasAbsenceConflict = options.absences.some((absence) => {
    if (absence.userPersonalCode !== referee.personalCode) {
      return false;
    }
    const startDate = new Date(absence.startDate);
    const endDate = new Date(absence.endDate);
    startDate.setHours(0, 0, 0, 0);
    endDate.setHours(23, 59, 59, 999);
    return selectedGameDate >= startDate && selectedGameDate <= endDate;
  });

  if (hasAbsenceConflict) {
    return false;
  }

  return !options.gamesOnDate.some((game) => {
    if (options.currentGameId && String(game._id) === String(options.currentGameId)) {
      return false;
    }
    if (!timesOverlap(game.time, options.time)) {
      return false;
    }
    if (!isBlockingScheduleConflict(game.competition, options.competition)) {
      return false;
    }
    return (game.refereeAssignments || []).some((assignment) => {
      if (!['Accepted', 'Pending'].includes(assignment.assignmentStatus)) {
        return false;
      }
      return assignmentUserId(assignment) === referee._id;
    });
  });
}

export function gameFormError(form: GameFormData): string | null {
  const { homeTeam, awayTeam, date, time, venue, competition } = form;

  if (!competition) {
    return 'Natjecanje je obavezno.';
  }
  if (!homeTeam.trim()) {
    return 'Domaći tim je obavezan.';
  }
  if (!awayTeam.trim()) {
    return 'Gostujući tim je obavezan.';
  }
  if (homeTeam.toLowerCase().trim() === awayTeam.toLowerCase().trim()) {
    return 'Domaći i gostujući tim ne mogu biti isti.';
  }
  if (!date) {
    return 'Datum je obavezan.';
  }
  if (!time) {
    return 'Vrijeme je obavezno.';
  }
  if (!venue.trim()) {
    return 'Mjesto je obavezno.';
  }
  return null;
}

export function refereeAssignmentError(
  selection: RefereeSelection,
  options: {
    canNominate: boolean;
    kontrolorRequired: boolean;
  }
): string | null {
  if (!options.canNominate) {
    return null;
  }

  const validSudci = selection.sudci.filter((s) => s.userId).length;
  if (validSudci < 3) {
    return 'Potrebno je odabrati 3 suca.';
  }
  if (!selection.delegat) {
    return 'Delegat je obavezan.';
  }
  if (options.kontrolorRequired && !selection.kontrolor) {
    return 'Kontrolor je obavezan na ovom natjecanju.';
  }

  const allSelectedIds = [
    ...selection.sudci.map((s) => s.userId).filter((id) => id),
    selection.delegat,
    selection.kontrolor
  ].filter((id) => id);

  if (allSelectedIds.length !== new Set(allSelectedIds).size) {
    return 'Isti sudac ne može biti dodijeljen više puta.';
  }

  return null;
}

export function kontrolorRequiredForForm(
  competition: string,
  homeCompetitions: string[],
  awayCompetitions: string[]
): boolean {
  return isKontrolorRequired(competition, homeCompetitions, awayCompetitions);
}

export function formatRejectionWhen(rejectedAt: string): string {
  const date = new Date(rejectedAt);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toLocaleString('hr-HR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

export function unavailableOfficialsCount(
  pool: User[],
  availability: (ref: User) => boolean,
  hasDateTime: boolean
): number {
  if (!hasDateTime) {
    return 0;
  }
  return pool.filter((ref) => !availability(ref)).length;
}

export function gameDraftSnapshot(form: GameFormData, referees: RefereeSelection): string {
  return JSON.stringify({
    homeTeam: form.homeTeam,
    awayTeam: form.awayTeam,
    date: form.date,
    time: form.time,
    venue: form.venue,
    competition: form.competition,
    notes: form.notes,
    status: form.status || '',
    sudci: referees.sudci.map((slot) => ({ userId: slot.userId || '', position: slot.position })),
    delegat: referees.delegat || '',
    kontrolor: referees.kontrolor || ''
  });
}
