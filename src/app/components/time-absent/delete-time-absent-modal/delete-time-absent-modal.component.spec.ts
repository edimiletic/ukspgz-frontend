import { ComponentFixture, TestBed } from '@angular/core/testing';

import { DeleteTimeAbsentModalComponent } from './delete-time-absent-modal.component';

describe('DeleteTimeAbsentModalComponent', () => {
  let component: DeleteTimeAbsentModalComponent;
  let fixture: ComponentFixture<DeleteTimeAbsentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [DeleteTimeAbsentModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(DeleteTimeAbsentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
