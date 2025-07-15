import { Component, EventEmitter, Input, Output } from '@angular/core';
import { ExpenseItem } from '../../../model/travel-expense.model';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-modal-expense-report-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-expense-report-details.component.html',
  styleUrl: './modal-expense-report-details.component.scss'
})
export class ModalExpenseReportDetailsComponent {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<ExpenseItem>();

  expenseData: ExpenseItem = {
    _id: '',
    type: '',
    date: '',
    description: '',
    unit: '',
    amount: 0,
    quantity: 0,
    unitPrice: 0,
    competition: ''
  };

  expenseTypes = [
    'Prijevoz Automobilom',
    'Putnička Karta'
  ];

  units = [
    'km',
    'tk'
  ];

  competitions = [
    'FAVBET PREMIJER LIGA',
    'KUP «K. ĆOSIĆ»',
    'PRVA MUŠKA LIGA',
    'ZAVRŠNI TURNIR ZA POPUNU PRVE MUŠKE LIGE',
    'DRUGE MUŠKE LIGE',
    'TREĆE MUŠKE LIGE',
    'ČETVRTE MUŠKE LIGE',
    'PREMIJER ŽENSKA LIGA',
    'PRVA ŽENSKA LIGA',
    'KUP «R. MEGLAJ-RIMAC»',
    'JUNIORI',
    'JUNIORKE',
    'KADETI',
    'KADETKINJE',
    'MLAĐI KADETI',
    'MLAĐE KADETKINJE',
    'DJEČACI I DJEVOJČICE',
    'NATJECANJE SREDNJIH ŠKOLA',
    'NATJECANJE OSNOVNIH ŠKOLA',
    'Natjecanje MINI KOŠARKA',
    '3X3'
  ];

  // Modal-specific states
  isLoading = false;
  errorMessage = '';

  constructor() {}

  onClose() {
    this.resetForm();
    this.clearError();
    this.close.emit();
  }

  onSave() {
    if (this.isFormValid()) {
      this.isLoading = true;
      this.clearError();
      // Emit the expense data to parent component
      this.save.emit({ ...this.expenseData });
      this.resetForm();
      this.isLoading = false;
    }
  }

  private resetForm() {
    this.expenseData = {
      _id: '',
      type: '',
      date: '',
      description: '',
      unit: '',
      amount: 0,
      quantity: 0,
      unitPrice: 0,
      competition: ''
    };
  }

  private clearError() {
    this.errorMessage = '';
  }

  onExpenseTypeChange() {
    // Auto-set values for "Prijevoz automobilom"
    if (this.expenseData.type === 'Prijevoz Automobilom') {
      this.expenseData.unit = 'km';
      this.expenseData.unitPrice = 0.31;
    } 
    // Auto-set values for "Putnička Karta"
    else if (this.expenseData.type === 'Putnička Karta') {
      this.expenseData.unit = 'tk';
      this.expenseData.unitPrice = 0; // Reset price, user will enter it
    } 
    else {
      // Reset to default for other types
      this.expenseData.unit = '';
      this.expenseData.unitPrice = 0;
    }
  }

  // Helper method to check if fields should be disabled for automobile transport
  isAutomobileTransport(): boolean {
    return this.expenseData.type === 'Prijevoz Automobilom';
  }

  // Helper method to check if fields should be disabled for ticket
  isTicketTransport(): boolean {
    return this.expenseData.type === 'Putnička Karta';
  }

  // Helper method to check if unit field should be disabled
  isUnitFieldDisabled(): boolean {
    return this.isAutomobileTransport() || this.isTicketTransport();
  }

  isFormValid(): boolean {
    return this.expenseData.type !== '' &&
           this.expenseData.date !== '' &&
           this.expenseData.description.trim() !== '' &&
           this.expenseData.unit !== '' &&
           this.expenseData.quantity > 0 &&
           this.expenseData.unitPrice > 0 &&
           this.expenseData.competition !== '';
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget) {
      this.onClose();
    }
  }

  // Helper method to get current date in YYYY-MM-DD format
  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }

  // Helper method to calculate total amount
  getTotalAmount(): number {
    return this.expenseData.quantity * this.expenseData.unitPrice;
  }

  // Helper method to format currency display
  getFormattedTotal(): string {
    const total = this.getTotalAmount();
    return `${total.toFixed(2)} €`;
  }
}