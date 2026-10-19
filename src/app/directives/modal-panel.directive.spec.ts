import { Component } from '@angular/core';
import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ModalPanelDirective } from './modal-panel.directive';

@Component({
  imports: [ModalPanelDirective],
  template: `
    <button type="button" id="opener" (click)="open = true">Otvori</button>
    @if (open) {
      <div
        id="panel"
        appModalPanel
        [appModalBusy]="busy"
        (dismiss)="open = false">
        <h2 id="dialog-title">Naslov</h2>
        <button type="button" id="first">Prvi</button>
        <button type="button" id="last">Zadnji</button>
      </div>
    }
  `
})
class HostComponent {
  open = false;
  busy = false;
}

describe('ModalPanelDirective', () => {
  let fixture: ComponentFixture<HostComponent>;
  let host: HostComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [HostComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(HostComponent);
    host = fixture.componentInstance;
    fixture.detectChanges();
  });

  function openDialog(): void {
    const opener = fixture.nativeElement.querySelector('#opener') as HTMLButtonElement;
    opener.focus();
    opener.click();
    fixture.detectChanges();
  }

  it('fokusira prvo polje i označi dijalog', () => {
    openDialog();
    const panel = fixture.nativeElement.querySelector('#panel') as HTMLElement;
    expect(panel.getAttribute('role')).toBe('dialog');
    expect(panel.getAttribute('aria-modal')).toBe('true');
    expect(document.activeElement?.id).toBe('first');
  });

  it('Tab sa zadnjeg elementa vraća na prvi', () => {
    openDialog();
    (fixture.nativeElement.querySelector('#last') as HTMLButtonElement).focus();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true }));
    expect(document.activeElement?.id).toBe('first');
  });

  it('Escape zatvara i vraća fokus na gumb koji je otvorio', () => {
    openDialog();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#panel')).toBeNull();
    expect(document.activeElement?.id).toBe('opener');
  });

  it('Escape ne zatvara dok je busy', () => {
    host.busy = true;
    openDialog();
    document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape', bubbles: true, cancelable: true }));
    fixture.detectChanges();
    expect(fixture.nativeElement.querySelector('#panel')).toBeTruthy();
  });
});
