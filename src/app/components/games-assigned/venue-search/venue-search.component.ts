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
  @Input() inputId = 'venue';
  @Input() ariaLabel = 'Dvorana';

  query = '';
  open = false;
  selected = '';
  highlightedIndex = -1;

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private host: ElementRef<HTMLElement>) {}

  get listboxId(): string {
    return `${this.inputId}-list`;
  }

  get matches(): string[] {
    const q = this.query.trim().toLocaleLowerCase('hr');
    const selected = this.selected.trim().toLocaleLowerCase('hr');
    if (!q || q === selected) return this.options;
    return this.options.filter((name) => name.toLocaleLowerCase('hr').includes(q));
  }

  get activeOptionId(): string | null {
    if (!this.open || this.highlightedIndex < 0 || !this.matches[this.highlightedIndex]) {
      return null;
    }
    return this.optionId(this.highlightedIndex);
  }

  optionId(index: number): string {
    return `${this.inputId}-opt-${index}`;
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
    this.highlightedIndex = this.indexOfSelected();
  }

  onQueryChange(value: string): void {
    this.query = value;
    this.open = true;
    if (this.selected && value !== this.selected) {
      this.selected = '';
      this.onChange('');
    }
    this.highlightedIndex = this.matches.length ? 0 : -1;
  }

  onInputKey(event: KeyboardEvent): void {
    if (this.disabled) {
      return;
    }
    if (event.key === 'ArrowDown') {
      event.preventDefault();
      this.open = true;
      this.moveHighlight(1);
      return;
    }
    if (event.key === 'ArrowUp') {
      event.preventDefault();
      this.open = true;
      this.moveHighlight(-1);
      return;
    }
    if (event.key === 'Enter' && this.open && this.highlightedIndex >= 0) {
      const venue = this.matches[this.highlightedIndex];
      if (venue) {
        event.preventDefault();
        this.choose(venue);
      }
      return;
    }
    if (event.key === 'Escape' && this.open) {
      event.preventDefault();
      event.stopPropagation();
      this.closeList();
    }
  }

  trackByVenue(_index: number, venue: string): string {
    return venue;
  }

  choose(name: string): void {
    this.selected = name;
    this.query = name;
    this.open = false;
    this.highlightedIndex = -1;
    this.onChange(name);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.closeList();
      this.onTouched();
    }
  }

  private closeList(): void {
    this.open = false;
    this.highlightedIndex = -1;
    if (this.selected) {
      this.query = this.selected;
    }
  }

  private indexOfSelected(): number {
    if (!this.selected) {
      return this.matches.length ? 0 : -1;
    }
    const index = this.matches.indexOf(this.selected);
    return index >= 0 ? index : 0;
  }

  private moveHighlight(delta: number): void {
    const count = this.matches.length;
    if (!count) {
      this.highlightedIndex = -1;
      return;
    }
    const current = this.highlightedIndex < 0 ? (delta > 0 ? -1 : 0) : this.highlightedIndex;
    this.highlightedIndex = (current + delta + count) % count;
  }
}
