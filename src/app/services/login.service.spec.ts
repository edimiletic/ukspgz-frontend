import { TestBed } from '@angular/core/testing';
import { provideHttpClient } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { Router } from '@angular/router';
import { AuthService } from './login.service';
import { environment } from '../../environments/environment';

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

  it('login sprema korisnika bez JWT-a u localStorage', () => {
    localStorage.setItem('token', 'legacy');
    service.login({ username: 'iva', password: 'x' }).subscribe();
    const req = http.expectOne(`${api}/login`);
    expect(req.request.method).toBe('POST');
    req.flush({
      user: { _id: 'u1', name: 'Iva', surname: 'I', role: 'Sudac' }
    });

    expect(localStorage.getItem('token')).toBeNull();
    expect(service.getCurrentUserId()).toBe('u1');
    expect(service.hasRole('Sudac')).toBeTrue();
    expect(service.isAdmin()).toBeFalse();
    expect(service.isAuthenticated()).toBeTrue();
  });

  it('isAdmin ako je Admin u roles[], čak i kad je role Sudac', () => {
    service.login({ username: 'admin', password: 'x' }).subscribe();
    http.expectOne(`${api}/login`).flush({
      user: {
        _id: 'a1',
        role: 'Sudac',
        roles: [
          { name: 'Sudac', competitions: [] },
          { name: 'Admin', competitions: [] }
        ]
      }
    });
    expect(service.isAdmin()).toBeTrue();
    expect(service.hasRole('Sudac')).toBeTrue();
    expect(service.currentUserValue?.role).toBe('Admin');
  });

  it('changePassword šalje trenutnu i novu lozinku', () => {
    service.changePassword('stara', 'nova1234').subscribe();
    const req = http.expectOne(`${api}/change-password`);
    expect(req.request.body).toEqual({ currentPassword: 'stara', newPassword: 'nova1234' });
    req.flush({ message: 'ok' });
  });

  it('logout zove /logout, čisti sesiju i ide na login', () => {
    (service as any).currentUserSubject.next({
      _id: 'u1',
      id: 'u1',
      role: 'Sudac',
      roles: [{ name: 'Sudac', competitions: [] }]
    });
    service.logout();
    const req = http.expectOne(`${api}/logout`);
    expect(req.request.method).toBe('POST');
    req.flush({ message: 'Logged out' });
    expect(service.currentUserValue).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
    expect(router.navigate).toHaveBeenCalledWith(['/login']);
  });

  it('isAuthenticated ovisi o učitanom korisniku, ne o localStorage', () => {
    localStorage.setItem('token', 'whatever');
    expect(service.isAuthenticated()).toBeFalse();
  });

  it('getCurrentUser ide na /me kad nema cachea', () => {
    service.getCurrentUser().subscribe(user => {
      expect(user._id).toBe('u1');
      expect(user.role).toBe('Sudac');
    });
    const req = http.expectOne(`${api}/me`);
    expect(req.request.method).toBe('GET');
    req.flush({ _id: 'u1', roles: [{ name: 'Sudac', competitions: [] }] });
  });

  it('getCurrentUser na 401 briše sesiju', () => {
    service.getCurrentUser().subscribe({
      next: () => fail('očekivana 401'),
      error: err => expect(err.status).toBe(401)
    });
    http.expectOne(`${api}/me`).flush({}, { status: 401, statusText: 'Unauthorized' });
    expect(service.currentUserValue).toBeNull();
    expect(service.isAuthenticated()).toBeFalse();
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
