import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter, Router } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AuthComponent } from './auth.component';
import { AuthService } from '../../services/login.service';

describe('AuthComponent', () => {
  let fixture: ComponentFixture<AuthComponent>;
  let component: AuthComponent;
  let auth: jasmine.SpyObj<AuthService>;
  let router: Router;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['isAuthenticated', 'login']);
    auth.isAuthenticated.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [AuthComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(AuthComponent);
    component = fixture.componentInstance;
    router = TestBed.inject(Router);
    spyOn(router, 'navigate');
    fixture.detectChanges();
  });

  it('prikazuje naslov prijave', () => {
    expect(fixture.nativeElement.textContent).toContain('Prijava u sustav');
    expect(fixture.nativeElement.textContent).toContain('Zaboravljena lozinka');
  });

  it('zahtijeva korisničko ime i lozinku', () => {
    component.onSubmit();
    expect(component.errorMessage).toContain('korisničko ime');
    expect(auth.login).not.toHaveBeenCalled();
  });

  it('nakon uspješne prijave ide na /home', () => {
    component.form.setValue({ username: 'iva', password: 'x' });
    auth.login.and.returnValue(of({ token: 't' }));
    component.onSubmit();
    expect(auth.login).toHaveBeenCalled();
    expect(router.navigate).toHaveBeenCalledWith(['/home']);
  });

  it('prikazuje poruku kad prijava padne', () => {
    component.form.setValue({ username: 'iva', password: 'x' });
    auth.login.and.returnValue(throwError(() => ({ error: { error: 'Neispravni podaci' } })));
    component.onSubmit();
    expect(component.errorMessage).toBe('Neispravni podaci');
    expect(component.isLoading).toBeFalse();
  });

  it('prikazuje poruku kad je prijava privremeno zaključana', () => {
    component.form.setValue({ username: 'iva', password: 'x' });
    auth.login.and.returnValue(throwError(() => ({ status: 429, error: {} })));
    component.onSubmit();
    expect(component.errorMessage).toContain('Previše neuspjelih prijava');
  });
});
