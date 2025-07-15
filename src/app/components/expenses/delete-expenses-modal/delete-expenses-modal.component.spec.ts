import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteExpensesModalComponent } from './delete-expenses-modal.component';

describe('DeleteExpensesModalComponent', () => {
  let component: DeleteExpensesModalComponent;
  let fixture: ComponentFixture<DeleteExpensesModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteExpensesModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteExpensesModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
