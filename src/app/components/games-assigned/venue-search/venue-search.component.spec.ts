import { ComponentFixture, TestBed } from '@angular/core/testing';
import { VenueSearchComponent } from './venue-search.component';

describe('VenueSearchComponent', () => {
  let fixture: ComponentFixture<VenueSearchComponent>;
  let component: VenueSearchComponent;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      imports: [VenueSearchComponent]
    }).compileComponents();
    fixture = TestBed.createComponent(VenueSearchComponent);
    component = fixture.componentInstance;
    component.options = ['Dvorana Dražen Petrović', 'Gripe', 'Jazine'];
    fixture.detectChanges();
  });

  it('otvara listu kao combobox', () => {
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new Event('focus'));
    fixture.detectChanges();
    expect(input.getAttribute('role')).toBe('combobox');
    expect(input.getAttribute('aria-expanded')).toBe('true');
    expect(fixture.nativeElement.querySelector('[role="listbox"]')).toBeTruthy();
  });

  it('strelicom i Enter odabire dvoranu', () => {
    const changes: string[] = [];
    component.registerOnChange((value) => changes.push(value));
    const input = fixture.nativeElement.querySelector('input') as HTMLInputElement;
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'ArrowDown', cancelable: true }));
    input.dispatchEvent(new KeyboardEvent('keydown', { key: 'Enter', cancelable: true }));
    fixture.detectChanges();
    expect(changes).toEqual(['Dvorana Dražen Petrović']);
    expect(component.open).toBeFalse();
  });

  it('Escape zatvara listu i ne prosljeđuje se modalu', () => {
    component.onFocus();
    fixture.detectChanges();
    const event = new KeyboardEvent('keydown', { key: 'Escape', cancelable: true, bubbles: true });
    spyOn(event, 'stopPropagation');
    component.onInputKey(event);
    expect(component.open).toBeFalse();
    expect(event.stopPropagation).toHaveBeenCalled();
  });
});
