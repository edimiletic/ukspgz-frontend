import { ComponentFixture, TestBed } from '@angular/core/testing';

import { SubmitModalExpenseComponent } from './submit-modal-expense.component';

describe('SubmitModalExpenseComponent', () => {
  let component: SubmitModalExpenseComponent;
  let fixture: ComponentFixture<SubmitModalExpenseComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [SubmitModalExpenseComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(SubmitModalExpenseComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
