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

  it('kreira izvješće', () => {
    const payload = { userId: 'u1', type: 'Troškovno izvješće suca', season: '2026./2027.', year: 2026, month: 'Siječanj' };
    service.createTravelExpense(payload).subscribe();
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    req.flush({ id: 'e1', ...payload });
  });

  it('dohvaća moja izvješća u browseru', () => {
    service.getCurrentUserTravelExpenses().subscribe(list => {
      expect(list.length).toBe(1);
    });
    const req = http.expectOne(`${base}/my`);
    expect(req.request.method).toBe('GET');
    req.flush([{ id: 'e1' }]);
  });

  it('dodaje i briše stavku, predaje izvješće', () => {
    service.addExpenseItem('e1', { type: 'Prijevoz automobilom', amount: 10 }).subscribe();
    const add = http.expectOne(`${base}/e1/expenses`);
    expect(add.request.method).toBe('PATCH');
    add.flush({ id: 'e1' });

    service.removeExpenseItem('e1', 'item1').subscribe();
    const remove = http.expectOne(`${base}/e1/expenses/item1`);
    expect(remove.request.method).toBe('DELETE');
    remove.flush({ id: 'e1' });

    service.submitTravelExpense('e1').subscribe();
    const submit = http.expectOne(`${base}/e1/submit`);
    expect(submit.request.method).toBe('PATCH');
    submit.flush({ id: 'e1', state: 'Predano' });
  });

  it('odbija izvješće s napomenom', () => {
    service.reviewTravelExpense('e1', 'reject', 'Nedostaju računi').subscribe();
    const req = http.expectOne(`${base}/e1/review`);
    expect(req.request.method).toBe('PATCH');
    expect(req.request.body).toEqual({ action: 'reject', reviewComments: 'Nedostaju računi' });
    req.flush({ id: 'e1', state: 'Odbijeno' });
  });

  it('briše izvješće po id', () => {
    service.deleteTravelExpense('e1').subscribe();
    const req = http.expectOne(`${base}/e1`);
    expect(req.request.method).toBe('DELETE');
    req.flush(null);
  });
});
