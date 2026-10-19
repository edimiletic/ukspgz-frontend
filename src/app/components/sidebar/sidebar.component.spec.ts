import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { of } from 'rxjs';
import { SidebarComponent } from './sidebar.component';
import { AuthService } from '../../services/login.service';
import { SidebarNavService } from '../../services/sidebar-nav.service';

describe('SidebarComponent', () => {
  let fixture: ComponentFixture<SidebarComponent>;
  let auth: jasmine.SpyObj<AuthService>;

  beforeEach(async () => {
    auth = jasmine.createSpyObj('AuthService', [
      'isAdmin',
      'canViewEligibleOfficials',
      'canViewStatistics',
      'loadUserData'
    ], { currentUserValue: { _id: 'u1' } });
    auth.isAdmin.and.returnValue(false);
    auth.canViewEligibleOfficials.and.returnValue(false);
    auth.canViewStatistics.and.returnValue(false);

    await TestBed.configureTestingModule({
      imports: [SidebarComponent],
      providers: [
        provideRouter([]),
        { provide: AuthService, useValue: auth },
        {
          provide: SidebarNavService,
          useValue: {
            register: () => undefined,
            unregister: () => undefined,
            isOpen$: of(false),
            close: () => undefined,
            open: () => undefined,
            toggle: () => undefined
          }
        }
      ]
    }).compileComponents();

    fixture = TestBed.createComponent(SidebarComponent);
    fixture.detectChanges();
  });

  it('koristi prave linkove umjesto gumba', () => {
    const home = fixture.nativeElement.querySelector('a[href="/home"]');
    expect(home).toBeTruthy();
    expect(home.textContent).toContain('Početna stranica');
    expect(home.getAttribute('role')).not.toBe('button');
  });

  it('adminu pokazuje Korisnike', () => {
    auth.isAdmin.and.returnValue(true);
    fixture.detectChanges();
    expect(fixture.nativeElement.textContent).toContain('Korisnici');
  });
});
