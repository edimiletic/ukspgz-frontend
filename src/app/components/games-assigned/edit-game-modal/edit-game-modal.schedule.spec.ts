import { TestBed } from '@angular/core/testing';
import { Observable, Subject } from 'rxjs';
import { EditGameModalComponent } from './edit-game-modal.component';
import { BasketballGameService } from '../../../services/basketballGame.service';
import { UserService } from '../../../services/user.service';
import { AbsenceService } from '../../../services/absence.service';
import { AuthService } from '../../../services/login.service';
import { CatalogService } from '../../../services/catalog.service';

describe('EditGameModalComponent schedule lookup', () => {
  let component: EditGameModalComponent;
  const requests: Array<{ date: string; subject: Subject<any[]> }> = [];

  beforeEach(async () => {
    requests.length = 0;
    await TestBed.configureTestingModule({
      imports: [EditGameModalComponent],
      providers: [
        {
          provide: BasketballGameService,
          useValue: {
            getGamesOnDate: (date: string) => new Observable(subscriber => {
              const subject = new Subject<any[]>();
              requests.push({ date, subject });
              const subscription = subject.subscribe(subscriber);
              return () => subscription.unsubscribe();
            })
          }
        },
        { provide: UserService, useValue: {} },
        { provide: AbsenceService, useValue: {} },
        { provide: AuthService, useValue: { currentUserValue: null } },
        { provide: CatalogService, useValue: {} }
      ]
    }).compileComponents();

    component = TestBed.createComponent(EditGameModalComponent).componentInstance;
  });

  function scheduleState(): { loaded: string; gameIds: string[] } {
    const modal = component as any;
    return {
      loaded: modal.loadedScheduleDate,
      gameIds: (modal.gamesOnSelectedDate || []).map((game: { _id: string }) => game._id)
    };
  }

  it('zanemaruje sporiji odgovor za prethodni datum', async () => {
    component.gameForm.date = '2026-11-01';
    component.gameForm.time = '18:00';
    const first = (component as any).loadScheduleForDate();
    expect(requests.map(request => request.date)).toEqual(['2026-11-01']);

    component.gameForm.date = '2026-11-08';
    const second = (component as any).loadScheduleForDate();
    expect(requests.map(request => request.date)).toEqual(['2026-11-01', '2026-11-08']);

    requests[1].subject.next([{ _id: 'sunday-game', time: '18:00', competition: '3X3', refereeAssignments: [] }]);
    requests[1].subject.complete();
    await second;

    requests[0].subject.next([{ _id: 'saturday-game', time: '18:00', competition: '3X3', refereeAssignments: [] }]);
    requests[0].subject.complete();
    await first;

    expect(scheduleState()).toEqual({ loaded: '2026-11-08', gameIds: ['sunday-game'] });
  });

  it('neuspjeli stariji zahtjev ne briše raspored novijeg datuma', async () => {
    component.gameForm.date = '2026-11-01';
    component.gameForm.time = '18:00';
    const first = (component as any).loadScheduleForDate();

    component.gameForm.date = '2026-11-08';
    const second = (component as any).loadScheduleForDate();
    requests[1].subject.next([{ _id: 'sunday-game', time: '18:00', competition: '3X3', refereeAssignments: [] }]);
    requests[1].subject.complete();
    await second;

    requests[0].subject.error(new Error('network'));
    await first;

    expect(scheduleState()).toEqual({ loaded: '2026-11-08', gameIds: ['sunday-game'] });
  });
});
