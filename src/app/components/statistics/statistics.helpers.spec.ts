import {
  calculateAbsenceStats,
  calculateCompetitionStats,
  calculateExpenseStats,
  calculateRefereeStats,
  categoryLabel,
  currentSeasonLabel,
  emptyAbsenceStats,
  emptyExpenseStats,
  emptyGradeStats,
  getDateRange,
  getGradeClass,
  getGradeText,
  getRankClass,
  objectKeys,
  processKontrolaData,
  refereesForRole,
  rolePeopleLabel
} from './statistics.helpers';

const filters = (over: Partial<Parameters<typeof getDateRange>[0]> = {}) => ({
  selectedPeriod: 'custom' as const,
  selectedMonth: '03',
  selectedYear: '2026',
  selectedSeason: '2025/2026',
  startDate: '2026-01-10',
  endDate: '2026-01-20',
  ...over
});

const referee = (id: string, role: string, over: Record<string, unknown> = {}) => ({
  _id: id,
  name: 'Ana',
  surname: id,
  personalCode: `pc-${id}`,
  roles: [{ name: role, competitions: [] }],
  ...over
});

describe('statistics.helpers', () => {
  describe('getDateRange', () => {
    it('računa početak i kraj mjeseca', () => {
      expect(getDateRange(filters({ selectedPeriod: 'month', selectedMonth: '02', selectedYear: '2024' })))
        .toEqual({ start: '2024-02-01', end: '2024-02-29' });
    });

    it('računa cijelu godinu', () => {
      expect(getDateRange(filters({ selectedPeriod: 'year', selectedYear: '2026' })))
        .toEqual({ start: '2026-01-01', end: '2026-12-31' });
    });

    it('računa sezonu od rujna do kolovoza', () => {
      expect(getDateRange(filters({ selectedPeriod: 'season', selectedSeason: '2025/2026' })))
        .toEqual({ start: '2025-09-01', end: '2026-08-31' });
    });

    it('vraća custom raspon', () => {
      expect(getDateRange(filters({ selectedPeriod: 'custom' })))
        .toEqual({ start: '2026-01-10', end: '2026-01-20' });
    });
  });

  describe('currentSeasonLabel', () => {
    it('sezona počinje u rujnu', () => {
      expect(currentSeasonLabel(new Date(2026, 8, 1))).toBe('2026/2027');
      expect(currentSeasonLabel(new Date(2026, 0, 15))).toBe('2025/2026');
    });
  });

  describe('refereesForRole', () => {
    const available = {
      sudci: [referee('s1', 'Sudac')],
      delegati: [referee('d1', 'Delegat')],
      pomocniSudci: [referee('p1', 'Pomoćni Sudac')],
      kontrolori: [referee('k1', 'Kontrolor')]
    };

    it('vraća listu za ulogu', () => {
      expect(refereesForRole(available, 'Sudac')).toEqual(available.sudci);
      expect(refereesForRole(available, 'Kontrolor')).toEqual(available.kontrolori);
    });

    it('Admin spaja suce, delegate i pomoćne, bez kontrolora', () => {
      expect(refereesForRole(available, 'Admin').map(r => r._id)).toEqual(['s1', 'd1', 'p1']);
    });
  });

  describe('calculateRefereeStats', () => {
    const sudac = referee('u1', 'Sudac', { name: 'Iva', surname: 'Ivić' });

    it('broji samo Accepted nominacije i ignorira ostale uloge', () => {
      const games = [
        {
          competition: 'FAVBET PREMIJER LIGA',
          refereeAssignments: [
            { assignmentStatus: 'Accepted', role: 'Sudac', userId: { _id: 'u1' } },
            { assignmentStatus: 'Pending', role: 'Sudac', userId: { _id: 'u1' } }
          ]
        },
        {
          competition: '3X3',
          refereeAssignments: [
            { assignmentStatus: 'Accepted', role: 'Sudac', userId: { _id: 'u1' } }
          ]
        }
      ];

      const stats = calculateRefereeStats(games, [sudac], 'Sudac');
      expect(stats.length).toBe(1);
      expect(stats[0].gamesInPeriod).toBe(2);
      expect(stats[0].competitions['FAVBET PREMIJER LIGA']).toBe(1);
      expect(stats[0].competitions['3X3']).toBe(1);
    });

    it('izbacuje suce bez utakmica u razdoblju', () => {
      expect(calculateRefereeStats([], [sudac], 'Sudac')).toEqual([]);
    });
  });

  describe('calculateCompetitionStats', () => {
    it('broji utakmice i distinct suce po ligi', () => {
      const games = [
        {
          competition: '3X3',
          refereeAssignments: [
            { assignmentStatus: 'Accepted', role: 'Sudac', userId: { _id: 'a' } },
            { assignmentStatus: 'Accepted', role: 'Sudac', userId: { _id: 'b' } },
            { assignmentStatus: 'Rejected', role: 'Sudac', userId: { _id: 'c' } }
          ]
        }
      ];
      const [row] = calculateCompetitionStats(games, 'Sudac');
      expect(row.totalGames).toBe(1);
      expect(row.totalReferees).toBe(2);
      expect(row.avgRefereesPerGame).toBe(2);
    });
  });

  describe('calculateAbsenceStats', () => {
    it('zbraja dane koji se preklapaju s rasponom, samo za odabranu ulogu', () => {
      const available = {
        sudci: [referee('s1', 'Sudac', { personalCode: '111', name: 'Marko', surname: 'M' })],
        delegati: [referee('d1', 'Delegat', { personalCode: '222' })],
        pomocniSudci: [],
        kontrolori: []
      };
      const absences = [
        { userPersonalCode: '111', startDate: '2026-01-10', endDate: '2026-01-12' },
        { userPersonalCode: '222', startDate: '2026-01-10', endDate: '2026-01-12' }
      ];
      const stats = calculateAbsenceStats(absences, available, 'Sudac', {
        start: '2026-01-01',
        end: '2026-01-31'
      });
      expect(stats.totalAbsences).toBe(1);
      expect(stats.totalDays).toBe(3);
      expect(stats.byReferee['Marko M']).toBe(3);
    });
  });

  describe('calculateExpenseStats', () => {
    it('zbraja iznose stavki za korisnike u ulozi', () => {
      const available = {
        sudci: [referee('s1', 'Sudac', { name: 'Iva', surname: 'I' })],
        delegati: [],
        pomocniSudci: [],
        kontrolori: []
      };
      const expenses = [
        {
          userId: 's1',
          createdAt: '2026-01-15T10:00:00.000Z',
          state: 'Predano',
          type: 'Troškovno izvješće suca',
          expenses: [{ amount: '10' }, { amount: '5.5' }]
        }
      ];
      const stats = calculateExpenseStats(expenses, available, 'Sudac', {
        start: '2026-01-01',
        end: '2026-01-31'
      });
      expect(stats.totalExpenses).toBe(1);
      expect(stats.totalAmount).toBe(15.5);
      expect(stats.byReferee['Iva I'].amount).toBe(15.5);
      expect(stats.byStatus['Predano']).toBe(1);
    });
  });

  describe('processKontrolaData', () => {
    it('raćuna prosjek ocjena za odabranu ulogu', () => {
      const stats = processKontrolaData([
        {
          refereeGrades: [
            {
              refereeName: 'Iva Ivić',
              refereeId: 'u1',
              refereeRole: 'Sudac',
              ocjena: 'Izvrsno',
              pogreske: 'Prosječno',
              prekrsaji: 'Prosječno',
              tehnikaMehanika: 'Prosječno',
              timskiRad: 'Prosječno',
              kontrolaUtakmice: 'Prosječno'
            },
            {
              refereeName: 'Delegat X',
              refereeId: 'd1',
              refereeRole: 'Delegat',
              ocjena: 'Loše'
            }
          ]
        }
      ], 'Sudac');

      expect(stats.totalEvaluations).toBe(1);
      expect(stats.gradeDistribution['Izvrsno']).toBe(1);
      expect(stats.byReferee['Iva Ivić'].averageGrade).toBeCloseTo((5 + 3 + 3 + 3 + 3 + 3) / 6);
      expect(stats.byReferee['Delegat X']).toBeUndefined();
    });
  });

  describe('prikaz', () => {
    it('mapira ocjene, rang i labele', () => {
      expect(getGradeClass(4.6)).toBe('excellent');
      expect(getGradeText(3.2)).toBe('Prosječno');
      expect(getRankClass(1)).toBe('gold');
      expect(getRankClass(4)).toBe('');
      expect(categoryLabel('timskiRad')).toBe('Timski Rad');
      expect(rolePeopleLabel('Sudac')).toBe('sudaca');
      expect(objectKeys({ a: 1 })).toEqual(['a']);
    });

    it('empty statistike imaju nule', () => {
      expect(emptyGradeStats().totalEvaluations).toBe(0);
      expect(emptyAbsenceStats().totalDays).toBe(0);
      expect(emptyExpenseStats().totalAmount).toBe(0);
    });
  });
});
