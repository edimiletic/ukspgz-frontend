import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ConfirmationModalComponent } from './confirmation-modal.component';

describe('ConfirmationModalComponent', () => {
  let fixture: ComponentFixture<ConfirmationModalComponent>;
  let component: ConfirmationModalComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [ConfirmationModalComponent]
    }).compileComponents();

    fixture = TestBed.createComponent(ConfirmationModalComponent);
    component = fixture.componentInstance;
    fixture.componentRef.setInput('isOpen', true);
    fixture.componentRef.setInput('confirmationData', {
      title: 'Obriši',
      message: 'Jeste li sigurni?',
      details: ['Utakmica A vs B'],
      confirmText: 'Obriši',
      data: { id: 'g1' }
    });
    fixture.detectChanges();
  });

  it('prikazuje naslov, poruku i detalje', () => {
    const text = fixture.nativeElement.textContent as string;
    expect(text).toContain('Obriši');
    expect(text).toContain('Jeste li sigurni?');
    expect(text).toContain('Utakmica A vs B');
  });

  it('emitira data na potvrdu', () => {
    const spy = jasmine.createSpy();
    component.confirm.subscribe(spy);
    component.confirmAction();
    expect(spy).toHaveBeenCalledWith({ id: 'g1' });
  });

  it('ne zatvara i ne potvrđuje dok je busy', () => {
    const closeSpy = jasmine.createSpy();
    const confirmSpy = jasmine.createSpy();
    component.close.subscribe(closeSpy);
    component.confirm.subscribe(confirmSpy);
    fixture.componentRef.setInput('isBusy', true);
    fixture.detectChanges();

    component.closeModal();
    component.confirmAction();
    expect(closeSpy).not.toHaveBeenCalled();
    expect(confirmSpy).not.toHaveBeenCalled();
    expect(fixture.nativeElement.textContent).toContain('Pričekajte');
  });

  it('ne crta overlay kad je zatvoren', () => {
    fixture.componentRef.setInput('isOpen', false);
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('.modal-overlay')).toBeNull();
  });
});
