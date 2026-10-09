import { User } from '../../model/user.model';
import {
  apiErrorMessage,
  buildRoleAssignments,
  commissionerHolders,
  remainingRolesAfterCommissionerTake,
  leagueColumnLabel,
  leagueColumnParts,
  userMatchesFilters,
  CommissionerHolder
} from './users.helpers';

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

  it('pokazuje tko već vodi ligu za istu ulogu povjerenika', () => {
    const petra: User = {
      ...sudac,
      _id: 'p1',
      name: 'Petra',
      surname: 'Babić',
      role: 'Povjerenik za službene osobe',
      roles: [{ name: 'Povjerenik za službene osobe', competitions: ['PRVA MUŠKA LIGA'] }]
    };
    const holders = commissionerHolders([petra, sudac], 'new');
    expect(holders['Povjerenik za službene osobe']?.['PRVA MUŠKA LIGA']?.label).toBe('Petra Babić');
    expect(commissionerHolders([petra], 'p1')['Povjerenik za službene osobe']?.['PRVA MUŠKA LIGA']).toBeUndefined();
  });

  it('preuzimanjem zadnje lige ostavlja suca u sustavu, a čistog povjerenika bez uloge', () => {
    const petra: CommissionerHolder = {
      _id: 'p1',
      label: 'Petra Babić',
      competitions: ['PRVA MUŠKA LIGA'],
      roleNames: ['Povjerenik za službene osobe']
    };
    const dual: CommissionerHolder = {
      _id: 'd1',
      label: 'Josip Perić',
      competitions: ['PRVA MUŠKA LIGA'],
      roleNames: ['Sudac', 'Povjerenik za službene osobe']
    };
    expect(remainingRolesAfterCommissionerTake(petra, 'Povjerenik za službene osobe', ['PRVA MUŠKA LIGA'])).toEqual(
      []
    );
    expect(remainingRolesAfterCommissionerTake(dual, 'Povjerenik za službene osobe', ['PRVA MUŠKA LIGA'])).toEqual([
      'Sudac'
    ]);
  });

  it('čita poruku greške iz HTTP tijela umjesto sirovog objekta', () => {
    expect(apiErrorMessage({ error: { error: 'Pristup odbijen' } }, 'Fallback')).toBe('Pristup odbijen');
    expect(apiErrorMessage({}, 'Fallback')).toBe('Fallback');
  });
});
