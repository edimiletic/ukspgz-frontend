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
    auth = jasmine.createSpyObj('AuthService', ['getToken', 'clearSession']);
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

  it('dodaje Bearer token na zaštićene zahtjeve', () => {
    auth.getToken.and.returnValue('abc.def.ghi');
    http.get('/api/users').subscribe();
    const req = httpMock.expectOne('/api/users');
    expect(req.request.headers.get('Authorization')).toBe('Bearer abc.def.ghi');
    req.flush([]);
  });

  it('ne dira login zahtjev', () => {
    auth.getToken.and.returnValue('abc.def.ghi');
    http.post('/api/login', { username: 'a', password: 'b' }).subscribe();
    const req = httpMock.expectOne('/api/login');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush({ token: 'x' });
  });

  it('na 401 s Bearer tokenom čisti sesiju i šalje na login', () => {
    auth.getToken.and.returnValue('abc.def.ghi');
    http.get('/api/users').subscribe({
      next: () => fail('očekivana 401'),
      error: err => expect(err.status).toBe(401)
    });
    httpMock.expectOne('/api/users').flush({ error: 'expired' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.clearSession).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('na 401 bez Authorization ne čisti sesiju', () => {
    auth.getToken.and.returnValue(null);
    http.get('/api/users').subscribe({
      next: () => fail('očekivana 401'),
      error: err => expect(err.status).toBe(401)
    });
    httpMock.expectOne('/api/users').flush({ error: 'no token' }, { status: 401, statusText: 'Unauthorized' });
    expect(auth.clearSession).not.toHaveBeenCalled();
    expect(router.navigate).not.toHaveBeenCalled();
  });

  it('bez tokena ne stavlja Authorization', () => {
    auth.getToken.and.returnValue(null);
    http.get('/api/users').subscribe();
    const req = httpMock.expectOne('/api/users');
    expect(req.request.headers.has('Authorization')).toBeFalse();
    req.flush([]);
  });
});
