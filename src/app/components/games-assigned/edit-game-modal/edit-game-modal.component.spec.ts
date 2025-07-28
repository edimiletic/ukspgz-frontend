import { ComponentFixture, TestBed } from '@angular/core/testing';

import { EditGameModalComponent } from './edit-game-modal.component';

describe('EditGameModalComponent', () => {
  let component: EditGameModalComponent;
  let fixture: ComponentFixture<EditGameModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [EditGameModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(EditGameModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
