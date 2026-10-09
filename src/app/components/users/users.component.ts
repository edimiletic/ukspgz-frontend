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
import { FormsModule } from '@angular/forms';
import { USER_ROLES, formatRoleLabel, getRoleNames } from '../../model/roles';
import { User } from '../../model/user.model';
import { AuthService } from '../../services/login.service';
import { UserService } from '../../services/user.service';
import {
  ConfirmationData,
  ConfirmationModalComponent
} from '../shared/confirmation-modal/confirmation-modal.component';
import { UserFormModalComponent, UserFormSave } from './user-form-modal/user-form-modal.component';
import { apiErrorMessage, leagueColumnParts, userMatchesFilters } from './users.helpers';

@Component({
  selector: 'app-users',
  imports: [CommonModule, FormsModule, UserFormModalComponent, ConfirmationModalComponent],
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
  search = '';
  roleFilter = '';
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
  confirmationData: ConfirmationData = {
    title: 'Obriši korisnika',
    message: 'Jeste li sigurni?',
    confirmText: 'Obriši',
    cancelText: 'Odustani'
  };

  private toastTimer: ReturnType<typeof setTimeout> | null = null;

  constructor() {
    this.destroyRef.onDestroy(() => this.clearToast());
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
      next: () => {
        this.isFormBusy = false;
        this.isFormOpen = false;
        this.editingUser = null;
        this.showSuccess(isUpdate ? 'Korisnik je ažuriran.' : 'Korisnik je kreiran.');
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
          this.isDeleteOpen = false;
          this.showError(apiErrorMessage(error, 'Brisanje nije uspjelo.'));
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
