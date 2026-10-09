import {
  ALL_COMPETITIONS,
  COMMISSIONER_ROLES,
  getManagedCompetitions,
  getRoleNames,
  normalizeRoleAssignments,
  USER_ROLES,
  UserRole
} from '../../model/roles';
import { User } from '../../model/user.model';

export const OFFICIAL_CAP_ROLES: UserRole[] = ['Sudac', 'Delegat', 'Kontrolor'];

export interface LeagueColumnParts {
  teren: string;
  nadzor: string;
}

export interface RoleAssignmentPayload {
  name: UserRole;
  competitions: string[];
}

export function userMatchesFilters(user: User, search: string, role: string): boolean {
  if (role && !getRoleNames(user).includes(role as UserRole)) {
    return false;
  }
  const query = search.trim().toLowerCase();
  if (!query) {
    return true;
  }
  const haystack = [user.name, user.surname, user.username, user.email, user.personalCode]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return haystack.includes(query);
}

export interface CommissionerHolder {
  _id: string;
  label: string;
  competitions: string[];
  roleNames: UserRole[];
}

export function commissionerHolders(
  users: User[],
  excludeUserId?: string
): Partial<Record<UserRole, Record<string, CommissionerHolder>>> {
  const occupancy: Partial<Record<UserRole, Record<string, CommissionerHolder>>> = {};
  users.forEach((user) => {
    if (excludeUserId && user._id === excludeUserId) {
      return;
    }
    const label = `${user.name || ''} ${user.surname || ''}`.trim() || user.username;
    const roleNames = getRoleNames(user) as UserRole[];
    normalizeRoleAssignments(user).forEach((assignment) => {
      if (!COMMISSIONER_ROLES.includes(assignment.name as UserRole)) {
        return;
      }
      const competitions = assignment.competitions.length ? assignment.competitions : ALL_COMPETITIONS;
      const role = assignment.name as UserRole;
      occupancy[role] = occupancy[role] || {};
      const holder: CommissionerHolder = { _id: user._id, label, competitions, roleNames };
      competitions.forEach((competition) => {
        if (!occupancy[role]![competition]) {
          occupancy[role]![competition] = holder;
        }
      });
    });
  });
  return occupancy;
}

export function remainingRolesAfterCommissionerTake(
  holder: CommissionerHolder,
  role: UserRole,
  takenCompetitions: string[]
): UserRole[] {
  const keepsCommissioner = holder.competitions.some(
    (competition) => !takenCompetitions.includes(competition)
  );
  return holder.roleNames.filter((name) => name !== role || keepsCommissioner);
}

export function buildRoleAssignments(
  selected: UserRole[],
  competitionsByRole: Partial<Record<UserRole, string[]>>
): RoleAssignmentPayload[] {
  return selected
    .filter((name) => USER_ROLES.includes(name))
    .map((name) => ({
      name,
      competitions: COMMISSIONER_ROLES.includes(name) ? [...(competitionsByRole[name] || [])] : []
    }));
}

function supervisionLabel(user: User): string {
  const managed = getManagedCompetitions(user);
  if (managed === null) {
    return 'Sva natjecanja';
  }
  return managed.length ? managed.join(', ') : '—';
}

export function leagueColumnParts(user: User): LeagueColumnParts {
  const names = getRoleNames(user);
  const hasField = names.some((role) => OFFICIAL_CAP_ROLES.includes(role));
  const hasCommissioner = names.some((role) => COMMISSIONER_ROLES.includes(role));
  return {
    teren: hasField ? (user.najvisaLiga?.trim() || '—') : '',
    nadzor: hasCommissioner ? supervisionLabel(user) : ''
  };
}

export function leagueColumnLabel(user: User): string {
  const { teren, nadzor } = leagueColumnParts(user);
  if (teren && nadzor) {
    return `Teren: ${teren} · Nadzor: ${nadzor}`;
  }
  return teren || nadzor || '—';
}

export function toDateInputValue(value?: string | Date | null): string {
  if (!value) {
    return '';
  }
  const raw = typeof value === 'string' ? value : value.toISOString();
  return raw.slice(0, 10);
}

export function apiErrorMessage(error: unknown, fallback: string): string {
  if (!error || typeof error !== 'object') {
    return fallback;
  }
  const body = (error as { error?: unknown }).error;
  if (typeof body === 'string' && body.trim()) {
    return body;
  }
  if (body && typeof body === 'object') {
    const typed = body as { error?: string; message?: string };
    if (typed.error) {
      return typed.error;
    }
    if (typed.message) {
      return typed.message;
    }
  }
  return fallback;
}
