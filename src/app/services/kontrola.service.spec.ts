import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { KontrolaService } from './kontrola.service';
import { environment } from '../../environments/environment';

describe('KontrolaService', () => {
  let service: KontrolaService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/kontrola`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(KontrolaService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('sprema i ažurira kontrolu', () => {
    const payload = { gameId: 'g1', tezinaUtakmice: 'Prosječna', refereeGrades: [] } as any;

    service.saveKontrola(payload).subscribe();
    const save = http.expectOne(base);
    expect(save.request.method).toBe('POST');
    save.flush({ _id: 'k1' });

    service.updateKontrola('g1', payload).subscribe();
    const update = http.expectOne(`${base}/g1`);
    expect(update.request.method).toBe('PUT');
    update.flush({ _id: 'k1' });
  });

  it('provjerava postoji li kontrola i dohvaća pregled', () => {
    service.hasKontrola('g1').subscribe(res => {
      expect(res.exists).toBeTrue();
    });
    http.expectOne(`${base}/exists/g1`).flush({ exists: true });

    service.getMyKontrola('g1').subscribe();
    http.expectOne(`${base}/referee/g1`).flush({ gameId: 'g1' });

    service.getFullKontrola('g1').subscribe();
    http.expectOne(`${base}/game/g1/all`).flush({ gameId: 'g1' });
  });

  it('statistikama šalje filtere', () => {
    service.getAllKontrolaForStatistics({ startDate: '2026-01-01', role: 'Sudac' }).subscribe();
    const req = http.expectOne(r => r.url.startsWith(`${base}/statistics`) && r.url.includes('startDate=2026-01-01') && r.url.includes('role=Sudac'));
    expect(req.request.method).toBe('GET');
    req.flush([]);
  });

  it('handleError pretvara 403 u čitljivu poruku', () => {
    service.saveKontrola({} as any).subscribe({
      next: () => fail('očekivana greška'),
      error: (err: Error) => {
        expect(err.message).toBe('Nemate dozvolu za ovu akciju.');
      }
    });
    http.expectOne(base).flush({ error: 'nope' }, { status: 403, statusText: 'Forbidden' });
  });

  it('getAllKontrolaData na grešku vraća praznu listu', () => {
    service.getAllKontrolaData().subscribe(list => {
      expect(list).toEqual([]);
    });
    http.expectOne(`${base}/statistics/all`).flush('fail', { status: 500, statusText: 'Server Error' });
  });
});
