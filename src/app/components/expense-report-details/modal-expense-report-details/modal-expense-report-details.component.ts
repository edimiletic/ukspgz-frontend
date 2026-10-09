// src/app/components/expense-report-details/modal-expense-report-details/modal-expense-report-details.component.ts

import { Component, EventEmitter, Input, OnChanges, Output, SimpleChanges, inject } from '@angular/core';
import { CommonModule } from '@angular/common';

interface ExpenseItem {
  _id?: string;
  type: string;
  date: string;
  description: string;
  unit: string;
  amount: number;
  quantity: number;
  unitPrice: number;
  competition: string;
  gameId?: string;
  homeTeam?: string;
  awayTeam?: string;
}
import { FormsModule } from '@angular/forms';
import { BasketballGame } from '../../../model/basketballGame.model';
import { BasketballGameService } from '../../../services/basketballGame.service';
import { getTravelExpenseRate } from './travel-expense-rates';

@Component({
  selector: 'app-modal-expense-report-details',
  imports: [CommonModule, FormsModule],
  templateUrl: './modal-expense-report-details.component.html',
  styleUrl: './modal-expense-report-details.component.scss'
})
export class ModalExpenseReportDetailsComponent implements OnChanges {
  @Input() isOpen = false;
  @Input() isSaving = false;
  @Input() reportMonth = '';
  @Input() reportYear: number | string | null = null;
  @Output() close = new EventEmitter<void>();
  @Output() save = new EventEmitter<ExpenseItem>();

  private basketballGameService = inject(BasketballGameService);

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
    competition: '',
    gameId: '',
    homeTeam: '',
    awayTeam: ''
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

  expenseTypes = [
    'Prijevoz automobilom',
    'Putnička karta'
  ];

  units = ['km', 'tk'];

  availableGames: BasketballGame[] = [];
  selectedGameId = '';
  isLoadingGames = false;

  private readonly monthNames = [
    'Siječanj', 'Veljača', 'Ožujak', 'Travanj', 'Svibanj', 'Lipanj',
    'Srpanj', 'Kolovoz', 'Rujan', 'Listopad', 'Studeni', 'Prosinac'
  ];

  isLoading = false;
  errorMessage = '';

  get busy(): boolean {
    return this.isLoading || this.isSaving;
  }

  ngOnChanges(changes: SimpleChanges) {
    if (changes['isOpen']?.currentValue) {
      this.loadGames();
    }
    if (changes['isOpen'] && !this.isOpen) {
      this.resetForm();
      this.isLoading = false;
    }
    if (changes['isSaving'] && !this.isSaving) {
      this.isLoading = false;
    }
  }

  get selectedGame(): BasketballGame | undefined {
    return this.availableGames.find(game => game._id === this.selectedGameId);
  }

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

    this.expenseData.type = 'Prijevoz automobilom';
    this.expenseData.unit = 'km';
    this.expenseData.quantity = 0;
    this.expenseData.amount = 0;

    if (method === 'location') {
      this.startLocation = '';
      this.endLocation = '';
      this.expenseData.unitPrice = 0;
    } else {
      this.expenseData.unitPrice = 0.31;
    }
  }

  onGameChange() {
    const game = this.selectedGame;
    if (!game) {
      this.expenseData.date = '';
      this.expenseData.competition = '';
      this.expenseData.gameId = '';
      this.expenseData.homeTeam = '';
      this.expenseData.awayTeam = '';
      return;
    }

    this.expenseData.date = this.toDateValue(game.date);
    this.expenseData.competition = game.competition;
    this.expenseData.gameId = game._id;
    this.expenseData.homeTeam = game.homeTeam;
    this.expenseData.awayTeam = game.awayTeam;
    this.clearError();
  }

  formatGameOption(game: BasketballGame): string {
    return `${this.formatDisplayDate(game.date)} • ${game.homeTeam} - ${game.awayTeam} • ${game.competition}`;
  }

  formatDisplayDate(dateValue: string): string {
    const value = this.toDateValue(dateValue);
    if (!value) return '';
    const [year, month, day] = value.split('-');
    return `${day}.${month}.${year}.`;
  }

  private loadGames() {
    this.isLoadingGames = true;
    this.basketballGameService.getMyAssignments().subscribe({
      next: (games) => {
        this.availableGames = games
          .filter(game => game.status !== 'Cancelled' && this.gameMatchesReport(game))
          .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        this.isLoadingGames = false;
      },
      error: (error) => {
        console.error('Error loading assigned games:', error);
        this.errorMessage = 'Greška pri učitavanju utakmica.';
        this.availableGames = [];
        this.isLoadingGames = false;
      }
    });
  }

  private gameMatchesReport(game: BasketballGame): boolean {
    const dateValue = this.toDateValue(game.date);
    if (!dateValue) return false;

    const [year, month] = dateValue.split('-').map(Number);
    if (this.reportYear && year !== Number(this.reportYear)) {
      return false;
    }
    if (this.reportMonth) {
      return this.monthNames[month - 1] === this.reportMonth;
    }
    return true;
  }

  private toDateValue(dateValue: string): string {
    if (!dateValue) return '';
    if (dateValue.includes('T')) {
      return dateValue.split('T')[0];
    }
    const parsed = new Date(dateValue);
    if (Number.isNaN(parsed.getTime())) return '';
    const year = parsed.getFullYear();
    const month = String(parsed.getMonth() + 1).padStart(2, '0');
    const day = String(parsed.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
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
  const expense = getTravelExpenseRate(this.startLocation, this.endLocation);

  if (expense != null) {
    this.expenseData.amount = expense;
    this.expenseData.quantity = 0;
    this.expenseData.unitPrice = 0;
    this.expenseData.description = `${this.startLocation} - ${this.endLocation} (povratno)`;
      } else {
    this.errorMessage = 'Nema podataka o trošku između odabranih lokacija.';
    this.expenseData.amount = 0;
  }
}

  onExpenseTypeChange() {
    if (this.expenseData.type === 'Prijevoz automobilom') {
      this.expenseData.unit = 'km';
      this.expenseData.unitPrice = 0.31;
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
      this.selectedGameId &&
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
    if (this.busy) {
      return;
    }
    if (!this.isFormValid()) {
      this.errorMessage = 'Molimo popunite sva obavezna polja.';
      return;
    }

    this.isLoading = true;
    this.clearError();
    this.save.emit({ ...this.expenseData });
  }

  onClose() {
    if (this.busy) {
      return;
    }
    this.resetForm();
    this.clearError();
    this.close.emit();
  }

  onBackdropClick(event: Event) {
    if (event.target === event.currentTarget && !this.busy) {
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
      competition: '',
      gameId: '',
      homeTeam: '',
      awayTeam: ''
    };
    this.startLocation = '';
    this.endLocation = '';
    this.selectedGameId = '';
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