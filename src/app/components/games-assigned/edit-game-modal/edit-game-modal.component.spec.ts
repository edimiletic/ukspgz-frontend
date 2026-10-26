import { ComponentFixture, TestBed } from '@angular/core/testing';
import { of, throwError } from 'rxjs';
import { EditGameModalComponent } from './edit-game-modal.component';
import { BasketballGameService } from '../../../services/basketballGame.service';
import { AbsenceService } from '../../../services/absence.service';
import { UserService } from '../../../services/user.service';
import { AuthService } from '../../../services/login.service';
import { CatalogService } from '../../../services/catalog.service';
import { User } from '../../../model/user.model';

describe('EditGameModalComponent nomination availability', () => {
  let fixture: ComponentFixture<EditGameModalComponent>;
  let component: EditGameModalComponent;
  let games: jasmine.SpyObj<BasketballGameService>;
  let absences: jasmine.SpyObj<AbsenceService>;

  const official = (id: string, role: User['role']): User => ({
    _id: id,
    username: id,
    name: id,
    surname: 'Test',
    email: `${id}@example.com`,
    birthdate: '1990-01-01',
    personalCode: id,
    address: 'Zagreb',
    role
  });

  beforeEach(async () => {
    games = jasmine.createSpyObj('BasketballGameService', [
      'getGamesOnDate',
      'createGame',
      'assignReferee',
      'updateGame'
    ]);
    absences = jasmine.createSpyObj('AbsenceService', ['getAllAbsences']);
    const users = jasmine.createSpyObj('UserService', ['getReferees']);
    const catalog = jasmine.createSpyObj('CatalogService', ['getTeams', 'getVenues']);
    users.getReferees.and.returnValue(of([]));
    catalog.getTeams.and.returnValue(of([]));
    catalog.getVenues.and.returnValue(of([]));
    games.getGamesOnDate.and.returnValue(of([]));
    games.createGame.and.returnValue(of({ _id: 'g-new' } as any));
    games.assignReferee.and.returnValue(of({} as any));
    absences.getAllAbsences.and.returnValue(of([]));

    await TestBed.configureTestingModule({
      imports: [EditGameModalComponent],
      providers: [
        { provide: BasketballGameService, useValue: games },
        { provide: AbsenceService, useValue: absences },
        { provide: UserService, useValue: users },
        { provide: CatalogService, useValue: catalog },
        {
          provide: AuthService,
          useValue: {
            currentUserValue: {
              _id: 'admin',
              role: 'Admin',
              roles: [{ name: 'Admin', competitions: [] }]
            }
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(EditGameModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();

    component.gameForm = {
      homeTeam: 'Cibona',
      awayTeam: 'Zadar',
      date: '2026-11-02',
      time: '18:00',
      venue: 'Dražen',
      competition: 'SuperSport Premijer liga',
      notes: '',
      status: 'Scheduled'
    };
    component.selectedReferees = {
      sudci: [
        { userId: 's1', position: 1 },
        { userId: 's2', position: 2 }
      ],
      delegat: '',
      kontrolor: '',
      pomocniSudci: [
        { userId: 'p1', position: 1 },
        { userId: 'p2', position: 2 }
      ]
    };
    component.availableReferees = {
      sudci: [official('s1', 'Sudac'), official('s2', 'Sudac')],
      delegati: [],
      pomocniSudci: [official('p1', 'Pomoćni Sudac'), official('p2', 'Pomoćni Sudac')],
      kontrolori: []
    };
  });

  it('ne sprema nominacije kad popis odsustava ne uspije učitati', async () => {
    absences.getAllAbsences.and.returnValue(throwError(() => new Error('absence down')));

    await component.loadAbsences(false);
    await component.saveGame();

    expect(games.createGame).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('odsustva');
  });

  it('ne sprema nominacije kad raspored za datum ne uspije učitati', async () => {
    games.getGamesOnDate.and.returnValue(throwError(() => new Error('schedule down')));

    await component.loadAbsences(false);
    await component.saveGame();

    expect(games.getGamesOnDate).toHaveBeenCalledWith('2026-11-02');
    expect(games.createGame).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('rasporeda');
  });

  it('sprema nominacije kad su odsustva i raspored učitani', async () => {
    await component.loadAbsences(false);
    await component.saveGame();

    expect(games.createGame).toHaveBeenCalled();
    expect(games.assignReferee).toHaveBeenCalled();
  });
});
