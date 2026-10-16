import { Absence } from '../../../model/absence.model';
import { GameFormData, RefereeSelection } from '../../../model/basketballGame.model';
import { User } from '../../../model/user.model';
import {
  assignmentUserId,
  eligibleOfficials,
  formatRejectionWhen,
  gameFormError,
  isRefereeAvailable,
  refereeAssignmentError,
  sudacSlotsFromAssignments,
  unavailableOfficialsCount
} from './edit-game-modal.helpers';

function official(partial: Partial<User> & Pick<User, '_id'>): User {
  return {
    username: partial.username || partial._id,
    name: partial.name || 'Ime',
    surname: partial.surname || 'Prezime',
    email: `${partial._id}@ukspgz.test`,
    birthdate: '1990-01-01',
    personalCode: partial.personalCode || '100',
    address: 'Zagreb',
    role: partial.role || 'Sudac',
    roles: partial.roles || [{ name: partial.role || 'Sudac', competitions: [] }],
    najvisaLiga: partial.najvisaLiga || 'SuperSport Premijer liga',
    ...partial
  };
}

const form = (overrides: Partial<GameFormData> = {}): GameFormData => ({
  homeTeam: 'Cibona',
  awayTeam: 'Zadar',
  date: '2026-11-01',
  time: '18:00',
  venue: 'Draženov dom',
  competition: 'SuperSport Premijer liga',
  notes: '',
  ...overrides
});

describe('edit-game-modal.helpers', () => {
  it('assignmentUserId čita i objekt i string', () => {
    expect(assignmentUserId({ userId: { _id: 'u1' } })).toBe('u1');
    expect(assignmentUserId({ userId: 'u2' })).toBe('u2');
    expect(assignmentUserId({ userId: null })).toBe('');
  });

  it('eligibleOfficials izbacuje suca iznad capa i actor-a koji se ne smije nominirati', () => {
    const actor = official({
      _id: 'me',
      role: 'Povjerenik za službene osobe',
      roles: [{ name: 'Povjerenik za službene osobe', competitions: [] }]
    });
    const capOk = official({ _id: 'ok', najvisaLiga: 'SuperSport Premijer liga' });
    const tooLow = official({ _id: 'low', najvisaLiga: 'PRVA MUŠKA LIGA' });

    const result = eligibleOfficials([capOk, tooLow, actor], 'SuperSport Premijer liga', actor);
    expect(result.map((r) => r._id)).toEqual(['ok']);
  });

  it('Premijer ženska je ispod Prve muške: svi suci u capu smiju suditi', () => {
    const actor = official({
      _id: 'me',
      role: 'Povjerenik za službene osobe',
      roles: [{ name: 'Povjerenik za službene osobe', competitions: [] }]
    });
    const supersport = official({ _id: 'ss', najvisaLiga: 'SuperSport Premijer liga' });
    const prvaMuska = official({ _id: 'pm', najvisaLiga: 'PRVA MUŠKA LIGA' });
    const zenska = official({ _id: 'pz', najvisaLiga: 'PREMIJER ŽENSKA LIGA' });

    expect(
      eligibleOfficials([supersport, prvaMuska, zenska, actor], 'PREMIJER ŽENSKA LIGA', actor).map((r) => r._id)
    ).toEqual(['ss', 'pm', 'pz']);
  });

  it('admin smije nominirati samog sebe ako je u capu', () => {
    const admin = official({
      _id: 'me',
      role: 'Admin',
      roles: [{ name: 'Admin', competitions: [] }, { name: 'Sudac', competitions: [] }],
      najvisaLiga: 'SuperSport Premijer liga'
    });
    expect(eligibleOfficials([admin], 'SuperSport Premijer liga', admin).map((r) => r._id)).toEqual(['me']);
  });

  it('isRefereeAvailable: odsustvo tog dana isključuje suca', () => {
    const ref = official({ _id: 'r1', personalCode: '555' });
    const absences: Absence[] = [
      { _id: 'a1', startDate: '2026-11-01', endDate: '2026-11-02', userPersonalCode: '555' }
    ];
    expect(
      isRefereeAvailable(ref, {
        date: '2026-11-01',
        time: '18:00',
        competition: 'SuperSport Premijer liga',
        absences,
        gamesOnDate: []
      })
    ).toBeFalse();
  });

  it('isRefereeAvailable: overlapping utakmica na istoj razini isključuje suca, druga utakmica iste osobe se ignorira', () => {
    const ref = official({ _id: 'r1', personalCode: '555' });
    expect(
      isRefereeAvailable(ref, {
        date: '2026-11-01',
        time: '18:00',
        competition: 'SuperSport Premijer liga',
        currentGameId: 'this',
        absences: [],
        gamesOnDate: [
          {
            _id: 'this',
            time: '18:00',
            competition: 'SuperSport Premijer liga',
            refereeAssignments: [{ userId: 'r1', assignmentStatus: 'Accepted' }]
          },
          {
            _id: 'other',
            time: '18:00',
            competition: 'SuperSport Premijer liga',
            refereeAssignments: [{ userId: { _id: 'r1' }, assignmentStatus: 'Pending' }]
          }
        ]
      })
    ).toBeFalse();
  });

  it('isRefereeAvailable: Rejected nominacija ne blokira', () => {
    const ref = official({ _id: 'r1', personalCode: '555' });
    expect(
      isRefereeAvailable(ref, {
        date: '2026-11-01',
        time: '18:00',
        competition: 'SuperSport Premijer liga',
        absences: [],
        gamesOnDate: [
          {
            _id: 'other',
            time: '18:00',
            competition: 'SuperSport Premijer liga',
            refereeAssignments: [{ userId: 'r1', assignmentStatus: 'Rejected' }]
          }
        ]
      })
    ).toBeTrue();
  });

  it('gameFormError pokriva prazna polja i iste timove', () => {
    expect(gameFormError(form({ homeTeam: '  ' }))).toBe('Domaći tim je obavezan.');
    expect(gameFormError(form({ awayTeam: 'Cibona' }))).toBe('Domaći i gostujući tim ne mogu biti isti.');
    expect(gameFormError(form({ date: '' }))).toBe('Datum je obavezan.');
    expect(gameFormError(form())).toBeNull();
  });

  it('refereeAssignmentError traži 3 suca, delegata, kontrolora i jedinstvene osobe', () => {
    const incomplete: RefereeSelection = {
      sudci: [
        { userId: 's1', position: 1 },
        { userId: 's2', position: 2 },
        { userId: '', position: 3 }
      ],
      delegat: '',
      kontrolor: ''
    };
    expect(refereeAssignmentError(incomplete, { canNominate: false, kontrolorRequired: true })).toBeNull();
    expect(refereeAssignmentError(incomplete, { canNominate: true, kontrolorRequired: true })).toBe(
      'Potrebno je odabrati 3 suca.'
    );

    const noDelegat: RefereeSelection = {
      sudci: [
        { userId: 's1', position: 1 },
        { userId: 's2', position: 2 },
        { userId: 's3', position: 3 }
      ],
      delegat: '',
      kontrolor: 'k1'
    };
    expect(refereeAssignmentError(noDelegat, { canNominate: true, kontrolorRequired: true })).toBe(
      'Delegat je obavezan.'
    );

    const noKontrolor: RefereeSelection = { ...noDelegat, delegat: 'd1', kontrolor: '' };
    expect(refereeAssignmentError(noKontrolor, { canNominate: true, kontrolorRequired: true })).toBe(
      'Kontrolor je obavezan na ovom natjecanju.'
    );
    expect(refereeAssignmentError(noKontrolor, { canNominate: true, kontrolorRequired: false })).toBeNull();

    const dup: RefereeSelection = { ...noDelegat, delegat: 's1', kontrolor: 'k1' };
    expect(refereeAssignmentError(dup, { canNominate: true, kontrolorRequired: true })).toBe(
      'Isti sudac ne može biti dodijeljen više puta.'
    );
  });

  it('unavailableOfficialsCount broji samo kad ima datum i vrijeme', () => {
    const refs = [official({ _id: 'a' }), official({ _id: 'b' })];
    expect(unavailableOfficialsCount(refs, () => false, false)).toBe(0);
    expect(unavailableOfficialsCount(refs, (r) => r._id === 'a', true)).toBe(1);
  });

  it('formatRejectionWhen formatira datum', () => {
    expect(formatRejectionWhen('nije-datum')).toBe('');
    expect(formatRejectionWhen('2026-10-20T18:00:00.000Z')).toMatch(/2026/);
  });

  it('sudacSlotsFromAssignments drži mjesta 1-2-3 kad fali sudac 2', () => {
    const slots = sudacSlotsFromAssignments([
      { role: 'Sudac', userId: { _id: 's1' }, position: 1 },
      { role: 'Sudac', userId: { _id: 's3' }, position: 3 },
      { role: 'Delegat', userId: { _id: 'd1' }, position: 1 }
    ]);
    expect(slots.map((slot) => slot.position)).toEqual([1, 2, 3]);
    expect(slots.map((slot) => slot.userId)).toEqual(['s1', '', 's3']);
  });
});
