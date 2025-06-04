import { ComponentFixture, TestBed } from '@angular/core/testing';

import { BasketRulesComponent } from './basket-rules.component';

describe('BasketRulesComponent', () => {
  let component: BasketRulesComponent;
  let fixture: ComponentFixture<BasketRulesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [BasketRulesComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(BasketRulesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
