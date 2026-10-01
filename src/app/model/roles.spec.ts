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
          { name: 'Sudac', competitions: ['FAVBET PREMIJER LIGA', 'NEPOSTOJI'] },
          'NijeUloga'
        ]
      });
      expect(assignments).toEqual([{ name: 'Sudac', competitions: ['FAVBET PREMIJER LIGA'] }]);
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
    const calendarPov = user({ name: 'Povjerenik natjecanja', competitions: ['3X3'] });
    const officialsPov = user({ name: 'Povjerenik za službene osobe', competitions: ['3X3'] });
    const assistantPov = user({ name: 'Povjerenik za pomoćne suce', competitions: ['3X3'] });
    const sudac = user({ name: 'Sudac' });

    it('prepoznaje Admina', () => {
      expect(isAdminUser(admin)).toBeTrue();
      expect(isAdminUser(sudac)).toBeFalse();
      expect(userHasRole(sudac, 'Sudac')).toBeTrue();
    });

    it('kalendar i nominacije ovise o natjecanju', () => {
      expect(canManageCalendar(calendarPov, '3X3')).toBeTrue();
      expect(canManageCalendar(calendarPov, 'FAVBET PREMIJER LIGA')).toBeFalse();
      expect(canManageCalendar(admin, 'FAVBET PREMIJER LIGA')).toBeTrue();

      expect(canNominateOfficials(officialsPov, '3X3')).toBeTrue();
      expect(canNominateAssistants(assistantPov, '3X3')).toBeTrue();
      expect(canNominateAssistants(officialsPov, '3X3')).toBeFalse();
    });

    it('userHasRoleForCompetition: prazna lista natjecanja znači sva', () => {
      expect(userHasRoleForCompetition(user({ name: 'Povjerenik natjecanja' }), 'Povjerenik natjecanja', '3X3'))
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
      expect(canAssignGameRole(officialsPov, 'Sudac', '3X3')).toBeTrue();
      expect(canAssignGameRole(officialsPov, 'Pomoćni Sudac', '3X3')).toBeFalse();
      expect(canAssignGameRole(assistantPov, 'Pomoćni Sudac', '3X3')).toBeTrue();
      expect(canAssignGameRole(sudac, 'Sudac', '3X3')).toBeFalse();
    });

    it('eligible officials vidi admin i dva povjerenika, ne pomoćni', () => {
      expect(canViewEligibleOfficials(admin)).toBeTrue();
      expect(canViewEligibleOfficials(calendarPov)).toBeTrue();
      expect(canViewEligibleOfficials(assistantPov)).toBeFalse();
    });

    it('getManagedCompetitions: admin null, ograničeni povjerenik listu', () => {
      expect(getManagedCompetitions(admin)).toBeNull();
      expect(getManagedCompetitions(calendarPov)).toEqual(['3X3']);
      expect(getCalendarCompetitions(calendarPov)).toEqual(['3X3']);
    });
  });

  describe('nominacija / raspored', () => {
    it('pomoćni sudac nije vezan uz cap lige', () => {
      expect(isWithinNominationCap({ najvisaLiga: '3X3' }, 'FAVBET PREMIJER LIGA', 'Pomoćni Sudac')).toBeTrue();
      expect(isWithinNominationCap({ najvisaLiga: '3X3' }, 'FAVBET PREMIJER LIGA', 'Sudac')).toBeFalse();
      expect(isWithinNominationCap({ najvisaLiga: 'FAVBET PREMIJER LIGA' }, '3X3', 'Sudac')).toBeTrue();
    });

    it('viša postojeća liga blokira novu nižu isti dan', () => {
      expect(isBlockingScheduleConflict('FAVBET PREMIJER LIGA', '3X3')).toBeTrue();
      expect(isBlockingScheduleConflict('3X3', 'FAVBET PREMIJER LIGA')).toBeFalse();
    });

    it('timesOverlap koristi prozor od 60 minuta', () => {
      expect(timesOverlap('18:00', '18:30')).toBeTrue();
      expect(timesOverlap('18:00', '19:00')).toBeFalse();
    });

    it('isEligibleForCompetition: sudac unutar capa, kontrolor samo top lige', () => {
      const sudac = { roles: [{ name: 'Sudac', competitions: [] }], najvisaLiga: 'FAVBET PREMIJER LIGA' };
      const kontrolor = { roles: [{ name: 'Kontrolor', competitions: [] }], najvisaLiga: 'FAVBET PREMIJER LIGA' };
      expect(isEligibleForCompetition(sudac, '3X3')).toBeTrue();
      expect(isEligibleForCompetition(kontrolor, '3X3')).toBeFalse();
      expect(isEligibleForCompetition(kontrolor, 'FAVBET PREMIJER LIGA')).toBeTrue();
    });
  });
});
