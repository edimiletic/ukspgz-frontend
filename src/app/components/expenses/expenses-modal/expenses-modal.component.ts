import { CommonModule } from '@angular/common';
import { ChangeDetectionStrategy, ChangeDetectorRef, Component, EventEmitter, Input, OnChanges, Output, SimpleChanges } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { EligibleTravelGame, TravelExpense, travelExpenseId } from '../../../model/travel-expense.model';
import { TravelExpenseService } from '../../../services/travel-expense.service';

const NALOG_EXTS = ['.xls', '.xlsx', '.pdf'];
const PDF_EXTS = ['.pdf'];

@Component({
  selector: 'app-expenses-modal',
  imports: [CommonModule, FormsModule],
  templateUrl: './expenses-modal.component.html',
  styleUrl: './expenses-modal.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpensesModalComponent implements OnChanges {
  @Input() isOpen = false;
  @Output() close = new EventEmitter<void>();
  @Output() success = new EventEmitter<{ reportId: string }>();

  eligibleGames: EligibleTravelGame[] = [];
  gameId = '';
  usedHighway = false;
  nalogFile: File | null = null;
  fuelFile: File | null = null;
  tollFile: File | null = null;
  isLoading = false;
  isLoadingGames = false;
  errorMessage = '';

  constructor(
    private travelExpenseService: TravelExpenseService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['isOpen'] && this.isOpen) {
      this.resetForm();
      this.loadEligibleGames();
    }
  }

  downloadTemplate(): void {
    this.travelExpenseService.downloadTemplate().subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = 'Putni nalog HKS.xls';
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => {
        this.errorMessage = 'Preuzimanje predloška nije uspjelo.';
        this.cdr.markForCheck();
      }
    });
  }

  onNalogSelected(event: Event): void {
    this.nalogFile = this.pickAllowedFile(
      event,
      NALOG_EXTS,
      'Putni nalog mora biti .xls, .xlsx ili PDF.'
    );
  }

  onFuelSelected(event: Event): void {
    this.fuelFile = this.pickAllowedFile(event, PDF_EXTS, 'Račun goriva mora biti PDF.');
  }

  onTollSelected(event: Event): void {
    this.tollFile = this.pickAllowedFile(event, PDF_EXTS, 'Račun cestarine mora biti PDF.');
  }

  onHighwayChange(used: boolean): void {
    if (!used) {
      this.tollFile = null;
      this.cdr.markForCheck();
    }
  }

  fileBadge(file: File): string {
    const ext = this.extensionOf(file);
    if (ext === '.xlsx') return 'XLSX';
    if (ext === '.xls') return 'XLS';
    if (ext === '.pdf') return 'PDF';
    return ext.replace('.', '').toUpperCase() || 'FILE';
  }

  clearFile(kind: 'nalog' | 'fuel' | 'toll', input: HTMLInputElement, event: Event): void {
    event.preventDefault();
    event.stopPropagation();
    input.value = '';
    if (kind === 'nalog') this.nalogFile = null;
    if (kind === 'fuel') this.fuelFile = null;
    if (kind === 'toll') this.tollFile = null;
    this.cdr.markForCheck();
  }

  onBackdropClick(event: Event): void {
    if (event.target === event.currentTarget && !this.isLoading) {
      this.onClose();
    }
  }

  onClose(): void {
    if (!this.isLoading) {
      this.close.emit();
    }
  }

  submit(): void {
    this.errorMessage = '';
    if (!this.gameId) {
      this.errorMessage = 'Odaberite utakmicu.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.nalogFile || !this.fuelFile) {
      this.errorMessage = 'Priložite putni nalog i PDF računa goriva.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.hasAllowedExtension(this.nalogFile, NALOG_EXTS)) {
      this.errorMessage = 'Putni nalog mora biti .xls, .xlsx ili PDF.';
      this.cdr.markForCheck();
      return;
    }
    if (!this.hasAllowedExtension(this.fuelFile, PDF_EXTS)) {
      this.errorMessage = 'Račun goriva mora biti PDF.';
      this.cdr.markForCheck();
      return;
    }
    if (this.usedHighway && !this.tollFile) {
      this.errorMessage = 'Za autocestu priložite PDF računa cestarine.';
      this.cdr.markForCheck();
      return;
    }
    if (this.usedHighway && this.tollFile && !this.hasAllowedExtension(this.tollFile, PDF_EXTS)) {
      this.errorMessage = 'Račun cestarine mora biti PDF.';
      this.cdr.markForCheck();
      return;
    }

    const formData = new FormData();
    formData.append('gameId', this.gameId);
    formData.append('usedHighway', String(this.usedHighway));
    formData.append('nalog', this.nalogFile);
    formData.append('fuelReceipt', this.fuelFile);
    if (this.usedHighway && this.tollFile) {
      formData.append('tollReceipt', this.tollFile);
    }

    this.isLoading = true;
    this.travelExpenseService.submitTravelOrder(formData).subscribe({
      next: (created: TravelExpense) => {
        this.isLoading = false;
        this.success.emit({ reportId: travelExpenseId(created) });
      },
      error: (error) => {
        this.isLoading = false;
        this.errorMessage = error?.error?.error || 'Predaja putnog naloga nije uspjela.';
        this.cdr.markForCheck();
      }
    });
  }

  gameLabel(game: EligibleTravelGame): string {
    const date = game.date ? new Date(game.date).toLocaleDateString('hr-HR') : '';
    return `${date} ${game.time} — ${game.homeTeam} vs ${game.awayTeam} (${game.assignmentRole})`;
  }

  private loadEligibleGames(): void {
    this.isLoadingGames = true;
    this.travelExpenseService.getEligibleGames().subscribe({
      next: (games) => {
        this.eligibleGames = games;
        this.isLoadingGames = false;
        this.cdr.markForCheck();
      },
      error: () => {
        this.eligibleGames = [];
        this.isLoadingGames = false;
        this.errorMessage = 'Nije moguće učitati utakmice za nalog.';
        this.cdr.markForCheck();
      }
    });
  }

  private resetForm(): void {
    this.gameId = '';
    this.usedHighway = false;
    this.nalogFile = null;
    this.fuelFile = null;
    this.tollFile = null;
    this.errorMessage = '';
    this.isLoading = false;
  }

  private pickAllowedFile(event: Event, allowed: string[], invalidMessage: string): File | null {
    const input = event.target as HTMLInputElement | null;
    const file = input?.files?.[0] || null;
    if (!file) return null;
    if (!this.hasAllowedExtension(file, allowed)) {
      this.errorMessage = invalidMessage;
      if (input) input.value = '';
      this.cdr.markForCheck();
      return null;
    }
    this.errorMessage = '';
    this.cdr.markForCheck();
    return file;
  }

  private hasAllowedExtension(file: File, allowed: string[]): boolean {
    return allowed.includes(this.extensionOf(file));
  }

  private extensionOf(file: File): string {
    const name = file.name || '';
    const dot = name.lastIndexOf('.');
    return dot >= 0 ? name.slice(dot).toLowerCase() : '';
  }
}
