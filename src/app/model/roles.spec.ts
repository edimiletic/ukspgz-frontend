import {
  canAssignGameRole,
  canManageCalendar,
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
  isKontrolorRequired,
  isWithinNominationCap,
  teamEligibleForCompetition,
  normalizeRoleAssignments,
  pickPrimaryRole,
  timesOverlap,
  userHasRole,
  userHasRoleForCompetition,
  incompatibleRolesMessage,
  isRoleCompatibleWithSelection,
  cannotNominateSelf
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
      expect(canNominateOfficials(calendarPov, 'PRVA MUŠKA LIGA')).toBeFalse();
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

    it('statističke uloge: admin i povjerenici vide terenske uloge', () => {
      expect(getStatisticsRoles(admin)).toEqual(['Sudac', 'Delegat', 'Kontrolor']);
      expect(getStatisticsRoles(officialsPov)).toEqual(['Sudac', 'Delegat', 'Kontrolor']);
      expect(getStatisticsRoles(sudac)).toEqual([]);
    });

    it('canAssignGameRole: samo povjerenik službenih osoba nominira suca/delegata/kontrolora', () => {
      expect(canAssignGameRole(officialsPov, 'Sudac', 'PRVA MUŠKA LIGA')).toBeTrue();
      expect(canAssignGameRole(officialsPov, 'Kontrolor', 'PRVA MUŠKA LIGA')).toBeTrue();
      expect(canAssignGameRole(sudac, 'Sudac', 'PRVA MUŠKA LIGA')).toBeFalse();
    });

    it('eligible officials vidi admin, kalendar i povjerenika službenih osoba', () => {
      expect(canViewEligibleOfficials(admin)).toBeTrue();
      expect(canViewEligibleOfficials(calendarPov)).toBeTrue();
      expect(canViewEligibleOfficials(officialsPov)).toBeTrue();
      expect(canViewEligibleOfficials(sudac)).toBeFalse();
    });

    it('getManagedCompetitions: admin null, ograničeni povjerenik listu', () => {
      expect(getManagedCompetitions(admin)).toBeNull();
      expect(getManagedCompetitions(calendarPov)).toEqual(['PRVA MUŠKA LIGA']);
      expect(getCalendarCompetitions(calendarPov)).toEqual(['PRVA MUŠKA LIGA']);
    });
  });

  describe('nominacija / raspored', () => {
    it('cap lige sprječava nominaciju iznad najviše lige', () => {
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

    it('zabranjuje terenske kombinacije i Sudac+Povjerenik natjecanja', () => {
      expect(incompatibleRolesMessage(['Sudac', 'Delegat'])).toContain('Sudac');
      expect(incompatibleRolesMessage(['Sudac', 'Kontrolor'])).toContain('Kontrolor');
      expect(incompatibleRolesMessage(['Delegat', 'Kontrolor'])).toContain('Delegat');
      expect(incompatibleRolesMessage(['Sudac', 'Povjerenik natjecanja'])).toContain('Povjerenik natjecanja');
      expect(incompatibleRolesMessage(['Sudac', 'Povjerenik za službene osobe'])).toBeNull();
      expect(incompatibleRolesMessage(['Delegat', 'Povjerenik natjecanja'])).toBeNull();
      expect(isRoleCompatibleWithSelection('Delegat', ['Sudac'])).toBeFalse();
      expect(isRoleCompatibleWithSelection('Kontrolor', ['Sudac'])).toBeFalse();
      expect(isRoleCompatibleWithSelection('Kontrolor', ['Delegat'])).toBeFalse();
      expect(isRoleCompatibleWithSelection('Povjerenik za službene osobe', ['Sudac'])).toBeTrue();
    });

    it('povjerenik ne smije nominirati sami sebe, admin smije', () => {
      const pov = { _id: 'u1', roles: [{ name: 'Povjerenik za službene osobe', competitions: [] }] };
      const admin = { _id: 'u1', roles: [{ name: 'Admin', competitions: [] }] };
      expect(cannotNominateSelf(pov, 'u1')).toBeTrue();
      expect(cannotNominateSelf(pov, 'u2')).toBeFalse();
      expect(cannotNominateSelf(admin, 'u1')).toBeFalse();
    });

    it('kontrolor je obavezan u SuperSportu i na Ćosiću kad igraju dva premijer kluba', () => {
      const premijer = ['SuperSport Premijer liga', 'KUP «K. ĆOSIĆ»'];
      const prva = ['PRVA MUŠKA LIGA', 'KUP «K. ĆOSIĆ»'];
      expect(isKontrolorRequired('SuperSport Premijer liga', premijer, premijer)).toBeTrue();
      expect(isKontrolorRequired('KUP «K. ĆOSIĆ»', premijer, premijer)).toBeTrue();
      expect(isKontrolorRequired('KUP «K. ĆOSIĆ»', premijer, prva)).toBeFalse();
      expect(isKontrolorRequired('PRVA MUŠKA LIGA', premijer, premijer)).toBeFalse();
      expect(isKontrolorRequired('KUP «R. MEGLAJ-RIMAC»', ['PREMIJER ŽENSKA LIGA'], ['PREMIJER ŽENSKA LIGA'])).toBeFalse();
    });

    it('svi muški klubovi igraju Ćosić, ženski Meglaj', () => {
      expect(teamEligibleForCompetition(['PRVA MUŠKA LIGA'], 'KUP «K. ĆOSIĆ»')).toBeTrue();
      expect(teamEligibleForCompetition(['SuperSport Premijer liga'], 'KUP «K. ĆOSIĆ»')).toBeTrue();
      expect(teamEligibleForCompetition(['PREMIJER ŽENSKA LIGA'], 'KUP «R. MEGLAJ-RIMAC»')).toBeTrue();
      expect(teamEligibleForCompetition(['PREMIJER ŽENSKA LIGA'], 'KUP «K. ĆOSIĆ»')).toBeFalse();
      expect(teamEligibleForCompetition(['PRVA MUŠKA LIGA'], 'KUP «R. MEGLAJ-RIMAC»')).toBeFalse();
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
