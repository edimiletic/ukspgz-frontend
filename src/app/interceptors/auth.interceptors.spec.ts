import { TestBed } from '@angular/core/testing';
import { HttpClient, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { authInterceptor } from './auth.interceptors';
import { AuthService } from '../services/login.service';

describe('authInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  let auth: jasmine.SpyObj<AuthService>;
  let router: jasmine.SpyObj<Router>;

  beforeEach(() => {
    auth = jasmine.createSpyObj('AuthService', ['clearSession', 'setCsrfToken']);
    Object.defineProperty(auth, 'csrfToken', { writable: true, value: '' });
    router = jasmine.createSpyObj('Router', ['navigate']);

    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([authInterceptor])),
        provideHttpClientTesting(),
        { provide: AuthService, useValue: auth },
        { provide: Router, useValue: router }
      ]
    });

    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  it('šalje credentials umjesto Authorization headera', () => {
    http.get('/api/users').subscribe();
    const req = httpMock.expectOne('/api/users');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });

  it('na login šalje credentials, bez Authorization', () => {
    http.post('/api/login', { username: 'a', password: 'b' }).subscribe();
    const req = httpMock.expectOne('/api/login');
    expect(req.request.withCredentials).toBeTrue();
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ user: { _id: 'u1' } });
  });

  it('na mutating zahtjev stavlja CSRF header', () => {
    (auth as { csrfToken: string }).csrfToken = 'tok-csrf';
    http.post('/api/absence', {}).subscribe();
    const req = httpMock.expectOne('/api/absence');
    expect(req.request.headers.get('X-CSRF-Token')).toBe('tok-csrf');
    req.flush({});
  });

  it('pamti CSRF token iz odgovora', () => {
    http.get('/api/me').subscribe();
    httpMock.expectOne('/api/me').flush(
      { _id: 'u1' },
      { headers: { 'X-CSRF-Token': 'from-me' } }
    );
    expect(auth.setCsrfToken).toHaveBeenCalledWith('from-me');
  });

  it('na 401 na API čisti sesiju i šalje na login', () => {
    http.get('/api/users').subscribe({
      next: () => fail('očekivana 401'),
      error: err => expect(err.status).toBe(401)
    });
    httpMock.expectOne('/api/users').flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('na 401 za /me ne radi redirect (probe sesije)', () => {
    http.get('/api/me').subscribe({
      next: () => fail('očekivana 401'),
      error: err => expect(err.status).toBe(401)
    });
    httpMock.expectOne('/api/me').flush({ error: 'no token' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('na 401 za login ne čisti sesiju', () => {
    http.post('/api/login', { username: 'a', password: 'b' }).subscribe({
      next: () => fail('očekivana 401'),
      error: err => expect(err.status).toBe(401)
    });
    httpMock.expectOne('/api/login').flush({ error: 'bad' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('na 429 za login ne čisti sesiju', () => {
    http.post('/api/login', { username: 'a', password: 'b' }).subscribe({
      next: () => fail('očekivana 429'),
      error: err => expect(err.status).toBe(429)
    });
    httpMock.expectOne('/api/login').flush(
      { error: 'Previše neuspjelih prijava. Pokušaj ponovo za 15 minuta.' },
      { status: 429, statusText: 'Too Many Requests' }
    );
    expect(auth.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });
});
