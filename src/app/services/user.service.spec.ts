import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { UserService } from './user.service';
import { environment } from '../../environments/environment';

describe('UserService', () => {
  let service: UserService;
  let http: HttpTestingController;
  const base = `${environment.apiUrl}/users`;

  beforeEach(() => {
    TestBed.configureTestingModule({
      providers: [provideHttpClient(), provideHttpClientTesting()]
    });
    service = TestBed.inject(UserService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => http.verify());

  it('dohvaća suce i eligible listu', () => {
    service.getReferees().subscribe(list => {
      expect(list.length).toBe(1);
    });
    const referees = http.expectOne(`${base}/referees`);
    expect(referees.request.method).toBe('GET');
    referees.flush([{ _id: 'u1' }]);

    service.getEligibleOfficials().subscribe(res => {
      expect(res.competitions[0].competition).toBe('3X3');
    });
    const eligible = http.expectOne(`${base}/eligible-officials`);
    eligible.flush({ competitions: [{ competition: '3X3', officials: [] }] });
  });

  it('kreira, ažurira i briše korisnika', () => {
    service.createUser({ name: 'Iva' }).subscribe();
    const create = http.expectOne(base);
    expect(create.request.method).toBe('POST');
    create.flush({ _id: 'u1' });

    service.updateUser('u1', { surname: 'Ivić' }).subscribe();
    const update = http.expectOne(`${base}/u1`);
    expect(update.request.method).toBe('PUT');
    update.flush({ _id: 'u1' });

    service.deleteUser('u1').subscribe();
    const del = http.expectOne(`${base}/u1`);
    expect(del.request.method).toBe('DELETE');
    del.flush({ message: 'ok' });
  });
});
