import { BasketballGame, RefereeAssignment } from '../../model/basketballGame.model';
import { TravelExpense } from '../../model/travel-expense.model';
import {
  countOwnPendingNominations,
  greetingForHour,
  homeGameStatusText,
  summarizeOfficialGames,
  summarizeOverviewExpenses,
  summarizeOverviewGames,
  summarizeUserExpenses,
  welcomeMessage
} from './home.helpers';

function assignment(userId: string, status: RefereeAssignment['assignmentStatus']): RefereeAssignment {
  return {
    _id: `${userId}-${status}`,
    userId: { _id: userId, name: 'Ime', surname: 'Prezime', role: 'Sudac' },
    role: 'Sudac',
    position: 1,
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

describe('home.helpers', () => {
  const now = new Date('2026-10-14T12:00:00');

  it('broji vlastite pending nominacije', () => {
    const games = [
      game({ _id: '1', date: '2026-10-20', time: '18:00', refereeAssignments: [assignment('me', 'Pending')] }),
      game({ _id: '2', date: '2026-10-20', time: '18:00', refereeAssignments: [assignment('me', 'Accepted')] }),
      game({ _id: '3', date: '2026-10-20', time: '18:00', refereeAssignments: [assignment('x', 'Pending')] })
    ];
    expect(countOwnPendingNominations(games, 'me')).toBe(1);
  });

  it('sudac: pending, upcoming accepted i 3 zadnje odigrane', () => {
    const summary = summarizeOfficialGames(
      [
        game({ _id: 'p', date: '2026-10-20', time: '18:00', refereeAssignments: [assignment('me', 'Pending')] }),
        game({ _id: 'u', date: '2026-10-20', time: '18:00', refereeAssignments: [assignment('me', 'Accepted')] }),
        game({ _id: 'old1', date: '2026-10-01', time: '18:00', refereeAssignments: [assignment('me', 'Accepted')] }),
        game({ _id: 'old2', date: '2026-09-01', time: '18:00', refereeAssignments: [assignment('me', 'Accepted')] })
      ],
      'me',
      now
    );
    expect(summary.pendingGames).toBe(1);
    expect(summary.upcomingGames).toBe(1);
    expect(summary.recentGames.map((g) => g._id)).toEqual(['old1', 'old2']);
  });

  it('pregled: upcoming/completed i 5 najnovijih po createdAt', () => {
    const games = [
      game({ _id: 'future', date: '2026-10-20', time: '18:00', createdAt: '2026-01-01' }),
      game({ _id: 'past', date: '2026-10-01', time: '18:00', createdAt: '2026-10-10' })
    ];
    const summary = summarizeOverviewGames(games, now);
    expect(summary.totalGames).toBe(2);
    expect(summary.upcomingGames).toBe(1);
    expect(summary.completedGames).toBe(1);
    expect(summary.recentGames[0]._id).toBe('past');
  });

  it('putni: sudac broji Predano+Odbijeno, pregled samo Predano', () => {
    const expenses = [
      { id: '1', state: 'Predano', createdAt: '2026-10-01' },
      { id: '2', state: 'Odbijeno', createdAt: '2026-10-02' },
      { id: '3', state: 'Potvrđeno', createdAt: '2026-10-03' }
    ] as TravelExpense[];
    expect(summarizeUserExpenses(expenses).pendingExpenses).toBe(2);
    expect(summarizeOverviewExpenses(expenses).pendingExpenses).toBe(1);
    expect(summarizeOverviewExpenses(expenses).totalExpenses).toBe(3);
  });

  it('pozdrav i welcome poruka ovise o satu i ulogama', () => {
    expect(greetingForHour(8)).toBe('Dobro jutro');
    expect(greetingForHour(15)).toBe('Dobar dan');
    expect(greetingForHour(20)).toBe('Dobra večer');
    expect(
      welcomeMessage({
        isAdmin: false,
        canManageCalendar: true,
        canNominateOfficials: true,
        isFieldOfficial: false
      })
    ).toContain('dogovarati kalendar');
    expect(
      welcomeMessage({
        isAdmin: true,
        canManageCalendar: true,
        canNominateOfficials: true,
        isFieldOfficial: true
      })
    ).toContain('administratorski');
  });

  it('status teksta za scheduled ovisi o tome je li utakmica prošla', () => {
    expect(homeGameStatusText(game({ _id: '1', date: '2026-10-20', time: '18:00' }), now)).toBe('Nadolazi');
    expect(homeGameStatusText(game({ _id: '1', date: '2026-10-01', time: '18:00' }), now)).toBe('Završeno');
  });
});
