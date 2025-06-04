import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TimeAbsentComponent } from './time-absent.component';

describe('TimeAbsentComponent', () => {
  let component: TimeAbsentComponent;
  let fixture: ComponentFixture<TimeAbsentComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [TimeAbsentComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TimeAbsentComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
