import { CommonModule } from '@angular/common';
import { ModalPanelDirective } from '../../../directives/modal-panel.directive';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';

@Component({
  selector: 'app-reason-modal',
  imports: [CommonModule, ReactiveFormsModule, ModalPanelDirective],
  templateUrl: './reason-modal.component.html',
  styleUrl: './reason-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReasonModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isBusy = false;
  @Input() title = 'Odbijanje';
  @Input() message = '';
  @Input() label = 'Razlog';
  @Input() placeholder = '';
  @Input() confirmText = 'Potvrdi';
  @Input() busyText = 'Slanje...';
  @Input() minLength = 1;
  @Input() maxLength = 500;
  @Input() details: string[] = [];

  @Output() closed = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();

  errorMessage = '';

  private readonly fb = inject(FormBuilder);
  readonly form = this.fb.nonNullable.group({
    reason: ['']
  });

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && !this.isOpen) {
      this.form.reset({ reason: '' });
      this.errorMessage = '';
    }
    if (this.isBusy) {
      this.form.disable({ emitEvent: false });
    } else {
      this.form.enable({ emitEvent: false });
    }
  }

  get reason(): string {
    return this.form.controls.reason.value;
  }

  get isFormValid(): boolean {
    const len = this.reason.trim().length;
    return len >= this.minLength && len <= this.maxLength;
  }

  closeModal(): void {
    if (this.isBusy) {
      return;
    }
    this.form.reset({ reason: '' });
    this.errorMessage = '';
    this.closed.emit();
  }

  confirmAction(): void {
    if (this.isBusy) {
      return;
    }
    if (!this.isFormValid) {
      this.errorMessage = this.minLength > 1
        ? `Unesite barem ${this.minLength} znakova.`
        : 'Unesite napomenu što korisnik treba ispraviti.';
      return;
    }
    this.errorMessage = '';
    this.confirm.emit(this.reason.trim());
  }

  onOverlayClick(event: Event): void {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  trackByDetail(_index: number, line: string): string {
    return line;
  }
}
