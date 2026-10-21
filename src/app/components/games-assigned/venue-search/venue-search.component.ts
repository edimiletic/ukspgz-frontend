import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-venue-search',
  standalone: true,
  imports: [CommonModule],
  templateUrl: './venue-search.component.html',
  styleUrl: './venue-search.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => VenueSearchComponent),
      multi: true
    }
  ]
})
export class VenueSearchComponent implements ControlValueAccessor {
  @Input() options: string[] = [];
  @Input() disabled = false;
  @Input() placeholder = 'Upišite naziv dvorane';

  query = '';
  open = false;
  selected = '';
  activeIndex = -1;

  private static nextId = 0;
  readonly listId = `venue-list-${VenueSearchComponent.nextId++}`;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private host: ElementRef<HTMLElement>) {}

  get matches(): string[] {
    const q = this.query.trim().toLocaleLowerCase('hr');
    const selected = this.selected.trim().toLocaleLowerCase('hr');
    if (!q || q === selected) return this.options;
    return this.options.filter((name) => name.toLocaleLowerCase('hr').includes(q));
  }

  get activeOptionId(): string | null {
    if (!this.open || this.activeIndex < 0 || this.activeIndex >= this.matches.length) {
      return null;
    }
    return this.optionId(this.activeIndex);
  }

  optionId(index: number): string {
    return `${this.listId}-opt-${index}`;
  }

  writeValue(value: string): void {
    this.selected = value || '';
    this.query = this.selected;
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  onFocus(): void {
    if (this.disabled) return;
    this.open = true;
  }

  onQueryChange(value: string): void {
    this.query = value;
    this.open = true;
    this.activeIndex = this.matches.length ? 0 : -1;
    if (this.selected && value !== this.selected) {
      this.selected = '';
      this.onChange('');
    }
  }

  onKeydown(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }

    const max = this.matches.length - 1;

    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open = true;
      if (max < 0) {
        return;
      }
      this.activeIndex = this.activeIndex < 0 ? 0 : Math.min(max, this.activeIndex + 1);
      return;
    }

    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.open = true;
      if (max < 0) {
        return;
      }
      this.activeIndex = this.activeIndex <= 0 ? 0 : this.activeIndex - 1;
      return;
    }

    if (event.key === 'Enter' && this.open && this.activeIndex >= 0 && this.matches[this.activeIndex]) {
      event.preventDefault();
      this.choose(this.matches[this.activeIndex]);
      return;
    }

    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      this.open = false;
      this.activeIndex = -1;
    }
  }

  trackByVenue(_index: number, venue: string): string {
    return venue;
  }

  choose(name: string): void {
    this.selected = name;
    this.query = name;
    this.open = false;
    this.activeIndex = -1;
    this.onChange(name);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
      this.activeIndex = -1;
      this.onTouched();
      if (this.selected) {
        this.query = this.selected;
      }
    }
  }
}
