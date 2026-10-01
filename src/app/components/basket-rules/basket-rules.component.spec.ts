import { ComponentFixture, TestBed } from '@angular/core/testing';
import { provideRouter } from '@angular/router';
import { BasketRulesComponent } from './basket-rules.component';

describe('BasketRulesComponent', () => {
  let fixture: ComponentFixture<BasketRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasketRulesComponent],
      providers: [provideRouter([])]
    }).compileComponents();

    fixture = TestBed.createComponent(BasketRulesComponent);
    fixture.detectChanges();
  });

  it('prikazuje naslov dokumentacije', () => {
    expect(fixture.nativeElement.textContent).toContain('Dokumenti');
  });
});
