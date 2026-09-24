export type UserRole =
  | 'Admin'
  | 'Sudac'
  | 'Delegat'
  | 'Pomoćni Sudac'
  | 'Kontrolor'
  | 'Povjerenik natjecanja'
  | 'Povjerenik za službene osobe'
  | 'Povjerenik za pomoćne suce';

export type GameAssignmentRole = 'Sudac' | 'Delegat' | 'Pomoćni Sudac' | 'Kontrolor';

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
  'Pomoćni Sudac',
  'Kontrolor',
  'Povjerenik natjecanja',
  'Povjerenik za službene osobe',
  'Povjerenik za pomoćne suce'
];

export const GAME_ASSIGNMENT_ROLES: GameAssignmentRole[] = ['Sudac', 'Delegat', 'Pomoćni Sudac', 'Kontrolor'];

export const COMMISSIONER_ROLES: UserRole[] = [
  'Povjerenik natjecanja',
  'Povjerenik za službene osobe',
  'Povjerenik za pomoćne suce'
];

export const ALL_COMPETITIONS = [
  'FAVBET PREMIJER LIGA',
  'KUP «K. ĆOSIĆ»',
  'PRVA MUŠKA LIGA',
  'ZAVRŠNI TURNIR ZA POPUNU PRVE MUŠKE LIGE',
  'DRUGE MUŠKE LIGE',
  'TREĆE MUŠKE LIGE',
  'ČETVRTE MUŠKE LIGE',
  'PREMIJER ŽENSKA LIGA',
  'PRVA ŽENSKA LIGA',
  'KUP «R. MEGLAJ-RIMAC»',
  'JUNIORI',
  'JUNIORKE',
  'KADETI',
  'KADETKINJE',
  'MLAĐI KADETI',
  'MLAĐE KADETKINJE',
  'DJEČACI I DJEVOJČICE',
  'NATJECANJE SREDNJIH ŠKOLA',
  'NATJECANJE OSNOVNIH ŠKOLA',
  'Natjecanje MINI KOŠARKA',
  '3X3'
];

export const COMPETITION_RANK: Record<string, number> = {
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

export const getCompetitionRank = (competition?: string | null): number =>
  (competition && COMPETITION_RANK[competition]) || 0;

export const isWithinNominationCap = (
  user?: { najvisaLiga?: string | null } | null,
  competition?: string | null,
  assignmentRole?: string | null
): boolean => {
  if (assignmentRole === 'Pomoćni Sudac') return true;
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

export const TOP_PROFESSIONAL_COMPETITIONS = [
  'FAVBET PREMIJER LIGA',
  'PREMIJER ŽENSKA LIGA',
  'PRVA MUŠKA LIGA',
  'KUP «K. ĆOSIĆ»',
  'KUP «R. MEGLAJ-RIMAC»'
];

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
        ? entry.competitions.filter((competition) => ALL_COMPETITIONS.includes(competition))
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

export const canNominateAssistants = (userOrRole?: RoleSource | string | null, competition?: string | null): boolean =>
  userHasRoleForCompetition(userOrRole, 'Povjerenik za pomoćne suce', competition) || isAdminUser(userOrRole);

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
  if (canNominateAssistants(userOrRole, competition) && assignmentRole === 'Pomoćni Sudac') {
    return true;
  }
  return false;
};

export const formatRoleLabel = (userOrRole?: RoleSource | string | null): string => {
  const names = getRoleNames(userOrRole);
  return names.length ? names.join(', ') : 'Korisnik';
};
