import { ChangeDetectionStrategy, ChangeDetectorRef, Component, OnInit } from '@angular/core';
import {
  TravelExpense,
  travelExpenseGame,
  travelExpenseGameLabel,
  travelExpenseId,
  travelExpensePersonName
} from '../../model/travel-expense.model';
import { ActivatedRoute, Router, RouterModule } from '@angular/router';
import { TravelExpenseService } from '../../services/travel-expense.service';
import { AuthService } from '../../services/login.service';
import { CommonModule, isPlatformBrowser } from '@angular/common';
import { PLATFORM_ID, inject } from '@angular/core';
import { ConfirmationData, ConfirmationModalComponent } from '../shared/confirmation-modal/confirmation-modal.component';
import { ReasonModalComponent } from '../shared/reason-modal/reason-modal.component';
import { isAdminUser, userHasRole } from '../../model/roles';

@Component({
  selector: 'app-expense-report-details',
  imports: [RouterModule, CommonModule, ConfirmationModalComponent, ReasonModalComponent],
  templateUrl: './expense-report-details.component.html',
  styleUrl: './expense-report-details.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class ExpenseReportDetailsComponent implements OnInit {
  report: TravelExpense | null = null;
  isLoading = true;
  errorMessage = '';
  successMessage = '';
  isConfirmOpen = false;
  isConfirmBusy = false;
  confirmationData: ConfirmationData = {
    title: 'Potvrda',
    message: 'Jeste li sigurni?'
  };
  isRejectModalOpen = false;

  private platformId = inject(PLATFORM_ID);

  isAdmin = false;
  canReviewExpenses = false;
  currentUser: any = null;
  isOwner = false;
  isReviewing = false;

  constructor(
    private route: ActivatedRoute,
    private router: Router,
    private travelExpenseService: TravelExpenseService,
    private authService: AuthService,
    private cdr: ChangeDetectorRef
  ) {}

  private refreshView(): void {
    this.cdr.markForCheck();
  }

  ngOnInit() {
    if (isPlatformBrowser(this.platformId)) {
      this.loadCurrentUser();
    }
  }

  private loadCurrentUser() {
    this.authService.getCurrentUser().subscribe({
      next: (user) => {
        if (!user) {
          return;
        }
        this.currentUser = user;
        this.isAdmin = isAdminUser(user);
        this.canReviewExpenses = this.isAdmin || userHasRole(user, 'Povjerenik natjecanja');
        this.refreshView();
        this.route.params.subscribe(params => {
          const reportId = params['id'];
          if (reportId) {
            this.loadReport(reportId);
          }
        });
      },
      error: (error) => {
        console.error('Error loading user:', error);
        this.router.navigate(['/login']);
      }
    });
  }

  private loadReport(reportId: string) {
    this.isLoading = true;
    this.travelExpenseService.getTravelExpenseById(reportId).subscribe({
      next: (report) => {
        this.report = report;
        this.isLoading = false;
        this.isOwner = this.resolveIsOwner(report);
        this.refreshView();
      },
      error: (error) => {
        console.error('Error loading report:', error);
        this.showError('Greška pri učitavanju putnog naloga.');
        this.isLoading = false;
        this.refreshView();
      }
    });
  }

  shouldShowDeleteButton(): boolean {
    if (!this.report) {
      return false;
    }
    if (this.isAdmin) {
      return true;
    }
    return this.isOwner && this.report.state === 'Odbijeno';
  }

  shouldShowAdminReview(): boolean {
    if (this.report?.state !== 'Predano') {
      return false;
    }
    if (this.isOwner) {
      return false;
    }
    return this.isAdmin || this.canReviewExpenses;
  }

  private resolveIsOwner(report: TravelExpense): boolean {
    const currentId = this.extractId(this.currentUser) || this.authService.getCurrentUserId();
    const reportUserId = this.extractId(report.userId);
    return !!currentId && !!reportUserId && currentId === reportUserId;
  }

  private extractId(value: any): string {
    if (!value) {
      return '';
    }
    if (typeof value === 'string' || typeof value === 'number') {
      return String(value);
    }
    const nested = value._id || value.id;
    if (!nested) {
      return '';
    }
    return typeof nested === 'object' ? String(nested._id || nested.id || nested) : String(nested);
  }

  getReportId(): string {
    return travelExpenseId(this.report);
  }

  closeConfirmModal() {
    this.isConfirmOpen = false;
    this.isConfirmBusy = false;
  }

  onConfirm(payload: unknown) {
    if (payload === 'delete-report' && !this.isConfirmBusy) {
      this.confirmDeleteReport();
    }
  }

  private confirmDeleteReport() {
    if (!this.report) return;
    this.isConfirmBusy = true;
    this.travelExpenseService.deleteTravelExpense(this.getReportId()).subscribe({
      next: () => {
        this.closeConfirmModal();
        this.router.navigate(['/expenses'], {
          queryParams: { message: 'deleted' }
        });
      },
      error: (error) => {
        this.isConfirmBusy = false;
        this.showError(error.error?.error || 'Greška pri brisanju naloga.');
      }
    });
  }

  onDeleteReport() {
    if (!this.shouldShowDeleteButton()) return;
    this.confirmationData = {
      title: 'Potvrdi brisanje',
      message: 'Jeste li sigurni da želite obrisati ovaj putni nalog?',
      details: [this.gameLabel(), 'Ova akcija se ne može poništiti.'],
      confirmText: 'Obriši',
      loadingText: 'Brisanje...',
      data: 'delete-report'
    };
    this.isConfirmOpen = true;
  }

  goBack() {
    this.router.navigate(['/expenses']);
  }

  personName(): string {
    return travelExpensePersonName(this.report);
  }

  gameLabel(): string {
    return travelExpenseGameLabel(this.report);
  }

  venue(): string {
    return travelExpenseGame(this.report)?.venue || '—';
  }

  competition(): string {
    return travelExpenseGame(this.report)?.competition || '—';
  }

  getPageTitle(): string {
    if (!this.report) return 'Putni nalog';
    return `Putni nalog | ${this.personName()}`;
  }

  getFormattedDate(): string {
    if (!this.report?.createdAt) return 'Nepoznato';
    const date = new Date(this.report.createdAt);
    return `${date.toLocaleDateString('hr-HR')} ${date.toLocaleTimeString('hr-HR', {
      hour: '2-digit',
      minute: '2-digit'
    })}`;
  }

  getWarningMessage(): string {
    if (this.report?.state !== 'Odbijeno') {
      return '';
    }
    return this.isOwner
      ? 'Ovaj nalog je odbijen. Predajte ga ponovo s ispravcima (isti obrazac Novi putni nalog).'
      : 'Ovaj nalog je odbijen.';
  }

  showWarning(): boolean {
    return this.report?.state === 'Odbijeno';
  }

  downloadFile(kind: 'nalog' | 'fuel' | 'toll', fallbackName: string): void {
    const id = this.getReportId();
    if (!id) return;
    this.travelExpenseService.downloadFile(id, kind).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = fallbackName;
        link.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.showError('Preuzimanje datoteke nije uspjelo.')
    });
  }

  getConditionClass(): string {
    if (!this.report) return '';
    switch (this.report.state) {
      case 'Predano':
        return 'condition-submitted';
      case 'Potvrđeno':
        return 'condition-approved';
      case 'Odbijeno':
        return 'condition-rejected';
      default:
        return '';
    }
  }

  private showSuccess(message: string): void {
    this.clearMessages();
    this.successMessage = message;
    this.refreshView();
    setTimeout(() => {
      this.successMessage = '';
      this.refreshView();
    }, 5000);
  }

  private showError(message: string): void {
    this.clearMessages();
    this.errorMessage = message;
    this.refreshView();
    setTimeout(() => {
      this.errorMessage = '';
      this.refreshView();
    }, 7000);
  }

  clearMessages(): void {
    this.successMessage = '';
    this.errorMessage = '';
    this.refreshView();
  }

  reviewReport(action: 'approve' | 'reject', notes = ''): void {
    if (!this.report || this.isReviewing) {
      return;
    }

    this.isReviewing = true;
    this.travelExpenseService.reviewTravelExpense(
      this.getReportId(),
      action,
      notes.trim()
    ).subscribe({
      next: (updatedReport) => {
        this.report = updatedReport;
        this.isReviewing = false;
        this.closeRejectModal();
        this.showSuccess(action === 'approve'
          ? 'Nalog je odobren.'
          : 'Nalog je vraćen korisniku na ispravak.');
      },
      error: (error) => {
        this.isReviewing = false;
        this.showError(error.error?.error || 'Greška pri pregledu naloga.');
      }
    });
  }

  openRejectModal(): void {
    this.isRejectModalOpen = true;
  }

  closeRejectModal(): void {
    if (!this.isReviewing) {
      this.isRejectModalOpen = false;
    }
  }

  onRejectConfirmed(notes: string): void {
    this.reviewReport('reject', notes);
  }
}
