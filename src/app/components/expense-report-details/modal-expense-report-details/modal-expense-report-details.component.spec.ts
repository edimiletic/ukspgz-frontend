import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModalExpenseReportDetailsComponent } from './modal-expense-report-details.component';

describe('ModalExpenseReportDetailsComponent', () => {
  let component: ModalExpenseReportDetailsComponent;
  let fixture: ComponentFixture<ModalExpenseReportDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ModalExpenseReportDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModalExpenseReportDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
