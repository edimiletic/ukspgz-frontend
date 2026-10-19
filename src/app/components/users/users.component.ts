import { CommonModule } from '@angular/common';
import { HttpErrorResponse } from '@angular/common/http';
import {
  ChangeDetectionStrategy,
  ChangeDetectorRef,
  Component,
  DestroyRef,
  OnInit,
  inject
} from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { USER_ROLES, formatRoleLabel, getRoleNames } from '../../model/roles';
import { User } from '../../model/user.model';
import { AuthService } from '../../services/login.service';
import { UserService } from '../../services/user.service';
import {
  ConfirmationData,
  ConfirmationModalComponent
} from '../shared/confirmation-modal/confirmation-modal.component';
import { UserFormModalComponent, UserFormSave } from './user-form-modal/user-form-modal.component';
import { ModalPanelDirective } from '../../directives/modal-panel.directive';
import { apiErrorMessage, leagueColumnParts, userMatchesFilters } from './users.helpers';

@Component({
  selector: 'app-users',
  imports: [CommonModule, ReactiveFormsModule, UserFormModalComponent, ConfirmationModalComponent, ModalPanelDirective],
  templateUrl: './users.component.html',
  styleUrl: './users.component.scss',
  changeDetection: ChangeDetectionStrategy.OnPush
})
export class UsersComponent implements OnInit {
  private readonly destroyRef = inject(DestroyRef);
  private readonly cdr = inject(ChangeDetectorRef);
  private readonly userService = inject(UserService);
  private readonly authService = inject(AuthService);

  readonly roleOptions = USER_ROLES;
  readonly itemsPerPage = 10;

  users: User[] = [];
  readonly filterForm = inject(FormBuilder).nonNullable.group({
    search: [''],
    roleFilter: ['']
  });

  get search(): string {
    return this.filterForm.controls.search.value;
  }
  get roleFilter(): string {
    return this.filterForm.controls.roleFilter.value;
  }
  page = 1;
  isLoading = false;
  errorMessage = '';
  successMessage = '';
  formError = '';
  isFormOpen = false;
  isFormBusy = false;
  editingUser: User | null = null;
  isDeleteOpen = false;
  isDeleteBusy = false;
  userToDelete: User | null = null;
  inviteUrl = '';
  inviteCopied = false;
  confirmationData: ConfirmationData = {
    title: 'Obriši korisnika',
    message: 'Jeste li sigurni?',
    confirmText: 'Obriši',
    cancelText: 'Odustani'
  };

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearToast());
    this.filterForm.valueChanges.pipe(takeUntilDestroyed(this.destroyRef)).subscribe(() => {
      this.onFilterChange();
      this.cdr.markForCheck();
    });
  }

  ngOnInit(): void {
    this.loadUsers();
  }

  get currentUserId(): string {
    return this.authService.getCurrentUserId();
  }

  get filteredUsers(): User[] {
    return this.users.filter((user) => userMatchesFilters(user, this.search, this.roleFilter));
  }

  get totalPages(): number {
    return Math.max(1, Math.ceil(this.filteredUsers.length / this.itemsPerPage));
  }

  get pagedUsers(): User[] {
    const start = (this.page - 1) * this.itemsPerPage;
    return this.filteredUsers.slice(start, start + this.itemsPerPage);
  }

  roleLabel(user: User): string {
    return formatRoleLabel(user);
  }

  leagueParts(user: User) {
    return leagueColumnParts(user);
  }

  canDelete(user: User): boolean {
    return user._id !== this.currentUserId;
  }

  onFilterChange(): void {
    this.page = 1;
  }

  goToPage(page: number): void {
    if (page >= 1 && page <= this.totalPages) {
      this.page = page;
    }
  }

  openCreate(): void {
    this.editingUser = null;
    this.formError = '';
    this.isFormOpen = true;
  }

  openEdit(user: User): void {
    this.editingUser = user;
    this.formError = '';
    this.isFormOpen = true;
  }

  closeForm(): void {
    if (this.isFormBusy) {
      return;
    }
    this.isFormOpen = false;
    this.editingUser = null;
    this.formError = '';
  }

  saveUser(payload: UserFormSave): void {
    this.isFormBusy = true;
    this.formError = '';
    const request = this.editingUser
      ? this.userService.updateUser(this.editingUser._id, payload)
      : this.userService.createUser(payload);

    const isUpdate = !!this.editingUser;
    request.pipe(takeUntilDestroyed(this.destroyRef)).subscribe({
      next: (created) => {
        this.isFormBusy = false;
        this.isFormOpen = false;
        this.editingUser = null;
        const inviteUrl = (created as User & { inviteUrl?: string }).inviteUrl;
        if (!isUpdate && inviteUrl) {
          this.openInvite(inviteUrl);
        }
        this.showSuccess(isUpdate ? 'Korisnik je ažuriran.' : 'Korisnik je kreiran. Kopiraj link za lozinku.');
        this.loadUsers();
        this.cdr.markForCheck();
      },
      error: (error: HttpErrorResponse) => {
        this.isFormBusy = false;
        this.formError = apiErrorMessage(error, 'Spremanje nije uspjelo.');
        this.cdr.markForCheck();
      }
    });
  }

  issueResetLink(user: User): void {
    this.userService
      .createPasswordResetLink(user._id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (invite) => {
          this.openInvite(invite.inviteUrl);
          this.showSuccess('Novi link za lozinku je spreman. Kopiraj ga i pošalji korisniku.');
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.formError = apiErrorMessage(error, 'Link se nije mogao napraviti.');
          this.showError(this.formError);
          this.cdr.markForCheck();
        }
      });
  }

  closeInvite(): void {
    this.inviteUrl = '';
    this.inviteCopied = false;
  }

  copyInvite(): void {
    if (!this.inviteUrl) {
      return;
    }
    const done = () => {
      this.inviteCopied = true;
      this.cdr.markForCheck();
    };
    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(this.inviteUrl).then(done).catch(() => this.fallbackCopyInvite(done));
      return;
    }
    this.fallbackCopyInvite(done);
  }

  private openInvite(url: string): void {
    this.inviteUrl = url;
    this.inviteCopied = false;
  }

  private fallbackCopyInvite(done: () => void): void {
    const area = document.createElement('textarea');
    area.value = this.inviteUrl;
    document.body.appendChild(area);
    area.select();
    document.execCommand('copy');
    document.body.removeChild(area);
    done();
  }

  askDelete(user: User): void {
    if (!this.canDelete(user)) {
      return;
    }
    this.userToDelete = user;
    this.confirmationData = {
      title: 'Obriši korisnika',
      message: `Želite li obrisati ${user.name} ${user.surname}?`,
      details: [
        `Korisničko ime: ${user.username}`,
        `Uloge: ${getRoleNames(user).join(', ') || '—'}`
      ],
      confirmText: 'Obriši',
      cancelText: 'Odustani',
      confirmButtonClass: 'btn-danger',
      data: user._id
    };
    this.isDeleteOpen = true;
    this.cdr.markForCheck();
  }

  closeDelete(): void {
    if (this.isDeleteBusy) {
      return;
    }
    this.isDeleteOpen = false;
    this.userToDelete = null;
  }

  confirmDelete(): void {
    const id = this.userToDelete?._id;
    if (!id) {
      return;
    }
    this.isDeleteBusy = true;
    this.userService
      .deleteUser(id)
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: () => {
          this.isDeleteBusy = false;
          this.isDeleteOpen = false;
          this.userToDelete = null;
          this.showSuccess('Korisnik je obrisan.');
          this.loadUsers();
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.isDeleteBusy = false;
          const message = apiErrorMessage(error, 'Brisanje nije uspjelo.');
          this.confirmationData = { ...this.confirmationData, message };
          this.showError(message);
          this.cdr.markForCheck();
        }
      });
  }

  private loadUsers(): void {
    this.isLoading = true;
    this.errorMessage = '';
    this.userService
      .getAllUsers()
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe({
        next: (users) => {
          this.users = users || [];
          this.isLoading = false;
          if (this.page > this.totalPages) {
            this.page = this.totalPages;
          }
          this.cdr.markForCheck();
        },
        error: (error: HttpErrorResponse) => {
          this.isLoading = false;
          this.errorMessage = apiErrorMessage(error, 'Korisnici se nisu mogli učitati.');
          this.cdr.markForCheck();
        }
      });
  }

  private showSuccess(message: string): void {
    this.successMessage = message;
    this.errorMessage = '';
    this.scheduleToastClear();
  }

  private showError(message: string): void {
    this.errorMessage = message;
    this.successMessage = '';
    this.scheduleToastClear();
  }

  private scheduleToastClear(): void {
    this.clearToast();
    this.toastTimer = setTimeout(() => {
      this.successMessage = '';
      this.errorMessage = '';
      this.cdr.markForCheck();
    }, 4000);
  }

  private clearToast(): void {
    if (this.toastTimer) {
      clearTimeout(this.toastTimer);
      this.toastTimer = null;
    }
  }
}
