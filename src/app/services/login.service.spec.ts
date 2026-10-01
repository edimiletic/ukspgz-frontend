import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './login.service';
import { environment } from '../../environments/environment';

function jwt(expOffsetSeconds: number): string {
  const header = btoa(JSON.stringify({ alg: 'none' }));
  const payload = btoa(JSON.stringify({ exp: Math.floor(Date.now() / 1000) + expOffsetSeconds }));
  return `${header}.${payload}.sig`;
}

describe('AuthService', () => {
  let service: AuthService;
  let http: HttpTestingController;
  let router: jasmine.SpyObj<Router>;
  const api = environment.apiUrl;

  beforeEach(() => {
    localStorage.clear();
    router = jasmine.createSpyObj('Router', ['navigate']);
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(),
        provideHttpClientTesting(),
        { provide: Router, useValue: router }
      ]
    });
    service = TestBed.inject(AuthService);
    http = TestBed.inject(HttpTestingController);
  });

  afterEach(() => {
    http.verify();
    localStorage.clear();
  });

  it('login sprema token i normalizira korisnika', () => {
    const token = jwt(3600);
    service.login({ username: 'iva', password: 'x' }).subscribe();
    const req = http.expectOne(`${api}/login`);
    expect(req.request.method).toBe('POST');
    req.flush({
      token,
      user: { _id: 'u1', name: 'Iva', surname: 'I', role: 'Sudac' }
    });

    expect(localStorage.getItem('token')).toBe(token);
    expect(service.getCurrentUserId()).toBe('u1');
    expect(service.hasRole('Sudac')).toBeTrue();
    expect(service.isAdmin()).toBeFalse();
  });

  it('logout čisti token i ide na login', () => {
    localStorage.setItem('token', jwt(3600));
    service.logout();
    expect(localStorage.getItem('token')).toBeNull();
    expect(service.currentUserValue).toBeNull();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('isAuthenticated: nevažeći i istekli token', () => {
    expect(service.isAuthenticated()).toBeFalse();

    localStorage.setItem('token', 'nije.jwt');
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('token')).toBeNull();

    localStorage.setItem('token', jwt(-10));
    expect(service.isAuthenticated()).toBeFalse();
    expect(localStorage.getItem('token')).toBeNull();

    localStorage.setItem('token', jwt(3600));
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('getCurrentUser ide na /me kad nema cachea', () => {
    localStorage.setItem('token', jwt(3600));
    service.getCurrentUser().subscribe(user => {
      expect(user._id).toBe('u1');
      expect(user.role).toBe('Sudac');
    });
    const req = http.expectOne(`${api}/me`);
    expect(req.request.method).toBe('GET');
    req.flush({ _id: 'u1', roles: [{ name: 'Sudac', competitions: [] }] });
  });

  it('getCurrentUser na 401 briše token', () => {
    localStorage.setItem('token', jwt(3600));
    service.getCurrentUser().subscribe({
      next: () => fail('očekivana 401'),
      error: err => expect(err.status).toBe(401)
    });
    http.expectOne(`${api}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(localStorage.getItem('token')).toBeNull();
    expect(service.currentUserValue).toBeNull();
  });

  it('canPerformAction: admin smije sve, inače samo vlasnik', () => {
    expect(service.canPerformAction('u1')).toBeFalse();
    (service as any).currentUserSubject.next({
      _id: 'u1',
      id: 'u1',
      role: 'Sudac',
      roles: [{ name: 'Sudac', competitions: [] }]
    });
    expect(service.isOwner('u1')).toBeTrue();
    expect(service.canPerformAction('u2')).toBeFalse();
    expect(service.canPerformAction('u1')).toBeTrue();
  });
});
