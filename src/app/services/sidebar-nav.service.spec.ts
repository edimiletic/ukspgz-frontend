import { TestBed } from '@angular/core/testing';
import { SidebarNavService } from './sidebar-nav.service';

describe('SidebarNavService', () => {
  let service: SidebarNavService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(SidebarNavService);
    service.close();
    service.unregister();
  });

  afterEach(() => {
    service.close();
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.width = '';
  });

  it('register/unregister prati prisutnost i zatvara izbornik', () => {
    const present: boolean[] = [];
    service.isPresent$.subscribe(v => present.push(v));
    service.register();
    service.open();
    expect(service.isOpen).toBeTrue();
    service.unregister();
    expect(service.isOpen).toBeFalse();
    expect(present).toContain(true);
    expect(present.at(-1)).toBeFalse();
  });

  it('toggle otvara pa zatvara', () => {
    expect(service.isOpen).toBeFalse();
    service.toggle();
    expect(service.isOpen).toBeTrue();
    service.toggle();
    expect(service.isOpen).toBeFalse();
  });
});
