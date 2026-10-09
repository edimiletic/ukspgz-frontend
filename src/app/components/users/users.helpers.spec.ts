import { User } from '../../model/user.model';
import { apiErrorMessage, buildRoleAssignments, leagueColumnLabel, leagueColumnParts, userMatchesFilters } from './users.helpers';

const sudac: User = {
  _id: '1',
  username: 'sudac1',
  name: 'Josip',
  surname: 'Perić',
  email: 'sudac1@ukspgz.test',
  birthdate: '1990-01-01',
  personalCode: '123',
  address: 'Zagreb',
  role: 'Sudac',
  roles: [{ name: 'Sudac', competitions: [] }]
};

describe('users.helpers', () => {
  it('filtrira po pretrazi i ulozi', () => {
    expect(userMatchesFilters(sudac, 'peri', '')).toBeTrue();
    expect(userMatchesFilters(sudac, 'xyz', '')).toBeFalse();
    expect(userMatchesFilters(sudac, '', 'Sudac')).toBeTrue();
    expect(userMatchesFilters(sudac, '', 'Admin')).toBeFalse();
  });

  it('povjereniku šalje natjecanja, sucu prazan popis (sva natjecanja uz cap)', () => {
    expect(
      buildRoleAssignments(
        ['Sudac', 'Povjerenik za službene osobe'],
        { 'Povjerenik za službene osobe': ['PRVA MUŠKA LIGA'] }
      )
    ).toEqual([
      { name: 'Sudac', competitions: [] },
      { name: 'Povjerenik za službene osobe', competitions: ['PRVA MUŠKA LIGA'] }
    ]);
  });

  it('u stupcu Liga pokazuje najvišu ligu sucu, a povjereniku sva natjecanja', () => {
    expect(leagueColumnLabel({ ...sudac, najvisaLiga: 'SuperSport Premijer liga' })).toBe(
      'SuperSport Premijer liga'
    );
    expect(
      leagueColumnLabel({
        ...sudac,
        role: 'Povjerenik za službene osobe',
        roles: [
          {
            name: 'Povjerenik za službene osobe',
            competitions: ['SuperSport Premijer liga', 'PRVA MUŠKA LIGA']
          }
        ]
      })
    ).toBe('SuperSport Premijer liga, PRVA MUŠKA LIGA');
  });

  it('dvostrukoj ulozi pokazuje teren i nadzor', () => {
    const dual: User = {
      ...sudac,
      najvisaLiga: 'SuperSport Premijer liga',
      roles: [
        { name: 'Sudac', competitions: [] },
        { name: 'Povjerenik za službene osobe', competitions: ['PRVA MUŠKA LIGA'] }
      ]
    };
    expect(leagueColumnParts(dual)).toEqual({
      teren: 'SuperSport Premijer liga',
      nadzor: 'PRVA MUŠKA LIGA'
    });
    expect(leagueColumnLabel(dual)).toBe('Teren: SuperSport Premijer liga · Nadzor: PRVA MUŠKA LIGA');
  });

  it('čita poruku greške iz HTTP tijela umjesto sirovog objekta', () => {
    expect(apiErrorMessage({ error: { error: 'Pristup odbijen' } }, 'Fallback')).toBe('Pristup odbijen');
    expect(apiErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});
