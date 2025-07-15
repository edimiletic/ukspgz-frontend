import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditTimeAbsentModalComponent } from './edit-time-absent-modal.component';

describe('EditTimeAbsentModalComponent', () => {
  let component: EditTimeAbsentModalComponent;
  let fixture: ComponentFixture<EditTimeAbsentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditTimeAbsentModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditTimeAbsentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
