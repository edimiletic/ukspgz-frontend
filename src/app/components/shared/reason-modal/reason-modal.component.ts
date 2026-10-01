import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-reason-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './reason-modal.component.html',
  styleUrl: './reason-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ReasonModalComponent {
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

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<string>();

  reason = '';
  errorMessage = '';

  get isFormValid(): boolean {
    const len = this.reason.trim().length;
    return len >= this.minLength && len <= this.maxLength;
  }

  closeModal(): void {
    if (this.isBusy) {
      return;
    }
    this.reason = '';
    this.errorMessage = '';
    this.close.emit();
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
