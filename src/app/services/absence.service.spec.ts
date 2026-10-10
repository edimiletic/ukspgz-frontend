import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { AbsenceService } from './absence.service';
import { environment } from '../../environments/environment';

describe('AbsenceService', () => {
  let service: AbsenceService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/absence`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(AbsenceService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('kreira odsustvo', () => {
    const payload = {
      startDate: '2026-01-10',
      endDate: '2026-01-12',
      userPersonalCode: '111'
    };
    service.createAbsence(payload).subscribe(absence => {
      expect(absence._id).toBe('a1');
    });
    const req = http.expectOne(base);
    expect(req.request.method).toBe('POST');
    expect(req.request.body).toEqual(payload);
    req.flush({ _id: 'a1', ...payload });
  });

  it('dohvaća moja odsustva', () => {
    service.getCurrentUserAbsences().subscribe(list => {
      expect(list.length).toBe(1);
    });
    const req = http.expectOne(`${base}/my`);
    expect(req.request.method).toBe('GET');
    req.flush([{ _id: 'a1' }]);
  });

  it('getAllAbsencesComplete spaja sve stranice', () => {
    const received: string[] = [];
    service.getAllAbsencesComplete().subscribe(list => {
      received.push(...list.map(absence => absence._id));
    });

    const first = http.expectOne(`${base}?page=1&limit=100`);
    first.flush({
      absences: [{ _id: 'a1' }],
      totalPages: 2,
      currentPage: 1,
      total: 2
    });

    const second = http.expectOne(`${base}?page=2&limit=100`);
    second.flush({
      absences: [{ _id: 'a2' }],
      totalPages: 2,
      currentPage: 2,
      total: 2
    });

    expect(received).toEqual(['a1', 'a2']);
  });

  it('getAllAbsences iz paginiranog odgovora vraća samo listu', () => {
    service.getAllAbsences(2, 20).subscribe(list => {
      expect(list.length).toBe(1);
    });
    const req = http.expectOne(`${base}?page=2&limit=20`);
    req.flush({ absences: [{ _id: 'a1' }], totalPages: 1, currentPage: 2, total: 1 });
  });

  it('ažurira i briše po _id', () => {
    service.updateAbsence({ _id: 'a1', reason: 'bolest' }).subscribe();
    const update = http.expectOne(`${base}/a1`);
    expect(update.request.method).toBe('PUT');
    update.flush({ _id: 'a1' });

    service.deleteAbsence('a1').subscribe();
    const del = http.expectOne(`${base}/a1`);
    expect(del.request.method).toBe('DELETE');
    del.flush(null);
  });
});
