import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteExamModalComponent } from './delete-exam-modal.component';

describe('DeleteExamModalComponent', () => {
  let component: DeleteExamModalComponent;
  let fixture: ComponentFixture<DeleteExamModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteExamModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteExamModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
