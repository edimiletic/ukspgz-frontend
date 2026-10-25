import { findRescheduleConflicts } from './reschedule-conflicts';

const ana = { id: 'ana', name: 'Ana Anić', personalCode: '111' };

const otherGame = (over: Record<string, unknown> = {}) => ({
  _id: 'game-b',
  time: '18:00',
  competition: '3X3',
  homeTeam: 'Zadar',
  awayTeam: 'Split',
  refereeAssignments: [
    { userId: { _id: 'ana' }, assignmentStatus: 'Accepted' }
  ],
  ...over
});

describe('findRescheduleConflicts', () => {
  it('blokira premještaj na termin niže utakmice koja ostaje nominirana', () => {
    const message = findRescheduleConflicts({
      date: '2026-11-02',
      time: '18:00',
      gameId: 'game-a',
      officials: [ana],
      gamesOnDate: [otherGame()],
      absences: []
    });

    expect(message).toContain('Ana Anić');
    expect(message).toContain('Zadar vs Split');
    expect(message).toContain('3X3');
    expect(message).toContain('18:00');
  });

  it('ignorira istu utakmicu, odbijenu nominaciju i termin izvan 60 minuta', () => {
    expect(findRescheduleConflicts({
      date: '2026-11-02',
      time: '18:00',
      gameId: 'game-a',
      officials: [ana],
      gamesOnDate: [
        otherGame({ _id: 'game-a', competition: 'SuperSport Premijer liga' }),
        otherGame({
          _id: 'game-c',
          refereeAssignments: [{ userId: 'ana', assignmentStatus: 'Rejected' }]
        }),
        otherGame({ _id: 'game-d', time: '19:00' })
      ],
      absences: []
    })).toBeNull();
  });

  it('blokira premještaj na datum odsustva', () => {
    const message = findRescheduleConflicts({
      date: '2026-11-02',
      time: '18:00',
      gameId: 'game-a',
      officials: [ana],
      gamesOnDate: [],
      absences: [{ userPersonalCode: '111', startDate: '2026-11-01', endDate: '2026-11-02' }]
    });

    expect(message).toContain('odsustvo');
  });

  it('propušta osobu koja nije na drugoj utakmici ni na odsustvu', () => {
    expect(findRescheduleConflicts({
      date: '2026-11-02',
      time: '18:00',
      gameId: 'game-a',
      officials: [ana],
      gamesOnDate: [otherGame({
        refereeAssignments: [{ userId: { _id: 'iva' }, assignmentStatus: 'Pending' }]
      })],
      absences: [{ userPersonalCode: '222', startDate: '2026-11-02', endDate: '2026-11-02' }]
    })).toBeNull();
  });
});
