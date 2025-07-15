import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeAbsentModalComponent } from './time-absent-modal.component';

describe('TimeAbsentModalComponent', () => {
  let component: TimeAbsentModalComponent;
  let fixture: ComponentFixture<TimeAbsentModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeAbsentModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeAbsentModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
