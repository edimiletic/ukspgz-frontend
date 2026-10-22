import { BasketballGame, RefereeAssignment } from '../../model/basketballGame.model';
import {
  categorizeGames,
  EMPTY_GAME_FILTERS,
  filterGames,
  formatGameDate,
  gameStatusClass,
  gameStatusDisplay,
  hasActiveFilters,
  isGameInPast,
  isGameUpcoming,
  nominationDecisionDetails,
  ownPendingNominations,
  pageWindow,
  paginate,
  refereesFormatted,
  teamsDisplay
} from './games-assigned.helpers';

function assignment(
  userId: string,
  role: RefereeAssignment['role'],
  status: RefereeAssignment['assignmentStatus'],
  position = 1
): RefereeAssignment {
  return {
    _id: `${userId}-${role}`,
    userId: { _id: userId, name: 'Ime', surname: userId, role },
    role,
    position,
    assignmentStatus: status,
    assignedAt: '2026-01-01'
  };
}

function game(partial: Partial<BasketballGame> & Pick<BasketballGame, '_id' | 'date' | 'time'>): BasketballGame {
  return {
    homeTeam: 'Cibona',
    awayTeam: 'Zadar',
    venue: 'Zagreb',
    competition: 'SuperSport Premijer liga',
    status: 'Scheduled',
    refereeAssignments: [],
    ...partial
  };
}

describe('games-assigned.helpers', () => {
  const now = new Date('2026-10-14T12:00:00');

  it('razlikuje nadolazeću i prošlu utakmicu po datumu i vremenu', () => {
    expect(isGameUpcoming(game({ _id: '1', date: '2026-10-14', time: '18:00' }), now)).toBeTrue();
    expect(isGameInPast(game({ _id: '1', date: '2026-10-14', time: '09:00' }), now)).toBeTrue();
  });

  it('pregled svih utakmica: upcoming u pending, past u history, bez confirmed', () => {
    const upcoming = game({ _id: 'u', date: '2026-10-20', time: '18:00' });
    const past = game({ _id: 'p', date: '2026-10-01', time: '18:00' });
    expect(categorizeGames([upcoming, past], { seeAllGames: true, userId: 'me', now })).toEqual({
      pending: [upcoming],
      confirmed: [],
      history: [past]
    });
  });

  it('sudac: pending / accepted upcoming / accepted past i rejected u history', () => {
    const pending = game({
      _id: 'pend',
      date: '2026-10-20',
      time: '18:00',
      refereeAssignments: [assignment('me', 'Sudac', 'Pending')]
    });
    const acceptedSoon = game({
      _id: 'soon',
      date: '2026-10-20',
      time: '18:00',
      refereeAssignments: [assignment('me', 'Sudac', 'Accepted')]
    });
    const acceptedPast = game({
      _id: 'past',
      date: '2026-10-01',
      time: '18:00',
      refereeAssignments: [assignment('me', 'Sudac', 'Accepted')]
    });
    const rejected = game({
      _id: 'rej',
      date: '2026-10-20',
      time: '18:00',
      refereeAssignments: [assignment('me', 'Sudac', 'Rejected')]
    });
    const other = game({
      _id: 'other',
      date: '2026-10-20',
      time: '18:00',
      refereeAssignments: [assignment('x', 'Sudac', 'Pending')]
    });

    const buckets = categorizeGames([pending, acceptedSoon, acceptedPast, rejected, other], {
      seeAllGames: false,
      userId: 'me',
      now
    });
    expect(buckets.pending.map((g) => g._id)).toEqual(['pend']);
    expect(buckets.confirmed.map((g) => g._id)).toEqual(['soon']);
    expect(buckets.history.map((g) => g._id)).toEqual(['past', 'rej']);
  });

  it('filteri: startsWith na tim/mjestu i točan datum', () => {
    const a = game({ _id: '1', date: '2026-10-20', time: '18:00', homeTeam: 'Cibona', venue: 'Zagreb' });
    const b = game({ _id: '2', date: '2026-10-21', time: '18:00', homeTeam: 'Zadar', venue: 'Zadar' });
    expect(filterGames([a, b], { ...EMPTY_GAME_FILTERS, homeTeam: 'cib' }).map((g) => g._id)).toEqual(['1']);
    expect(filterGames([a, b], { ...EMPTY_GAME_FILTERS, date: '2026-10-21' }).map((g) => g._id)).toEqual(['2']);
    expect(hasActiveFilters(EMPTY_GAME_FILTERS)).toBeFalse();
    expect(hasActiveFilters({ ...EMPTY_GAME_FILTERS, venue: 'Zag' })).toBeTrue();
  });

  it('paginate steže stranicu i pageWindow daje ±2', () => {
    const items = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11];
    expect(paginate(items, 1, 10)).toEqual({ page: 1, totalPages: 2, items: items.slice(0, 10) });
    expect(paginate(items, 9, 10).page).toBe(2);
    expect(paginate([], 3, 10)).toEqual({ page: 1, totalPages: 0, items: [] });
    expect(pageWindow(1, 5)).toEqual([1, 2, 3]);
    expect(pageWindow(4, 5)).toEqual([2, 3, 4, 5]);
  });

  it('status: pregled pokazuje Odigrano za prošli Scheduled, sudac vidi nominaciju', () => {
    const pastScheduled = game({ _id: 'p', date: '2026-10-01', time: '18:00', status: 'Scheduled' });
    expect(gameStatusDisplay(pastScheduled, { seeAllGames: true, userId: 'me', now })).toBe('Odigrano');
    expect(gameStatusClass(pastScheduled, { seeAllGames: true, userId: 'me', now })).toBe('status-accepted');

    const pending = game({
      _id: 'n',
      date: '2026-10-20',
      time: '18:00',
      refereeAssignments: [assignment('me', 'Sudac', 'Pending')]
    });
    expect(gameStatusDisplay(pending, { seeAllGames: false, userId: 'me', now })).toBe('Na čekanju');
    expect(gameStatusClass(pending, { seeAllGames: false, userId: 'me', now })).toBe('status-pending');
  });

  it('formatira ekipe, datum i sudački tim s Vi za trenutnog korisnika', () => {
    const g = game({
      _id: '1',
      date: '2026-10-20T00:00:00',
      time: '18:00',
      refereeAssignments: [
        assignment('me', 'Sudac', 'Accepted', 1),
        assignment('other', 'Delegat', 'Pending', 1)
      ]
    });
    expect(teamsDisplay(g)).toBe('Cibona vs Zadar');
    expect(formatGameDate(g.date)).toContain('2026');
    expect(refereesFormatted(g, { seeAllGames: false, userId: 'me' })).toEqual([
      { label: 'Sudci', text: 'Vi (potvrđeno)' },
      { label: 'Delegat', text: 'Ime other (na čekanju)' }
    ]);
  });

  it('izdvaja vlastite pending nominacije i detalje odluke', () => {
    const pending = game({
      _id: 'p',
      date: '2026-10-20T00:00:00',
      time: '18:00',
      refereeAssignments: [assignment('me', 'Sudac', 'Pending')]
    });
    const accepted = game({
      _id: 'a',
      date: '2026-10-21T00:00:00',
      time: '19:00',
      refereeAssignments: [assignment('me', 'Sudac', 'Accepted')]
    });
    expect(ownPendingNominations([pending, accepted], 'me').map((g) => g._id)).toEqual(['p']);
    expect(nominationDecisionDetails(pending)).toEqual([
      'Cibona vs Zadar',
      `${formatGameDate(pending.date)} u 18:00`,
      'Zagreb',
      'SuperSport Premijer liga'
    ]);
  });
});
