import { TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of, throwError } from 'rxjs';
import { AppComponent } from './app.component';
import { AuthService } from './services/login.service';

describe('AppComponent', () => {
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', [
      'isAuthenticated',
      'getCurrentUser',
      'clearSession'
    ], { currentUserValue: null });
    auth.isAuthenticated.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [AppComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth }
      ]
    }).compileComponents();
  });

  it('prikazuje aplikaciju kad korisnik nije prijavljen', () => {
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(fixture.componentInstance.isInitializing).toBeFalse();
    expect(auth.getCurrentUser).not.toHaveBeenCalled();
  });

  it('dohvaća korisnika kad postoji token bez cached profila', () => {
    auth.isAuthenticated.and.returnValue(true);
    auth.getCurrentUser.and.returnValue(of({ _id: 'u1' } as any));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(auth.getCurrentUser).toHaveBeenCalled();
    expect(fixture.componentInstance.isInitializing).toBeFalse();
  });

  it('čisti sesiju ako dohvat trenutnog korisnika padne', () => {
    auth.isAuthenticated.and.returnValue(true);
    auth.getCurrentUser.and.returnValue(throwError(() => ({ status: 401 })));
    const fixture = TestBed.createComponent(AppComponent);
    fixture.detectChanges();
    expect(auth.clearSession).toHaveBeenCalled();
    expect(fixture.componentInstance.isInitializing).toBeFalse();
  });
});
