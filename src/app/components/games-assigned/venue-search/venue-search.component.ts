import { CommonModule } from '@angular/common';
import { Component, ElementRef, HostListener, Input, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-venue-search',
  standalone: true,
  imports: [CommonModule, FormsModule],
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

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private host: ElementRef<HTMLElement>) {}

  get matches(): string[] {
    const q = this.query.trim().toLocaleLowerCase('hr');
    const selected = this.selected.trim().toLocaleLowerCase('hr');
    if (!q || q === selected) return this.options;
    return this.options.filter((name) => name.toLocaleLowerCase('hr').includes(q));
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
    if (this.selected && value !== this.selected) {
      this.selected = '';
      this.onChange('');
    }
  }

  choose(name: string): void {
    this.selected = name;
    this.query = name;
    this.open = false;
    this.onChange(name);
    this.onTouched();
  }

  @HostListener('document:click', ['$event'])
  onDocumentClick(event: MouseEvent): void {
    if (!this.host.nativeElement.contains(event.target as Node)) {
      this.open = false;
      this.onTouched();
      if (this.selected) {
        this.query = this.selected;
      }
    }
  }
}
