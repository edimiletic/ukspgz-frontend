import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { ActivatedRoute } from '@angular/router';
import { of } from 'rxjs';
import { SetPasswordComponent } from './set-password.component';
import { AuthService } from '../../services/login.service';

describe('SetPasswordComponent', () => {
  let fixture: ComponentFixture<SetPasswordComponent>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', ['resetPassword']);
    await TestBed.configureTestingModule({
      imports: [SetPasswordComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: ActivatedRoute,
          useValue: { snapshot: { queryParamMap: { get: () => 'tok-1' } } }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SetPasswordComponent);
    fixture.detectChanges();
  });

  it('šalje token i novu lozinku', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ password: 'Lozinka123', confirmPassword: 'Lozinka123' });
    auth.resetPassword.and.returnValue(of({ message: 'ok' }));
    component.onSubmit();
    expect(auth.resetPassword).toHaveBeenCalledWith('tok-1', 'Lozinka123');
    expect(component.successMessage).toContain('ok');
  });

  it('traži podudaranje lozinki', () => {
    const component = fixture.componentInstance;
    component.form.setValue({ password: 'Lozinka123', confirmPassword: 'drugo' });
    component.onSubmit();
    expect(auth.resetPassword).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('ne podudaraju');
  });
});
