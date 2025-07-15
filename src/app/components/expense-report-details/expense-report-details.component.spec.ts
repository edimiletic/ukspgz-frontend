import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ExpenseReportDetailsComponent } from './expense-report-details.component';

describe('ExpenseReportDetailsComponent', () => {
  let component: ExpenseReportDetailsComponent;
  let fixture: ComponentFixture<ExpenseReportDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ExpenseReportDetailsComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ExpenseReportDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
