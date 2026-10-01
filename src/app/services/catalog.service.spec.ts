import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { CatalogService } from './catalog.service';
import { environment } from '../../environments/environment';

describe('CatalogService', () => {
  let service: CatalogService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/catalog`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(CatalogService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('dohvaća timove i dvorane', () => {
    service.getTeams().subscribe(list => {
      expect(list.length).toBe(1);
    });
    const teams = http.expectOne(`${base}/teams`);
    expect(teams.request.method).toBe('GET');
    teams.flush([{ _id: 't1', name: 'Cibona', competitions: ['3X3'] }]);

    service.getVenues().subscribe(list => {
      expect(list[0].name).toBe('Draženov dom');
    });
    const venues = http.expectOne(`${base}/venues`);
    expect(venues.request.method).toBe('GET');
    venues.flush([{ _id: 'v1', name: 'Draženov dom' }]);
  });
});
