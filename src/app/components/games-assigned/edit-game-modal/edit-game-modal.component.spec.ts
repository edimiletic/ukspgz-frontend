import { TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EditGameModalComponent } from './edit-game-modal.component';
import { BasketballGameService } from '../../../services/basketballGame.service';
import { UserService } from '../../../services/user.service';
import { AbsenceService } from '../../../services/absence.service';
import { AuthService } from '../../../services/login.service';
import { CatalogService } from '../../../services/catalog.service';
import { BasketballGame } from '../../../model/basketballGame.model';

describe('EditGameModalComponent assignment save', () => {
  let component: EditGameModalComponent;
  let games: jasmine.SpyObj<Pick<BasketballGameService, 'removeRefereeAssignment' | 'assignReferee' | 'updateRefereeAssignment' | 'getGamesOnDate' | 'notifyColleagueReplacement'>>;

  const game = {
    _id: 'g1',
    homeTeam: 'A',
    awayTeam: 'B',
    date: '2026-10-18',
    time: '18:00',
    venue: 'Dvorana',
    competition: '3X3',
    status: 'Scheduled',
    refereeAssignments: [
      {
        _id: 'as-old',
        userId: { _id: 'old-user', name: 'Iva', surname: 'Ivić', role: 'Sudac' },
        role: 'Sudac',
        position: 1,
        assignmentStatus: 'Accepted',
        assignedAt: '2026-10-01T00:00:00.000Z'
      }
    ]
  } as BasketballGame;

  beforeEach(async () => {
    games = jasmine.createSpyObj('BasketballGameService', [
      'removeRefereeAssignment',
      'assignReferee',
      'updateRefereeAssignment',
      'getGamesOnDate',
      'notifyColleagueReplacement'
    ]);
    games.removeRefereeAssignment.and.returnValue(of(game));
    games.assignReferee.and.returnValue(of(game));
    games.updateRefereeAssignment.and.returnValue(of(game));
    games.getGamesOnDate.and.returnValue(of([]));
    games.notifyColleagueReplacement.and.returnValue(of({ notified: 0 }));

    await TestBed.configureTestingModule({
      imports: [EditGameModalComponent],
      providers: [
        { provide: BasketballGameService, useValue: games },
        { provide: UserService, useValue: { getReferees: () => of([]) } },
        { provide: AbsenceService, useValue: { getAllAbsences: () => of([]) } },
        { provide: CatalogService, useValue: { getTeams: () => of([]), getVenues: () => of([]) } },
        {
          provide: AuthService,
          useValue: { currentUserValue: { role: 'Admin', roles: [{ name: 'Admin', competitions: [] }] } }
        }
      ]
    }).compileComponents();

    component = TestBed.createComponent(EditGameModalComponent).componentInstance;
    component.game = game;
    component.gameForm.competition = '3X3';
    component.selectedReferees = {
      sudci: [{ userId: 'new-user', position: 1 }],
      delegat: '',
      kontrolor: '',
      pomocniSudci: []
    };
  });

  it('vraća skinutog suca ako nova nominacija ne uspije', async () => {
    games.assignReferee.and.callFake((_gameId: string, data: { userId: string }) => {
      if (data.userId === 'new-user') {
        return throwError(() => ({ status: 400 }));
      }
      return of(game);
    });

    await expectAsync((component as any).updateRefereeAssignments()).toBeRejected();

    expect(games.removeRefereeAssignment).toHaveBeenCalledWith('g1', 'as-old');
    expect(games.assignReferee).toHaveBeenCalledWith('g1', {
      userId: 'new-user',
      role: 'Sudac',
      position: 1
    });
    expect(games.assignReferee).toHaveBeenCalledWith('g1', {
      userId: 'old-user',
      role: 'Sudac',
      position: 1
    });
  });

  it('nastavlja zamjenu ako je stara nominacija već obrisana', async () => {
    games.removeRefereeAssignment.and.returnValue(throwError(() => ({ status: 404 })));
    games.assignReferee.and.returnValue(of({
      ...game,
      refereeAssignments: [
        {
          _id: 'as-new',
          userId: { _id: 'new-user', name: 'Ana', surname: 'Anić', role: 'Sudac' },
          role: 'Sudac',
          position: 1,
          assignmentStatus: 'Pending',
          assignedAt: '2026-10-11T00:00:00.000Z'
        }
      ]
    }));

    const result = await (component as any).updateRefereeAssignments();

    expect(result.newAssignments).toBe(1);
    expect(games.assignReferee).toHaveBeenCalledTimes(1);
    expect(games.assignReferee).toHaveBeenCalledWith('g1', {
      userId: 'new-user',
      role: 'Sudac',
      position: 1
    });
  });

  it('ne vraća staru nominaciju kad je zamjena spremljena', async () => {
    games.assignReferee.and.returnValue(of({
      ...game,
      refereeAssignments: [
        {
          _id: 'as-new',
          userId: { _id: 'new-user', name: 'Ana', surname: 'Anić', role: 'Sudac' },
          role: 'Sudac',
          position: 1,
          assignmentStatus: 'Pending',
          assignedAt: '2026-10-11T00:00:00.000Z'
        }
      ]
    }));

    await (component as any).updateRefereeAssignments();

    expect(games.removeRefereeAssignment).toHaveBeenCalledTimes(1);
    expect(games.assignReferee).toHaveBeenCalledTimes(1);
  });
});
