import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { BasketballGameService } from './basketballGame.service';
import { environment } from '../../environments/environment';

describe('BasketballGameService', () => {
  let service: BasketballGameService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/basketball-games`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(BasketballGameService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('dohvaća moje nominacije', () => {
    service.getMyAssignments().subscribe(games => {
      expect(games.length).toBe(1);
    });
    const req = http.expectOne(`${base}/my-assignments`);
    expect(req.request.method).toBe('GET');
    req.flush([{ _id: 'g1' }]);
  });

  it('šalje filtere na getAllGames', () => {
    service.getAllGames({ competition: '3X3' }).subscribe();
    const req = http.expectOne(r => r.url.startsWith(base) && r.url.includes('competition=3X3'));
    expect(req.request.method).toBe('GET');
    req.flush({ games: [], pagination: {} });
  });

  it('getAllGamesComplete spaja sve stranice', () => {
    const received: string[] = [];
    service.getAllGamesComplete({ competition: '3X3' }).subscribe(games => {
      received.push(...games.map(game => game._id));
    });

    const first = http.expectOne(r =>
      r.url.includes('competition=3X3') && r.url.includes('page=1') && r.url.includes('limit=100')
    );
    first.flush({
      games: [{ _id: 'g1' }],
      pagination: { currentPage: 1, hasNext: true, totalPages: 2 }
    });

    const second = http.expectOne(r => r.url.includes('page=2') && r.url.includes('limit=100'));
    second.flush({
      games: [{ _id: 'g2' }],
      pagination: { currentPage: 2, hasNext: false, totalPages: 2 }
    });

    expect(received).toEqual(['g1', 'g2']);
  });

  it('kreira, ažurira i briše utakmicu', () => {
    const payload = {
      homeTeam: 'A',
      awayTeam: 'B',
      date: '2026-01-01',
      time: '18:00',
      venue: 'Zagreb',
      competition: '3X3'
    };

    service.createGame(payload).subscribe();
    const create = http.expectOne(base);
    expect(create.request.method).toBe('POST');
    create.flush({ _id: 'g1', ...payload });

    service.updateGame('g1', payload).subscribe();
    const update = http.expectOne(`${base}/g1`);
    expect(update.request.method).toBe('PUT');
    update.flush({ _id: 'g1' });

    service.deleteGame('g1').subscribe();
    const del = http.expectOne(`${base}/g1`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ message: 'ok' });
  });

  it('nominira i odgovara na nominaciju', () => {
    service.assignReferee('g1', { userId: 'u1', role: 'Sudac' }).subscribe();
    const assign = http.expectOne(`${base}/g1/assign-referee`);
    expect(assign.request.method).toBe('POST');
    assign.flush({ _id: 'g1' });

    service.respondToAssignment('g1', { response: 'Accepted' }).subscribe();
    const respond = http.expectOne(`${base}/g1/respond-assignment`);
    expect(respond.request.method).toBe('PATCH');
    respond.flush({ _id: 'g1' });
  });
});
