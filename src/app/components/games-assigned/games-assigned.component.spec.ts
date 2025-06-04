import { ComponentFixture, TestBed } from '@angular/core/testing';

import { GamesAssignedComponent } from './games-assigned.component';

describe('GamesAssignedComponent', () => {
  let component: GamesAssignedComponent;
  let fixture: ComponentFixture<GamesAssignedComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [GamesAssignedComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(GamesAssignedComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
