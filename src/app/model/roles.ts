export type UserRole =
  | 'Admin'
  | 'Sudac'
  | 'Delegat'
  | 'Kontrolor'
  | 'Povjerenik natjecanja'
  | 'Povjerenik za službene osobe';

export type GameAssignmentRole = 'Sudac' | 'Delegat' | 'Kontrolor';

export interface RoleAssignment {
  name: UserRole;
  competitions: string[];
}

export interface RoleSource {
  role?: string | null;
  roles?: Array<RoleAssignment | string | { name?: string; role?: string; competitions?: string[] }> | null;
}

export const USER_ROLES: UserRole[] = [
  'Admin',
  'Sudac',
  'Delegat',
  'Kontrolor',
  'Povjerenik natjecanja',
  'Povjerenik za službene osobe'
];

export const GAME_ASSIGNMENT_ROLES: GameAssignmentRole[] = ['Sudac', 'Delegat', 'Kontrolor'];

export const COMMISSIONER_ROLES: UserRole[] = [
  'Povjerenik natjecanja',
  'Povjerenik za službene osobe'
];

export const INCOMPATIBLE_ROLE_PAIRS: ReadonlyArray<readonly [UserRole, UserRole]> = [
  ['Sudac', 'Delegat'],
  ['Sudac', 'Kontrolor'],
  ['Delegat', 'Kontrolor'],
  ['Sudac', 'Povjerenik natjecanja']
];

export const ALL_COMPETITIONS = [
  'SuperSport Premijer liga',
  'PRVA MUŠKA LIGA',
  'PREMIJER ŽENSKA LIGA',
  'KUP «K. ĆOSIĆ»',
  'KUP «R. MEGLAJ-RIMAC»'
];

export const COMPETITION_RANK: Record<string, number> = {
  'SuperSport Premijer liga': 100,
  'FAVBET PREMIJER LIGA': 100,
  'KUP «K. ĆOSIĆ»': 100,
  'PREMIJER ŽENSKA LIGA': 95,
  'KUP «R. MEGLAJ-RIMAC»': 95,
  'PRVA MUŠKA LIGA': 80,
  'ZAVRŠNI TURNIR ZA POPUNU PRVE MUŠKE LIGE': 75,
  'PRVA ŽENSKA LIGA': 70,
  'DRUGE MUŠKE LIGE': 50,
  'TREĆE MUŠKE LIGE': 40,
  'ČETVRTE MUŠKE LIGE': 30,
  'JUNIORI': 25,
  'JUNIORKE': 25,
  'KADETI': 20,
  'KADETKINJE': 20,
  'MLAĐI KADETI': 15,
  'MLAĐE KADETKINJE': 15,
  'DJEČACI I DJEVOJČICE': 10,
  'NATJECANJE SREDNJIH ŠKOLA': 8,
  'NATJECANJE OSNOVNIH ŠKOLA': 6,
  'Natjecanje MINI KOŠARKA': 4,
  '3X3': 3
};

export const REFEREE_RANKS = ['Državni sudac', 'Županijski sudac'] as const;
export type RefereeRank = typeof REFEREE_RANKS[number];

export const CUP_COSIC = 'KUP «K. ĆOSIĆ»';
export const CUP_MEGLAJ = 'KUP «R. MEGLAJ-RIMAC»';
export const SUPERSPORT_PREMIJER = 'SuperSport Premijer liga';
export const MEN_LEAGUE_COMPETITIONS = [
  'SuperSport Premijer liga',
  'FAVBET PREMIJER LIGA',
  'PRVA MUŠKA LIGA'
];
export const WOMEN_LEAGUE_COMPETITIONS = ['PREMIJER ŽENSKA LIGA'];

export const canonicalCompetition = (competition?: string | null): string =>
  competition === 'FAVBET PREMIJER LIGA' ? 'SuperSport Premijer liga' : (competition || '');

export const isSuperSportPremijer = (competition?: string | null): boolean =>
  canonicalCompetition(competition) === SUPERSPORT_PREMIJER;

export const isCupCosic = (competition?: string | null): boolean =>
  competition === CUP_COSIC;

export const teamHasAnyCompetition = (
  teamCompetitions: string[] | null | undefined,
  names: string[]
): boolean =>
  (teamCompetitions || []).some(
    (competition) => names.includes(competition) || names.includes(canonicalCompetition(competition))
  );

export const isMenPremierClub = (teamCompetitions?: string[] | null): boolean =>
  teamHasAnyCompetition(teamCompetitions, [SUPERSPORT_PREMIJER, 'FAVBET PREMIJER LIGA']);

export const teamEligibleForCompetition = (
  teamCompetitions: string[] | null | undefined,
  competition?: string | null
): boolean => {
  if (!competition) return false;
  const comps = teamCompetitions || [];
  if (comps.includes(competition) || comps.map(canonicalCompetition).includes(canonicalCompetition(competition))) {
    return true;
  }
  if (competition === CUP_COSIC) {
    return teamHasAnyCompetition(comps, MEN_LEAGUE_COMPETITIONS);
  }
  if (competition === CUP_MEGLAJ) {
    return teamHasAnyCompetition(comps, WOMEN_LEAGUE_COMPETITIONS);
  }
  return false;
};

export const isKontrolorRequired = (
  competition?: string | null,
  homeTeamCompetitions?: string[] | null,
  awayTeamCompetitions?: string[] | null
): boolean => {
  if (isSuperSportPremijer(competition)) return true;
  if (isCupCosic(competition)) {
    return isMenPremierClub(homeTeamCompetitions) && isMenPremierClub(awayTeamCompetitions);
  }
  return false;
};

export const getCompetitionRank = (competition?: string | null): number =>
  (competition && COMPETITION_RANK[canonicalCompetition(competition)]) ||
  (competition && COMPETITION_RANK[competition]) || 0;

export const isWithinNominationCap = (
  user?: { najvisaLiga?: string | null } | null,
  competition?: string | null,
  assignmentRole?: string | null
): boolean => {
  const cap = user?.najvisaLiga;
  if (!cap || !competition) return true;
  return getCompetitionRank(competition) <= getCompetitionRank(cap);
};

export const isBlockingScheduleConflict = (
  existingCompetition?: string | null,
  newCompetition?: string | null
): boolean => getCompetitionRank(existingCompetition) >= getCompetitionRank(newCompetition);

export const timesOverlap = (timeA?: string | null, timeB?: string | null, windowMinutes = 60): boolean => {
  const toMinutes = (value?: string | null) => {
    const [hours, minutes] = String(value || '00:00').split(':').map(Number);
    return (hours || 0) * 60 + (minutes || 0);
  };
  return Math.abs(toMinutes(timeA) - toMinutes(timeB)) < windowMinutes;
};

export const TOP_PROFESSIONAL_COMPETITIONS = [...ALL_COMPETITIONS];

export const normalizeRoleAssignments = (userOrRole?: RoleSource | string | null): RoleAssignment[] => {
  if (!userOrRole) return [];

  if (typeof userOrRole === 'string') {
    return USER_ROLES.includes(userOrRole as UserRole)
      ? [{ name: userOrRole as UserRole, competitions: [] }]
      : [];
  }

  const rawRoles = Array.isArray(userOrRole.roles) ? userOrRole.roles : [];
  const normalized = rawRoles
    .map((entry) => {
      if (!entry) return null;
      if (typeof entry === 'string') {
        return USER_ROLES.includes(entry as UserRole)
          ? { name: entry as UserRole, competitions: [] }
          : null;
      }
      const name = ((entry as RoleAssignment).name || (entry as { role?: string }).role) as UserRole;
      if (!USER_ROLES.includes(name)) return null;
      const competitions = Array.isArray(entry.competitions)
        ? entry.competitions
            .map((competition) => canonicalCompetition(competition))
            .filter((competition) => ALL_COMPETITIONS.includes(competition))
        : [];
      return { name, competitions };
    })
    .filter((assignment): assignment is RoleAssignment => !!assignment);

  if (normalized.length) {
    return normalized;
  }

  if (userOrRole.role && USER_ROLES.includes(userOrRole.role as UserRole)) {
    return [{ name: userOrRole.role as UserRole, competitions: [] }];
  }

  return [];
};

export const pickPrimaryRole = (assignments: RoleAssignment[]): UserRole => {
  if (!assignments.length) return 'Sudac';
  const names = assignments.map((assignment) => assignment.name);
  if (names.includes('Admin')) return 'Admin';
  const fieldRole = names.find((name) => GAME_ASSIGNMENT_ROLES.includes(name as GameAssignmentRole));
  return fieldRole || names[0];
};

export const getRoleNames = (userOrRole?: RoleSource | string | null): UserRole[] =>
  [...new Set(normalizeRoleAssignments(userOrRole).map((assignment) => assignment.name))];

export const userHasRole = (userOrRole: RoleSource | string | null | undefined, roleName: string): boolean =>
  getRoleNames(userOrRole).includes(roleName as UserRole);

export const isAdminUser = (userOrRole?: RoleSource | string | null): boolean =>
  userHasRole(userOrRole, 'Admin');

export const userHasRoleForCompetition = (
  userOrRole: RoleSource | string | null | undefined,
  roleName: string,
  competition?: string | null
): boolean => {
  if (isAdminUser(userOrRole)) return true;
  return normalizeRoleAssignments(userOrRole).some((assignment) => {
    if (assignment.name !== roleName) return false;
    if (!competition) return true;
    if (!assignment.competitions.length) return true;
    return assignment.competitions.includes(competition);
  });
};

export const getManagedCompetitions = (userOrRole?: RoleSource | string | null): string[] | null => {
  if (isAdminUser(userOrRole)) return null;
  const commissionerAssignments = normalizeRoleAssignments(userOrRole).filter((assignment) =>
    COMMISSIONER_ROLES.includes(assignment.name)
  );
  if (!commissionerAssignments.length) return [];
  if (commissionerAssignments.some((assignment) => !assignment.competitions.length)) return null;
  return [...new Set(commissionerAssignments.flatMap((assignment) => assignment.competitions))];
};

export const getCalendarCompetitions = (userOrRole?: RoleSource | string | null): string[] => {
  if (isAdminUser(userOrRole)) return ALL_COMPETITIONS;
  const competitions = normalizeRoleAssignments(userOrRole)
    .filter((assignment) => assignment.name === 'Povjerenik natjecanja')
    .flatMap((assignment) => assignment.competitions);
  if (normalizeRoleAssignments(userOrRole).some(
    (assignment) => assignment.name === 'Povjerenik natjecanja' && !assignment.competitions.length
  )) {
    return ALL_COMPETITIONS;
  }
  return ALL_COMPETITIONS.filter((competition) => competitions.includes(competition));
};

export const canManageCalendar = (userOrRole?: RoleSource | string | null, competition?: string | null): boolean =>
  userHasRoleForCompetition(userOrRole, 'Povjerenik natjecanja', competition) || isAdminUser(userOrRole);

export const canNominateOfficials = (userOrRole?: RoleSource | string | null, competition?: string | null): boolean =>
  userHasRoleForCompetition(userOrRole, 'Povjerenik za službene osobe', competition) || isAdminUser(userOrRole);

export const canSeeAllGames = (userOrRole?: RoleSource | string | null): boolean =>
  isAdminUser(userOrRole) || getRoleNames(userOrRole).some((role) => COMMISSIONER_ROLES.includes(role));

export const isTopProfessionalCompetition = (competition?: string | null): boolean =>
  !!competition && TOP_PROFESSIONAL_COMPETITIONS.includes(competition);

export const isEligibleForCompetition = (
  user?: RoleSource & { najvisaLiga?: string | null } | null,
  competition?: string | null
): boolean => {
  if (!user || !competition) return false;
  const hasOfficialRole =
    userHasRole(user, 'Sudac') || userHasRole(user, 'Delegat') || userHasRole(user, 'Kontrolor');
  if (!hasOfficialRole || !isWithinNominationCap(user, competition)) return false;
  if (userHasRole(user, 'Sudac') || userHasRole(user, 'Delegat')) {
    return true;
  }
  return userHasRole(user, 'Kontrolor') && isTopProfessionalCompetition(competition);
};

export const canViewEligibleOfficials = (userOrRole?: RoleSource | string | null): boolean =>
  isAdminUser(userOrRole) ||
  userHasRole(userOrRole, 'Povjerenik natjecanja') ||
  userHasRole(userOrRole, 'Povjerenik za službene osobe');

export const canViewStatistics = (userOrRole?: RoleSource | string | null): boolean =>
  isAdminUser(userOrRole) || getRoleNames(userOrRole).some((role) => COMMISSIONER_ROLES.includes(role));

export const getStatisticsRoles = (userOrRole?: RoleSource | string | null): GameAssignmentRole[] => {
  if (!canViewStatistics(userOrRole)) return [];
  if (
    isAdminUser(userOrRole) ||
    userHasRole(userOrRole, 'Povjerenik natjecanja') ||
    userHasRole(userOrRole, 'Povjerenik za službene osobe')
  ) {
    return [...GAME_ASSIGNMENT_ROLES];
  }
  return [];
};

export const canAssignGameRole = (
  userOrRole: RoleSource | string | null | undefined,
  assignmentRole: string,
  competition?: string | null
): boolean => {
  if (isAdminUser(userOrRole)) {
    return GAME_ASSIGNMENT_ROLES.includes(assignmentRole as GameAssignmentRole);
  }
  if (canNominateOfficials(userOrRole, competition) && ['Sudac', 'Delegat', 'Kontrolor'].includes(assignmentRole)) {
    return true;
  }
  return false;
};

export const formatRoleLabel = (userOrRole?: RoleSource | string | null): string => {
  const names = getRoleNames(userOrRole);
  return names.length ? names.join(', ') : 'Korisnik';
};

const roleNameList = (userOrRoles?: RoleSource | string | string[] | null): UserRole[] => {
  if (Array.isArray(userOrRoles) && (userOrRoles.length === 0 || typeof userOrRoles[0] === 'string')) {
    return [...new Set(userOrRoles as UserRole[])];
  }
  return getRoleNames(userOrRoles as RoleSource | string | null);
};

export const incompatibleRolesMessage = (
  userOrRoles?: RoleSource | string | string[] | null
): string | null => {
  const names = roleNameList(userOrRoles);
  for (const [left, right] of INCOMPATIBLE_ROLE_PAIRS) {
    if (names.includes(left) && names.includes(right)) {
      return `Korisnik ne može istovremeno imati uloge ${left} i ${right}.`;
    }
  }
  return null;
};

export const isRoleCompatibleWithSelection = (role: UserRole, selected: UserRole[]): boolean => {
  if (selected.includes(role)) {
    return true;
  }
  return !incompatibleRolesMessage([...selected, role]);
};

export const cannotNominateSelf = (
  actor?: RoleSource & { _id?: string; id?: string } | null,
  assigneeId?: string | null
): boolean => {
  if (!actor || !assigneeId || isAdminUser(actor)) {
    return false;
  }
  const actorId = String(actor._id || actor.id || '');
  return !!actorId && actorId === String(assigneeId);
};
