import { CommonModule } from '@angular/common';
import { Component, EventEmitter, Input, Output, forwardRef } from '@angular/core';
import { ControlValueAccessor, FormsModule, NG_VALUE_ACCESSOR } from '@angular/forms';

@Component({
  selector: 'app-time-select',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './time-select.component.html',
  styleUrl: './time-select.component.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => TimeSelectComponent),
      multi: true
    }
  ]
})
export class TimeSelectComponent implements ControlValueAccessor {
  @Input() disabled = false;
  @Output() timeChange = new EventEmitter<string>();

  hours = Array.from({ length: 24 }, (_, hour) => hour.toString().padStart(2, '0'));
  minutes = Array.from({ length: 60 }, (_, minute) => minute.toString().padStart(2, '0'));

  hour = '';
  minute = '';

  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec((value || '').trim());
    this.hour = match ? match[1] : '';
    this.minute = match ? match[2] : '';
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

  onHourChange(hour: string): void {
    this.hour = hour;
    this.emitValue();
  }

  onMinuteChange(minute: string): void {
    this.minute = minute;
    this.emitValue();
  }

  private emitValue(): void {
    this.onTouched();
    const value = this.hour && this.minute ? `${this.hour}:${this.minute}` : '';
    this.onChange(value);
    this.timeChange.emit(value);
  }
}
