import { ComponentFixture, TestBed } from '@angular/core/testing';
import { FooterComponent } from './footer.component';

describe('FooterComponent', () => {
  let fixture: ComponentFixture<FooterComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [FooterComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(FooterComponent);
    fixture.detectChanges();
  });

  it('prikazuje kontakt za podršku', () => {
    const link: HTMLAnchorElement | null = fixture.nativeElement.querySelector(
      'a[href="mailto:edi.miletic@uniri.hr"]'
    );
    expect(link).toBeTruthy();
    expect(link?.textContent).toContain('edi.miletic@uniri.hr');
  });

  it('prikazuje naziv sustava i vlasnika autorskih prava', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('UHKS IS');
    expect(text).toContain(`© ${new Date().getFullYear()} Hrvatski košarkaški savez`);
  });
});
