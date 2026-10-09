import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TravelExpenseService } from './travel-expense.service';
import { environment } from '../../environments/environment';

describe('TravelExpenseService', () => {
  let service: TravelExpenseService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/travel-expense`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(TravelExpenseService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('preuzima predložak', () => {
    service.downloadTemplate().subscribe();
    const req = http.expectOne(`${base}/template`);
    expect(req.request.method).toBe('GET');
    expect(req.request.responseType).toBe('blob');
    req.flush(new Blob());
  });

  it('dohvaća utakmice za nalog', () => {
    service.getEligibleGames().subscribe(list => {
      expect(list.length).toBe(1);
    });
    const req = http.expectOne(`${base}/eligible-games`);
    expect(req.request.method).toBe('GET');
    req.flush([{ _id: 'g1', assignmentRole: 'Sudac' }]);
  });

  it('predaje nalog kao FormData', () => {
    const form = new FormData();
    form.append('gameId', 'g1');
    service.submitTravelOrder(form).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toBe(form);
    req.flush({ id: 'e1', state: 'Predano' });
  });

  it('dohvaća moje naloge u browseru', () => {
    service.getCurrentUserTravelExpenses().subscribe(list => {
      expect(list.length).toBe(1);
    });
    const req = http.expectOne(`${base}/my`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'e1' }]);
  });

  it('odbija nalog s napomenom', () => {
    service.reviewTravelExpense('e1', 'reject', 'Nedostaju računi').subscribe();
    const req = http.expectOne(`${base}/e1/review`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ action: 'reject', reviewComments: 'Nedostaju računi' });
    req.flush({ id: 'e1', state: 'Odbijeno' });
  });

  it('briše nalog po id', () => {
    service.deleteTravelExpense('e1').subscribe();
    const req = http.expectOne(`${base}/e1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
