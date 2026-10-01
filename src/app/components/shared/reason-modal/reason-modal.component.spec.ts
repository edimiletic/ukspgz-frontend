import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ReasonModalComponent } from './reason-modal.component';

describe('ReasonModalComponent', () => {
  let fixture: ComponentFixture<ReasonModalComponent>;
  let component: ReasonModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ReasonModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ReasonModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('title', 'Odbij nominaciju');
    fixture.componentRef.setInput('minLength', 10);
    fixture.detectChanges();
  });

  it('ne emitira dok je razlog prekratak', () => {
    const spy = jasmine.createSpy();
    component.confirm.subscribe(spy);
    component.reason = 'kratko';
    component.confirmAction();
    expect(spy).not.toHaveBeenCalled();
    expect(component.errorMessage).toContain('10');
  });

  it('emitira trimani razlog kad je valjan', () => {
    const spy = jasmine.createSpy();
    component.confirm.subscribe(spy);
    component.reason = '  Ovo je dovoljno dugačak razlog  ';
    component.confirmAction();
    expect(spy).toHaveBeenCalledWith('Ovo je dovoljno dugačak razlog');
  });

  it('busy blokira close i confirm', () => {
    const closeSpy = jasmine.createSpy();
    component.close.subscribe(closeSpy);
    fixture.componentRef.setInput('isBusy', true);
    fixture.detectChanges();
    component.closeModal();
    expect(closeSpy).not.toHaveBeenCalled();
  });
});
