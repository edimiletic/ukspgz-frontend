import { ChangeDetectionStrategy, Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';

export interface ConfirmationData {
  title: string;
  message: string;
  details?: string[];
  confirmText?: string;
  cancelText?: string;
  confirmButtonClass?: string;
  loadingText?: string;
  data?: unknown;
}

@Component({
  selector: 'app-confirmation-modal',
  imports: [CommonModule],
  templateUrl: './confirmation-modal.component.html',
  styleUrl: './confirmation-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ConfirmationModalComponent {
  @Input() isOpen = false;
  @Input() isBusy = false;
  @Input() confirmationData: ConfirmationData = {
    title: 'Potvrda',
    message: 'Jeste li sigurni?',
    confirmText: 'Potvrdi',
    cancelText: 'Odustani',
    confirmButtonClass: 'btn-danger'
  };

  @Output() close = new EventEmitter<void>();
  @Output() confirm = new EventEmitter<unknown>();

  get accentClass(): string {
    const buttonClass = this.confirmationData.confirmButtonClass;
    if (buttonClass === 'btn-success') {
      return 'tone-success';
    }
    if (buttonClass === 'btn-primary') {
      return 'tone-primary';
    }
    return 'tone-danger';
  }

  closeModal() {
    if (!this.isBusy) {
      this.close.emit();
    }
  }

  confirmAction() {
    if (this.isBusy) {
      return;
    }
    this.confirm.emit(this.confirmationData.data);
  }

  onOverlayClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.closeModal();
    }
  }

  trackByDetail(_index: number, line: string): string {
    return line;
  }
}
