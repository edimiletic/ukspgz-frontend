import {
  canAssignGameRole,
  canManageCalendar,
  canNominateAssistants,
  canNominateOfficials,
  canSeeAllGames,
  canViewEligibleOfficials,
  canViewStatistics,
  formatRoleLabel,
  getCalendarCompetitions,
  getManagedCompetitions,
  getStatisticsRoles,
  isAdminUser,
  isBlockingScheduleConflict,
  isEligibleForCompetition,
  isWithinNominationCap,
  normalizeRoleAssignments,
  pickPrimaryRole,
  timesOverlap,
  userHasRole,
  userHasRoleForCompetition
} from './roles';

const user = (...roles: Array<{ name: string; competitions?: string[] }>) => ({
  roles
});

describe('roles', () => {
  describe('normalizeRoleAssignments', () => {
    it('prima string ulogu i legacy role polje', () => {
      expect(normalizeRoleAssignments('Admin')).toEqual([{ name: 'Admin', competitions: [] }]);
      expect(normalizeRoleAssignments({ role: 'Sudac' })).toEqual([{ name: 'Sudac', competitions: [] }]);
    });

    it('ignorira nepoznate uloge i natjecanja izvan kataloga', () => {
      const assignments = normalizeRoleAssignments({
        roles: [
          { name: 'Sudac', competitions: ['SuperSport Premijer liga', 'NEPOSTOJI'] },
          'NijeUloga'
        ]
      });
      expect(assignments).toEqual([{ name: 'Sudac', competitions: ['SuperSport Premijer liga'] }]);
    });

    it('mapira staro ime FAVBET Premijer lige', () => {
      const assignments = normalizeRoleAssignments({
        roles: [{ name: 'Sudac', competitions: ['FAVBET PREMIJER LIGA'] }]
      });
      expect(assignments).toEqual([{ name: 'Sudac', competitions: ['SuperSport Premijer liga'] }]);
    });

    it('vraća prazno za null', () => {
      expect(normalizeRoleAssignments(null)).toEqual([]);
    });
  });

  describe('pickPrimaryRole / getRoleNames', () => {
    it('Admin ima prednost, inače prva terenska uloga', () => {
      expect(pickPrimaryRole(normalizeRoleAssignments(user(
        { name: 'Sudac' },
        { name: 'Admin' }
      )))).toBe('Admin');
      expect(pickPrimaryRole(normalizeRoleAssignments(user(
        { name: 'Povjerenik natjecanja' },
        { name: 'Delegat' }
      )))).toBe('Delegat');
    });

    it('formatira labelu', () => {
      expect(formatRoleLabel('Sudac')).toBe('Sudac');
      expect(formatRoleLabel(null)).toBe('Korisnik');
    });
  });

  describe('dozvole', () => {
    const admin = user({ name: 'Admin' });
    const calendarPov = user({ name: 'Povjerenik natjecanja', competitions: ['PRVA MUŠKA LIGA'] });
    const officialsPov = user({ name: 'Povjerenik za službene osobe', competitions: ['PRVA MUŠKA LIGA'] });
    const assistantPov = user({ name: 'Povjerenik za pomoćne suce', competitions: ['PRVA MUŠKA LIGA'] });
    const sudac = user({ name: 'Sudac' });

    it('prepoznaje Admina', () => {
      expect(isAdminUser(admin)).toBeTrue();
      expect(isAdminUser(sudac)).toBeFalse();
      expect(userHasRole(sudac, 'Sudac')).toBeTrue();
    });

    it('kalendar i nominacije ovise o natjecanju', () => {
      expect(canManageCalendar(calendarPov, 'PRVA MUŠKA LIGA')).toBeTrue();
      expect(canManageCalendar(calendarPov, 'SuperSport Premijer liga')).toBeFalse();
      expect(canManageCalendar(admin, 'SuperSport Premijer liga')).toBeTrue();

      expect(canNominateOfficials(officialsPov, 'PRVA MUŠKA LIGA')).toBeTrue();
      expect(canNominateAssistants(assistantPov, 'PRVA MUŠKA LIGA')).toBeTrue();
      expect(canNominateAssistants(officialsPov, 'PRVA MUŠKA LIGA')).toBeFalse();
    });

    it('userHasRoleForCompetition: prazna lista natjecanja znači sva', () => {
      expect(userHasRoleForCompetition(user({ name: 'Povjerenik natjecanja' }), 'Povjerenik natjecanja', 'PRVA MUŠKA LIGA'))
        .toBeTrue();
    });

    it('povjerenici vide sve utakmice i statistiku', () => {
      expect(canSeeAllGames(calendarPov)).toBeTrue();
      expect(canSeeAllGames(sudac)).toBeFalse();
      expect(canViewStatistics(officialsPov)).toBeTrue();
      expect(canViewStatistics(sudac)).toBeFalse();
    });

    it('statističke uloge: pomoćni povjerenik vidi samo pomoćne suce', () => {
      expect(getStatisticsRoles(admin)).toEqual(['Sudac', 'Delegat', 'Pomoćni Sudac', 'Kontrolor']);
      expect(getStatisticsRoles(assistantPov)).toEqual(['Pomoćni Sudac']);
      expect(getStatisticsRoles(sudac)).toEqual([]);
    });

    it('canAssignGameRole razdvaja službene i pomoćne', () => {
      expect(canAssignGameRole(officialsPov, 'Sudac', 'PRVA MUŠKA LIGA')).toBeTrue();
      expect(canAssignGameRole(officialsPov, 'Pomoćni Sudac', 'PRVA MUŠKA LIGA')).toBeFalse();
      expect(canAssignGameRole(assistantPov, 'Pomoćni Sudac', 'PRVA MUŠKA LIGA')).toBeTrue();
      expect(canAssignGameRole(sudac, 'Sudac', 'PRVA MUŠKA LIGA')).toBeFalse();
    });

    it('eligible officials vidi admin i dva povjerenika, ne pomoćni', () => {
      expect(canViewEligibleOfficials(admin)).toBeTrue();
      expect(canViewEligibleOfficials(calendarPov)).toBeTrue();
      expect(canViewEligibleOfficials(assistantPov)).toBeFalse();
    });

    it('getManagedCompetitions: admin null, ograničeni povjerenik listu', () => {
      expect(getManagedCompetitions(admin)).toBeNull();
      expect(getManagedCompetitions(calendarPov)).toEqual(['PRVA MUŠKA LIGA']);
      expect(getCalendarCompetitions(calendarPov)).toEqual(['PRVA MUŠKA LIGA']);
    });
  });

  describe('nominacija / raspored', () => {
    it('pomoćni sudac nije vezan uz cap lige', () => {
      expect(isWithinNominationCap({ najvisaLiga: 'PRVA MUŠKA LIGA' }, 'SuperSport Premijer liga', 'Pomoćni Sudac')).toBeTrue();
      expect(isWithinNominationCap({ najvisaLiga: 'PRVA MUŠKA LIGA' }, 'SuperSport Premijer liga', 'Sudac')).toBeFalse();
      expect(isWithinNominationCap({ najvisaLiga: 'SuperSport Premijer liga' }, 'PRVA MUŠKA LIGA', 'Sudac')).toBeTrue();
    });

    it('viša postojeća liga blokira novu nižu isti dan', () => {
      expect(isBlockingScheduleConflict('SuperSport Premijer liga', 'PRVA MUŠKA LIGA')).toBeTrue();
      expect(isBlockingScheduleConflict('PRVA MUŠKA LIGA', 'SuperSport Premijer liga')).toBeFalse();
    });

    it('timesOverlap koristi prozor od 60 minuta', () => {
      expect(timesOverlap('18:00', '18:30')).toBeTrue();
      expect(timesOverlap('18:00', '19:00')).toBeFalse();
    });

    it('isEligibleForCompetition: sudac unutar capa, kontrolor samo top lige', () => {
      const sudac = { roles: [{ name: 'Sudac', competitions: [] }], najvisaLiga: 'SuperSport Premijer liga' };
      const kontrolor = { roles: [{ name: 'Kontrolor', competitions: [] }], najvisaLiga: 'SuperSport Premijer liga' };
      expect(isEligibleForCompetition(sudac, 'PRVA MUŠKA LIGA')).toBeTrue();
      expect(isEligibleForCompetition(kontrolor, 'JUNIORI')).toBeFalse();
      expect(isEligibleForCompetition(kontrolor, 'SuperSport Premijer liga')).toBeTrue();
    });
  });
});
