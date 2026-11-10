import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, Subject } from 'rxjs';
import { EditGameModalComponent } from './edit-game-modal.component';
import { BasketballGameService } from '../../../services/basketballGame.service';
import { UserService } from '../../../services/user.service';
import { AbsenceService } from '../../../services/absence.service';
import { AuthService } from '../../../services/login.service';
import { CatalogService } from '../../../services/catalog.service';
import { BasketballGame } from '../../../model/basketballGame.model';

describe('EditGameModalComponent', () => {
  let fixture: ComponentFixture<EditGameModalComponent>;
  let component: EditGameModalComponent;
  let gameService: jasmine.SpyObj<BasketballGameService>;

  const admin = {
    _id: 'admin-1',
    role: 'Admin',
    roles: [{ name: 'Admin', competitions: [] }]
  };

  function scheduledGame(): BasketballGame {
    return {
      _id: 'game-1',
      homeTeam: 'Cibona',
      awayTeam: 'Zadar',
      date: '2026-11-20',
      time: '18:00',
      venue: 'Dražen',
      competition: 'SuperSport Premijer liga',
      status: 'Scheduled',
      refereeAssignments: [
        {
          _id: 'asg-a',
          userId: { _id: 'old-ref', name: 'Stari', surname: 'Sudac', role: 'Sudac' },
          role: 'Sudac',
          position: 1,
          assignmentStatus: 'Accepted',
          assignedAt: '2026-11-01T00:00:00.000Z'
        }
      ]
    };
  }

  beforeEach(async () => {
    gameService = jasmine.createSpyObj('BasketballGameService', [
      'createGame',
      'updateGame',
      'assignReferee',
      'removeRefereeAssignment',
      'updateRefereeAssignment',
      'notifyColleagueReplacement'
    ]);
    gameService.updateGame.and.returnValue(of(scheduledGame()));
    gameService.assignReferee.and.returnValue(of(scheduledGame()));
    gameService.removeRefereeAssignment.and.returnValue(of(scheduledGame()));
    gameService.updateRefereeAssignment.and.returnValue(of(scheduledGame()));
    gameService.notifyColleagueReplacement.and.returnValue(of({ notified: 0 }));

    await TestBed.configureTestingModule({
      imports: [EditGameModalComponent],
      providers: [
        { provide: BasketballGameService, useValue: gameService },
        { provide: UserService, useValue: {} },
        { provide: AbsenceService, useValue: {} },
        { provide: AuthService, useValue: { currentUserValue: admin } },
        {
          provide: CatalogService,
          useValue: {
            getTeams: () => of([]),
            getVenues: () => of([])
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditGameModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  function fillReplacementForm(game: BasketballGame): void {
    component.game = game;
    component.gameForm = {
      homeTeam: game.homeTeam,
      awayTeam: game.awayTeam,
      date: game.date,
      time: game.time,
      venue: game.venue,
      competition: game.competition,
      notes: '',
      status: game.status
    };
    component.selectedReferees = {
      sudci: [
        { userId: 'new-1', position: 1 },
        { userId: 'new-2', position: 2 }
      ],
      delegat: '',
      kontrolor: '',
      pomocniSudci: [
        { userId: 'p1', position: 1 },
        { userId: 'p2', position: 2 }
      ]
    };
  }

  it('ignores a close request while the save is in flight', () => {
    const closeSpy = jasmine.createSpy('close');
    component.close.subscribe(closeSpy);
    component.gameForm.homeTeam = 'Cibona';
    component.isLoading = true;

    component.closeModal();

    expect(closeSpy).not.toHaveBeenCalled();
    expect(component.gameForm.homeTeam).toBe('Cibona');
  });

  it('finishes a referee replacement with the original game after the form is cleared', async () => {
    const game = scheduledGame();
    fillReplacementForm(game);

    const removeResult = new Subject<BasketballGame>();
    gameService.removeRefereeAssignment.and.returnValue(removeResult.asObservable());

    const save = component.updateGame();

    component.game = null;
    component.gameForm = {
      homeTeam: '',
      awayTeam: '',
      date: '',
      time: '',
      venue: '',
      competition: '',
      notes: '',
      status: 'Scheduled'
    };
    removeResult.next(game);
    removeResult.complete();
    await save;

    expect(gameService.removeRefereeAssignment).toHaveBeenCalledWith('game-1', 'asg-a');
    expect(gameService.assignReferee).toHaveBeenCalledWith('game-1', jasmine.objectContaining({
      userId: 'new-1',
      role: 'Sudac',
      position: 1
    }));
    expect(gameService.assignReferee).toHaveBeenCalledWith('game-1', jasmine.objectContaining({
      userId: 'new-2',
      role: 'Sudac'
    }));
    expect(gameService.updateGame).toHaveBeenCalledWith('game-1', jasmine.objectContaining({
      homeTeam: 'Cibona',
      awayTeam: 'Zadar',
      venue: 'Dražen',
      competition: 'SuperSport Premijer liga',
      date: '2026-11-20',
      time: '18:00'
    }));
  });
});
