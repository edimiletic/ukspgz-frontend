import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ViewKontrolaModalComponent } from './view-kontrola-modal.component';

describe('ViewKontrolaModalComponent', () => {
  let component: ViewKontrolaModalComponent;
  let fixture: ComponentFixture<ViewKontrolaModalComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ViewKontrolaModalComponent]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ViewKontrolaModalComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
