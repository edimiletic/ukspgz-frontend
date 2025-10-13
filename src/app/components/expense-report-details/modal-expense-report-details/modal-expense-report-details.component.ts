// src/app/components/expense-report-details/modal-expense-report-details/modal-expense-report-details.component.ts

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

  // Toggle between input methods
  inputMethod: 'manual' | 'location' = 'location';

  expenseData: ExpenseItem = {
    _id: '',
    type: 'Prijevoz automobilom',
    date: '',
    description: '',
    unit: 'km',
    amount: 0,
    quantity: 0,
    unitPrice: 0,
    competition: ''
  };

  // For location-based input
  startLocation: string = '';
  endLocation: string = '';

  locations = [
    'Zagreb', 'V.Gorica', 'Samobor', 'Zabok', 'Zadar', 'Šibenik', 'Sinj',
    'Split', 'Omiš', 'K.Sućurac', 'Makarska', 'Dubrovnik', 'Pula',
    'Crikvenica', 'Kostrena', 'Rijeka', 'Osijek', 'Sl.Brod', 'Đakovo',
    'Požega', 'Varaždin', 'Križevci', 'Karlovac', 'Poreč', 'N. Podrav..',
    'Čakovo', 'Sisak', 'Br. Stupnik', 'Pazin', 'Solin'
  ];

  // Travel expense lookup table (expense amounts include round trip)
  // Data extracted from: PUTNI TROŠKOVI I DNEVNICE SLUŽBENIH OSOBA za sezonu 2025./26.
  private travelExpenses: { [key: string]: { [key: string]: number } } = {
    'Zagreb': { 'V.Gorica': 20, 'Samobor': 35, 'Zabok': 45, 'Zadar': 290, 'Šibenik': 340, 'Sinj': 410, 'Split': 410, 'Omiš': 440, 'K.Sućurac': 390, 'Makarska': 458, 'Dubrovnik': 606, 'Pula': 270, 'Crikvenica': 168, 'Kostrena': 160, 'Rijeka': 165, 'Osijek': 295, 'Sl.Brod': 195, 'Đakovo': 243, 'Požega': 179 },
    'V.Gorica': { 'Zagreb': 20, 'V.Gorica': 20, 'Samobor': 35, 'Zabok': 55, 'Zadar': 295, 'Šibenik': 350, 'Sinj': 415, 'Split': 415, 'Omiš': 450, 'K.Sućurac': 400, 'Makarska': 463, 'Dubrovnik': 610, 'Pula': 280, 'Crikvenica': 173, 'Kostrena': 165, 'Rijeka': 170, 'Osijek': 285, 'Sl.Brod': 190, 'Đakovo': 240, 'Požega': 176 },
    'Zabok': { 'Zagreb': 45, 'V.Gorica': 45, 'Samobor': 55, 'Zabok': 45, 'Zadar': 315, 'Šibenik': 365, 'Sinj': 435, 'Split': 435, 'Omiš': 465, 'K.Sućurac': 415, 'Makarska': 481, 'Dubrovnik': 625, 'Pula': 295, 'Crikvenica': 191, 'Kostrena': 182, 'Rijeka': 190, 'Osijek': 330, 'Sl.Brod': 235, 'Đakovo': 284, 'Požega': 220 },
    'Varaždin': { 'Zagreb': 90, 'V.Gorica': 90, 'Samobor': 85, 'Zabok': 115, 'Zadar': 60, 'Šibenik': 370, 'Sinj': 425, 'Split': 495, 'Omiš': 495, 'K.Sućurac': 525, 'Makarska': 475, 'Dubrovnik': 539, 'Pula': 685, 'Crikvenica': 355, 'Kostrena': 250, 'Rijeka': 241, 'Osijek': 248, 'Sl.Brod': 341, 'Đakovo': 249, 'Požega': 300, 'Varaždin': 235 },
    'Križevci': { 'Zagreb': 70, 'V.Gorica': 70, 'Samobor': 70, 'Zabok': 95, 'Zadar': 65, 'Šibenik': 355, 'Sinj': 410, 'Split': 475, 'Omiš': 480, 'K.Sućurac': 505, 'Makarska': 460, 'Dubrovnik': 522, 'Pula': 665, 'Crikvenica': 335, 'Kostrena': 232, 'Rijeka': 223, 'Osijek': 231, 'Sl.Brod': 324, 'Đakovo': 232, 'Požega': 282, 'Križevci': 218 },
    'Karlovac': { 'Zagreb': 55, 'V.Gorica': 55, 'Samobor': 60, 'Zabok': 45, 'Zadar': 88, 'Šibenik': 240, 'Sinj': 295, 'Split': 360, 'Omiš': 365, 'K.Sućurac': 395, 'Makarska': 345, 'Dubrovnik': 408, 'Pula': 555, 'Crikvenica': 225, 'Kostrena': 118, 'Rijeka': 110, 'Osijek': 117, 'Sl.Brod': 295, 'Đakovo': 241, 'Požega': 291, 'Karlovac': 227 },
    'Rijeka': { 'Zagreb': 165, 'V.Gorica': 165, 'Samobor': 170, 'Zabok': 155, 'Zadar': 190, 'Šibenik': 290, 'Sinj': 345, 'Split': 415, 'Omiš': 415, 'K.Sućurac': 445, 'Makarska': 395, 'Dubrovnik': 461, 'Pula': 605, 'Crikvenica': 110, 'Kostrena': 33, 'Osijek': 440, 'Sl.Brod': 353, 'Đakovo': 403, 'Požega': 339 },
    'Poreč': { 'Zagreb': 250, 'V.Gorica': 250, 'Samobor': 255, 'Zabok': 240, 'Zadar': 275, 'Šibenik': 380, 'Sinj': 435, 'Split': 500, 'Omiš': 505, 'K.Sućurac': 535, 'Makarska': 485, 'Dubrovnik': 560, 'Pula': 695, 'Crikvenica': 65, 'Kostrena': 133, 'Rijeka': 114, 'Osijek': 102, 'Sl.Brod': 530, 'Đakovo': 451, 'Požega': 498, 'Poreč': 444 },
    'Pula': { 'Zagreb': 270, 'V.Gorica': 270, 'Samobor': 275, 'Zabok': 260, 'Zadar': 295, 'Šibenik': 400, 'Sinj': 455, 'Split': 520, 'Omiš': 525, 'K.Sućurac': 550, 'Makarska': 500, 'Dubrovnik': 566, 'Pula': 710, 'Crikvenica': 140, 'Kostrena': 119, 'Rijeka': 110, 'Osijek': 545, 'Sl.Brod': 460, 'Đakovo': 505, 'Požega': 445 },
    'Zadar': { 'Zagreb': 290, 'V.Gorica': 290, 'Samobor': 295, 'Zabok': 280, 'Zadar': 315, 'Šibenik': 90, 'Sinj': 160, 'Split': 160, 'Omiš': 190, 'K.Sućurac': 140, 'Makarska': 205, 'Dubrovnik': 350, 'Pula': 400, 'Crikvenica': 207, 'Kostrena': 285, 'Rijeka': 290, 'Osijek': 565, 'Sl.Brod': 475, 'Đakovo': 523, 'Požega': 481 },
    'Šibenik': { 'Zagreb': 340, 'V.Gorica': 340, 'Samobor': 350, 'Zabok': 335, 'Zadar': 365, 'Šibenik': 90, 'Sinj': 90, 'Split': 90, 'Omiš': 120, 'K.Sućurac': 70, 'Makarska': 130, 'Dubrovnik': 280, 'Pula': 455, 'Crikvenica': 260, 'Kostrena': 340, 'Rijeka': 345, 'Osijek': 620, 'Sl.Brod': 530, 'Đakovo': 577, 'Požega': 515 },
    'Split': { 'Zagreb': 410, 'V.Gorica': 410, 'Samobor': 415, 'Zabok': 400, 'Zadar': 435, 'Šibenik': 160, 'Sinj': 90, 'Split': 35, 'Omiš': 30, 'K.Sućurac': 15, 'Makarska': 85, 'Dubrovnik': 230, 'Pula': 520, 'Crikvenica': 329, 'Kostrena': 408, 'Rijeka': 415, 'Osijek': 690, 'Sl.Brod': 600, 'Đakovo': 645, 'Požega': 585 },
    'Dubrovnik': { 'Zagreb': 606, 'V.Gorica': 606, 'Samobor': 611, 'Zabok': 596, 'Zadar': 625, 'Šibenik': 350, 'Sinj': 280, 'Split': 230, 'Omiš': 230, 'K.Sućurac': 200, 'Makarska': 230, 'Dubrovnik': 157, 'Pula': 790, 'Crikvenica': 715, 'Kostrena': 526, 'Rijeka': 605, 'Osijek': 605, 'Sl.Brod': 875, 'Đakovo': 790, 'Požega': 842 },
    'Sl.Brod': { 'Zagreb': 155, 'V.Gorica': 155, 'Samobor': 190, 'Zabok': 220, 'Zadar': 235, 'Šibenik': 475, 'Sinj': 530, 'Split': 600, 'Omiš': 600, 'K.Sućurac': 630, 'Makarska': 580, 'Dubrovnik': 644, 'Pula': 790, 'Crikvenica': 460, 'Kostrena': 354, 'Rijeka': 345, 'Osijek': 353, 'Sl.Brod': 95, 'Đakovo': 53, 'Požega': 52 },
    'N. Podrav..': { 'Zagreb': 115, 'V.Gorica': 115, 'Samobor': 115, 'Zabok': 135, 'Zadar': 125, 'Šibenik': 395, 'Sinj': 450, 'Split': 515, 'Omiš': 520, 'K.Sućurac': 545, 'Makarska': 500, 'Dubrovnik': 561, 'Pula': 705, 'Crikvenica': 375, 'Kostrena': 272, 'Rijeka': 264, 'Osijek': 271, 'Sl.Brod': 176, 'Đakovo': 196, 'Požega': 163, 'N. Podrav..': 135 },
    'Osijek': { 'Zagreb': 285, 'V.Gorica': 285, 'Samobor': 285, 'Zabok': 310, 'Zadar': 330, 'Šibenik': 565, 'Sinj': 620, 'Split': 690, 'Omiš': 690, 'K.Sućurac': 720, 'Makarska': 670, 'Dubrovnik': 736, 'Pula': 875, 'Crikvenica': 550, 'Kostrena': 446, 'Rijeka': 437, 'Osijek': 440, 'Sl.Brod': 265, 'Đakovo': 95, 'Požega': 52 },
    'Đakovo': { 'Zagreb': 105, 'V.Gorica': 105, 'Samobor': 105, 'Zabok': 130, 'Zadar': 75, 'Šibenik': 390, 'Sinj': 440, 'Split': 510, 'Omiš': 510, 'K.Sućurac': 540, 'Makarska': 490, 'Dubrovnik': 556, 'Pula': 700, 'Crikvenica': 370, 'Kostrena': 266, 'Rijeka': 257, 'Osijek': 265, 'Sl.Brod': 358, 'Đakovo': 266, 'Požega': 230 },
    'Sisak': { 'Zagreb': 60, 'V.Gorica': 60, 'Samobor': 45, 'Zabok': 75, 'Zadar': 95, 'Šibenik': 335, 'Sinj': 390, 'Split': 455, 'Omiš': 460, 'K.Sućurac': 490, 'Makarska': 440, 'Dubrovnik': 502, 'Pula': 650, 'Crikvenica': 320, 'Kostrena': 213, 'Rijeka': 205, 'Osijek': 212, 'Sl.Brod': 245, 'Đakovo': 152, 'Požega': 202, 'Sisak': 138 },
    'Požega': { 'Zagreb': 179, 'V.Gorica': 179, 'Samobor': 176, 'Zabok': 200, 'Zadar': 220, 'Šibenik': 481, 'Sinj': 515, 'Split': 580, 'Omiš': 585, 'K.Sućurac': 610, 'Makarska': 560, 'Dubrovnik': 630, 'Pula': 775, 'Crikvenica': 445, 'Kostrena': 340, 'Rijeka': 331, 'Osijek': 339, 'Sl.Brod': 105, 'Đakovo': 52, 'Požega': 102 },
    'Br. Stupnik': { 'Zagreb': 175, 'V.Gorica': 175, 'Samobor': 175, 'Zabok': 200, 'Zadar': 220, 'Šibenik': 460, 'Sinj': 515, 'Split': 580, 'Omiš': 585, 'K.Sućurac': 615, 'Makarska': 565, 'Dubrovnik': 628, 'Pula': 775, 'Crikvenica': 445, 'Kostrena': 338, 'Rijeka': 329, 'Osijek': 337, 'Sl.Brod': 115, 'Đakovo': 18, 'Požega': 71, 'Br. Stupnik': 33 },
    'Pazin': { 'Zagreb': 215, 'V.Gorica': 215, 'Samobor': 225, 'Zabok': 210, 'Zadar': 240, 'Šibenik': 345, 'Sinj': 400, 'Split': 470, 'Omiš': 470, 'K.Sućurac': 500, 'Makarska': 450, 'Dubrovnik': 514, 'Pula': 660, 'Crikvenica': 55, 'Kostrena': 88, 'Rijeka': 68, 'Osijek': 56, 'Sl.Brod': 495, 'Đakovo': 405, 'Požega': 452, 'Pazin': 388 },
    'Omiš': { 'Zagreb': 359, 'V.Gorica': 359, 'Samobor': 366, 'Zabok': 365, 'Zadar': 384, 'Šibenik': 107, 'Sinj': 34, 'Split': 53, 'Omiš': 68, 'K.Sućurac': 86, 'Makarska': 63, 'Dubrovnik': 154, 'Pula': 301, 'Crikvenica': 469, 'Kostrena': 280, 'Rijeka': 358, 'Osijek': 367, 'Sl.Brod': 638, 'Đakovo': 546, 'Požega': 597 },
    'Solin': { 'Zagreb': 405, 'V.Gorica': 405, 'Samobor': 410, 'Zabok': 395, 'Zadar': 430, 'Šibenik': 155, 'Sinj': 80, 'Split': 30, 'Omiš': 10, 'K.Sućurac': 30, 'Makarska': 10, 'Dubrovnik': 79, 'Pula': 225, 'Crikvenica': 515, 'Kostrena': 323, 'Rijeka': 401, 'Osijek': 409, 'Sl.Brod': 680, 'Đakovo': 590, 'Požega': 640, 'Solin': 576 },
    'Samobor': { 'Zagreb': 35, 'V.Gorica': 35, 'Samobor': 20, 'Zabok': 70, 'Zadar': 325, 'Šibenik': 375, 'Sinj': 445, 'Split': 445, 'Omiš': 475, 'K.Sućurac': 425, 'Makarska': 493, 'Dubrovnik': 640, 'Pula': 305, 'Crikvenica': 198, 'Kostrena': 190, 'Rijeka': 195, 'Osijek': 310, 'Sl.Brod': 220, 'Đakovo': 268, 'Požega': 204 },
    'Sinj': { 'Zagreb': 410, 'V.Gorica': 410, 'Samobor': 445, 'Zabok': 435, 'Zadar': 160, 'Šibenik': 90, 'Sinj': 65, 'Split': 90, 'Omiš': 34, 'K.Sućurac': 75, 'Makarska': 45, 'Dubrovnik': 280, 'Pula': 455, 'Crikvenica': 345, 'Kostrena': 438, 'Rijeka': 345, 'Osijek': 620, 'Sl.Brod': 530, 'Đakovo': 440, 'Požega': 515 },
    'K.Sućurac': { 'Zagreb': 390, 'V.Gorica': 400, 'Samobor': 425, 'Zabok': 415, 'Zadar': 140, 'Šibenik': 70, 'Sinj': 75, 'Split': 15, 'Omiš': 86, 'K.Sućurac': 60, 'Makarska': 75, 'Dubrovnik': 200, 'Pula': 500, 'Crikvenica': 315, 'Kostrena': 393, 'Rijeka': 445, 'Osijek': 720, 'Sl.Brod': 630, 'Đakovo': 540, 'Požega': 610 },
    'Makarska': { 'Zagreb': 458, 'V.Gorica': 463, 'Samobor': 493, 'Zabok': 481, 'Zadar': 205, 'Šibenik': 130, 'Sinj': 45, 'Split': 85, 'Omiš': 63, 'K.Sućurac': 75, 'Makarska': 20, 'Dubrovnik': 190, 'Pula': 500, 'Crikvenica': 380, 'Kostrena': 458, 'Rijeka': 395, 'Osijek': 670, 'Sl.Brod': 580, 'Đakovo': 490, 'Požega': 560 },
    'Crikvenica': { 'Zagreb': 168, 'V.Gorica': 173, 'Samobor': 198, 'Zabok': 191, 'Zadar': 207, 'Šibenik': 260, 'Sinj': 345, 'Split': 329, 'Omiš': 469, 'K.Sućurac': 315, 'Makarska': 380, 'Dubrovnik': 715, 'Pula': 140, 'Crikvenica': 50, 'Kostrena': 77, 'Rijeka': 110, 'Osijek': 550, 'Sl.Brod': 460, 'Đakovo': 370, 'Požega': 445 },
    'Kostrena': { 'Zagreb': 160, 'V.Gorica': 165, 'Samobor': 190, 'Zabok': 182, 'Zadar': 285, 'Šibenik': 340, 'Sinj': 438, 'Split': 408, 'Omiš': 280, 'K.Sućurac': 393, 'Makarska': 458, 'Dubrovnik': 526, 'Pula': 119, 'Crikvenica': 77, 'Kostrena': 16, 'Rijeka': 33, 'Osijek': 446, 'Sl.Brod': 354, 'Đakovo': 266, 'Požega': 340 }
  };

  expenseTypes = [
    'Prijevoz automobilom',
    'Putnička karta'
  ];

  units = ['km', 'tk'];

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

  isLoading = false;
  errorMessage = '';

  constructor() {}

  // Method to filter out the selected start location from end location options
  getAvailableEndLocations(): string[] {
    if (!this.startLocation) {
      return this.locations;
    }
    return this.locations.filter(location => location !== this.startLocation);
  }

  switchInputMethod(method: 'manual' | 'location') {
    this.inputMethod = method;
    this.clearError();
    
    // Reset form when switching
    if (method === 'location') {
      this.expenseData.type = 'Prijevoz automobilom';
      this.expenseData.unit = 'km';
      this.startLocation = '';
      this.endLocation = '';
    }
      this.expenseData.type = 'Prijevoz automobilom';
      this.expenseData.unit = 'km';
      this.expenseData.quantity = 0;
      this.expenseData.unitPrice = 0.31;
      this.expenseData.amount = 0;
    }

onLocationChange() {
  // Reset end location if it matches start location
  if (this.startLocation && this.endLocation === this.startLocation) {
    this.endLocation = '';
  }

  if (!this.startLocation || !this.endLocation) {
    this.expenseData.amount = 0;
    this.expenseData.quantity = 0;
    this.expenseData.unitPrice = 0;
    return;
  }

  // Look up the expense amount from the table
  const expense = this.travelExpenses[this.startLocation]?.[this.endLocation];
  
  console.log('Start:', this.startLocation);
  console.log('End:', this.endLocation);
  console.log('Found expense:', expense);
  
  if (expense) {
    this.expenseData.amount = expense;
    this.expenseData.quantity = 0;
    this.expenseData.unitPrice = 0;
    this.expenseData.description = `${this.startLocation} - ${this.endLocation} (povratno)`;
    console.log('Amount set to:', this.expenseData.amount);
  } else {
    this.errorMessage = 'Nema podataka o trošku između odabranih lokacija.';
    this.expenseData.amount = 0;
  }
}

  onExpenseTypeChange() {
    if (this.expenseData.type === 'Prijevoz automobilom') {
      this.expenseData.unit = 'km';
      this,this.expenseData.unitPrice = 0.31;
    } else if (this.expenseData.type === 'Putnička karta') {
      this.expenseData.unit = 'tk';
      this.expenseData.unitPrice = 0;
    }
    this.calculateAmount();
  }

  calculateAmount() {
    if (this.inputMethod === 'manual') {
      const quantity = Number(this.expenseData.quantity) || 0;
      const unitPrice = Number(this.expenseData.unitPrice) || 0;
      this.expenseData.amount = quantity * unitPrice;
    }
    // For location method, amount is already set from lookup table
  }

  isFormValid(): boolean {
    const basicValidation = !!(
      this.expenseData.type &&
      this.expenseData.date &&
      this.expenseData.description &&
      this.expenseData.unit &&
      this.expenseData.competition &&
      this.expenseData.amount > 0
    );

    if (this.inputMethod === 'manual') {
      return basicValidation && 
             this.expenseData.quantity > 0 && 
             this.expenseData.unitPrice > 0;
    } else {
      return basicValidation && 
             !!this.startLocation && 
             !!this.endLocation;
    }
  }

  onSave() {
    if (!this.isFormValid()) {
      this.errorMessage = 'Molimo popunite sva obavezna polja.';
      return;
    }

    this.isLoading = true;
    this.clearError();
    
    // Emit the expense data to parent component
    this.save.emit({ ...this.expenseData });
    this.resetForm();
    this.isLoading = false;
  }

  onClose() {
    this.resetForm();
    this.clearError();
    this.close.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget && !this.isLoading) {
      this.onClose();
    }
  }

  private resetForm() {
    this.expenseData = {
      _id: '',
      type: 'Prijevoz automobilom',
      date: '',
      description: '',
      unit: 'km',
      amount: 0,
      quantity: 0,
      unitPrice: 0,
      competition: ''
    };
    this.startLocation = '';
    this.endLocation = '';
    this.inputMethod = 'location';
  }

  private clearError() {
    this.errorMessage = '';
  }

  getTodayDate(): string {
    const today = new Date();
    return today.toISOString().split('T')[0];
  }
}